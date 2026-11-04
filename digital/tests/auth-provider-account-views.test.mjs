import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderSecurityView,passwordFormAvailable} from '../dist/security-view.mjs';
import {renderProfileView} from '../dist/profile-view.mjs';
import {translate} from '../dist/i18n.mjs';

const profile={id:'account-a',username:'pelajar_ujian',display_name:'Pelajar Ujian',role:'student',email:null,email_verified:false};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const helpers=language=>({
  profile,classes:[],signedIn:true,esc,t:key=>translate(language,key)||key,
  accountHeading:(_kicker,title,detail)=>`<header><h1>${title}</h1><p>${detail}</p></header>`,
  avatarArt:()=>'',icon:()=>'',formError:()=>'<p data-form-error></p>',submit:label=>`<button type="submit">${label}</button>`,
  button:(label,action)=>`<button data-portal-action="${action}">${label}</button>`,
  field:(_id,label,options)=>`<label>${label}<input name="${options.name}" type="${options.type||'text'}"></label>`
});
function view(render,options={},language='ms') {
  const dom=new JSDOM(render({...helpers(language),...options}));
  return {document:dom.window.document,close:()=>dom.window.close()};
}
const user=(providers,extra={})=>({id:profile.id,app_metadata:{providers,provider:providers[0]},identities:providers.map(provider=>({provider})),...extra});

test('Google and phone identities hide password entry while retaining session controls',()=>{
  for(const authUser of [user(['google'],{email:'person@example.test'}),user(['phone'],{phone:'60123456789'}),user(['phone','google'],{email:'person@example.test',phone:'60123456789'})]){
    const rendered=view(renderSecurityView,{authUser,confirming:true,sessionsHTML:'<section id="active-sessions">Sessions</section>'});
    try{
      assert.equal(passwordFormAvailable(authUser),false);
      assert.equal(rendered.document.querySelector('[data-portal-form="change-password"]'),null);
      assert.equal(rendered.document.querySelector('input[type="password"]'),null);
      assert.equal(rendered.document.querySelector('[data-portal-action="security-recover"]'),null);
      assert.ok(rendered.document.querySelector('[data-portal-action="logout-all"]'));
      assert.ok(rendered.document.getElementById('active-sessions'));
      assert.match(rendered.document.body.textContent,/kaedah log masuk akaun anda/);
    }finally{rendered.close();}
  }
});

test('email and existing legacy accounts retain password reauthentication',()=>{
  for(const authUser of [undefined,{id:profile.id},{id:profile.id,email:'existing@example.test'},user(['email'],{email:'existing@accounts.geodecoder.invalid'}),user(['google','email'],{email:'linked@example.test'})]){
    const rendered=view(renderSecurityView,{authUser});
    try{
      assert.equal(passwordFormAvailable(authUser),true);
      assert.ok(rendered.document.querySelector('[data-portal-form="change-password"]'));
      assert.ok(rendered.document.querySelector('[name="current_password"]'));
    }finally{rendered.close();}
  }
});

test('editable metadata cannot enable the password form or invent phone verification',()=>{
  const authUser=user(['phone'],{phone:'60123456789',user_metadata:{email:'invented@example.test',phone_confirmed_at:'2026-11-04T00:00:00Z',providers:['email']}});
  assert.equal(passwordFormAvailable(authUser),false);
  const rendered=view(renderProfileView,{authUser});
  try{
    assert.match(rendered.document.body.textContent,/Belum disahkan/);
    assert.ok(!rendered.document.body.textContent.includes('invented@example.test'));
    assert.ok(!rendered.document.body.textContent.includes('akaun lama'));
  }finally{rendered.close();}
});

test('phone-only profiles show the Auth number and confirmation without claiming a legacy account',()=>{
  const authUser=user(['phone'],{phone:'60123456789',phone_confirmed_at:'2026-11-04T00:00:00Z'});
  const rendered=view(renderProfileView,{authUser});
  try{
    const text=rendered.document.body.textContent;
    assert.match(text,/\+60123456789/);
    assert.match(text,/Status pengesahan telefon/);
    assert.match(text,/Disahkan/);
    assert.match(text,/Tiada e-mel berdaftar\./);
    assert.match(text,/menerima kod SMS/);
    assert.ok(!text.includes('akaun lama'));
  }finally{rendered.close();}
});

test('profile contact values are escaped and cannot cross account ownership',()=>{
  const injected='\"><img src=x onerror=alert(1)>';
  const own=view(renderProfileView,{authUser:user(['phone'],{phone:injected,email:injected})});
  try{assert.equal(own.document.querySelector('img'),null);assert.match(own.document.body.textContent,/<img/);}finally{own.close();}
  const other=view(renderProfileView,{authUser:user(['phone'],{id:'account-b',phone:'60199999999',email:'other@example.test'})});
  try{assert.ok(!other.document.body.textContent.includes('60199999999'));assert.ok(!other.document.body.textContent.includes('other@example.test'));}finally{other.close();}
});

test('provider guidance and phone contact labels translate into English',()=>{
  const authUser=user(['phone'],{phone:'60123456789',phone_confirmed_at:'2026-11-04T00:00:00Z'});
  const security=view(renderSecurityView,{authUser},'en');
  const account=view(renderProfileView,{authUser},'en');
  try{
    assert.match(security.document.body.textContent,/one-time SMS code/);
    assert.match(account.document.body.textContent,/Phone number/);
    assert.match(account.document.body.textContent,/Phone verification/);
    assert.match(account.document.body.textContent,/No registered email\./);
    assert.ok(!account.document.body.textContent.includes('Status pengesahan telefon'));
  }finally{security.close();account.close();}
});
