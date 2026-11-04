import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderAuthLayout} from '../dist/auth-view.mjs';
import {renderProfileView} from '../dist/profile-view.mjs';
import {renderSecurityView} from '../dist/security-view.mjs';
import {renderActiveSessions} from '../dist/active-sessions.mjs';
import {translate} from '../dist/i18n.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const t = key => translate('en', key) || key;
const doc = html => new JSDOM(html).window.document;
const button = (label, action, options = {}) => `<button type="button" data-portal-action="${action}"${options.id ? ` data-id="${esc(options.id)}"` : ''}>${label}</button>`;
const field = (id, label, options) => `<div class="portal-field"><label for="${id}">${label}</label><input id="${id}" name="${options.name}" type="${options.type || 'text'}" value="${esc(options.value)}"${options.min ? ` minlength="${options.min}"` : ''}${options.max ? ` maxlength="${options.max}"` : ''}><small>${options.help || ''}</small></div>`;
const submit = label => `<button type="submit">${label}</button>`;
const formError = () => '<p data-form-error role="alert"></p>';
const accountHeading = (_, title, description) => `<header><h1 id="portal-title">${title}</h1><p>${description}</p></header>`;
const avatarArt = (avatar, name = 'Learner') => `<span>${esc(avatar === 'initial' ? name[0] : avatar)}</span>`;
const icon = () => '<svg aria-hidden="true"></svg>';

test('recovery progress reflects only the verified host mode; request and sent states do not claim verification', () => {
  for (const mode of ['recover-email', 'email-sent', 'reset-password']) {
    const document = doc(renderAuthLayout({mode, t, details: ['', 'Recovery', 'Registered email only'], body: '<form data-existing-form="true"></form>'}));
    assert.equal(Boolean(document.querySelector('.portal-recovery-verified')), mode === 'reset-password');
    assert.equal(document.querySelectorAll('[aria-current="step"]').length, 1);
    assert.equal(document.querySelector('[aria-current="step"] b').textContent, mode === 'reset-password' ? 'New password' : 'Email link');
    assert.equal(document.querySelectorAll('form').length, 1, 'composition must not invent another Auth form');
    assert.equal(document.querySelectorAll('input').length, 0, 'field generation stays with the host');
    assert.equal(document.querySelector('.portal-auth-scene').getAttribute('aria-hidden'), 'true');
  }
});

test('auth composition preserves existing errors, cooldown controls and host forms verbatim', () => {
  const body = '<form data-portal-form="signup"><input type="radio" name="role" value="student" checked><input name="password" minlength="10" maxlength="128"></form><button data-email-cooldown disabled>Resend (60s)</button>';
  const html = renderAuthLayout({mode:'signup', t, body, details:['','Register',''], warnings:'<p role="alert">Link expired</p>', modes:'<button data-mode="login">Sign in</button>'});
  assert.ok(html.includes(body));
  const document = doc(html);
  assert.equal(document.querySelector('[role="alert"]').textContent, 'Link expired');
  assert.equal(document.querySelector('[name="password"]').maxLength, 128);
  assert.equal(document.querySelectorAll('[name="role"]').length, 1);
  assert.equal(document.querySelector('[data-email-cooldown]').disabled, true);
  assert.equal(document.querySelector('.portal-recovery-verified'), null);
});

test('profile keeps editable name/avatar separate from immutable escaped identity and the live preview', () => {
  const profile = {id:'qa-user',display_name:'<Name & text>',username:'user_name',role:'student',avatar:'initial',email:'qa@example.test',email_verified:false};
  const document = doc(renderProfileView({profile,classes:[{id:'qa-class',name:'<Class & text>',teacher_name:'<Teacher>'}],signedIn:true,confirming:true,accountHeading,avatarArt,button,field,formError,submit,esc,t}));
  const form = document.querySelector('[data-portal-form="profile"]');
  assert.deepEqual([...form.querySelectorAll('input')].map(node => node.name), ['avatar','avatar','avatar','avatar','avatar','avatar','display_name']);
  assert.equal(form.querySelector('[name="display_name"]').maxLength, 60);
  assert.equal(document.querySelector('[data-profile-preview-name]').textContent, '<Name & text>');
  assert.match(document.querySelector('.portal-profile-details').textContent, /Not verified/);
  assert.equal(document.querySelector('.portal-profile-details teacher'), null);
  assert.equal(document.querySelector('[data-portal-action="profile-class"]').dataset.id, 'qa-class');
  for (const action of ['profile-stay','profile-discard','profile-save-leave']) assert.ok(document.querySelector(`[data-portal-action="${action}"]`));
});

test('password card precedes the stable real-session region and retains policy and scope confirmations', () => {
  const sessionsHTML = '<section id="portal-active-sessions"><h2>Actual session list</h2></section>';
  const document = doc(renderSecurityView({profile:{username:'user_name'},confirming:true,sessionsHTML,accountHeading,button,field,formError,submit,icon,esc,t}));
  const form = document.querySelector('[data-portal-form="change-password"]');
  assert.equal(form.querySelector('[name="password"]').minLength, 10);
  assert.equal(form.querySelector('[name="password_confirm"]').maxLength, 128);
  assert.equal(document.querySelectorAll('#portal-active-sessions').length, 1);
  assert.ok(form.compareDocumentPosition(document.getElementById('portal-active-sessions')) & 4);
  assert.ok(document.querySelector('[data-portal-action="logout-all"]'));
  assert.ok(document.querySelector('[data-portal-action="security-recover"]'));
});

test('session presentation uses only server records, shows the current record first and never invents activity', () => {
  const state = {status:'ready', data:{sessions:[{is_current:false,status:'expired',started_at:null,user_agent:'<raw-agent> Mobile Safari'},{is_current:true,status:'recorded',started_at:'2026-11-04T09:00:00Z',user_agent:'Chrome/141.0 Windows'}],server_now:'2026-11-04T09:30:00Z',truncated:false}};
  const document = doc(renderActiveSessions({state,button,esc,t}));
  const rows = [...document.querySelectorAll('[data-session-row]')];
  assert.equal(rows.length, 2);
  assert.ok(rows[0].querySelector('[data-current-session]'));
  assert.equal(document.querySelectorAll('[data-current-session]').length, 1);
  assert.equal(rows[0].querySelector('time').dateTime, '2026-11-04T09:00:00Z');
  assert.match(rows[1].textContent, /Not recorded/);
  assert.doesNotMatch(document.body.textContent, /<raw-agent>|Last active.*2026|Online now/);
  assert.equal(document.querySelector('[data-portal-action="revoke-session"]'), null);
  const failed = doc(renderActiveSessions({state:{status:'error',error:'network'},button,esc,t}));
  assert.equal(failed.querySelectorAll('[data-session-row]').length, 0);
  assert.ok(failed.querySelector('[data-portal-action="refresh-sessions"]'));
});
