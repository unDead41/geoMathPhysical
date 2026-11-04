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

test('Google identities hide password entry while retaining session controls',()=>{
  for(const authUser of [user(['google'],{email:'person@example.test'})]){
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

test('profile contact values are escaped and cannot cross account ownership',()=>{
  const injected='\"><img src=x onerror=alert(1)>';
  const own=view(renderProfileView,{authUser:user(['google'],{phone:injected,email:injected})});
  try{assert.equal(own.document.querySelector('img'),null);assert.match(own.document.body.textContent,/<img/);}finally{own.close();}
  const other=view(renderProfileView,{authUser:user(['google'],{id:'account-b',phone:'60199999999',email:'other@example.test'})});
  try{assert.ok(!other.document.body.textContent.includes('60199999999'));assert.ok(!other.document.body.textContent.includes('other@example.test'));}finally{other.close();}
});

