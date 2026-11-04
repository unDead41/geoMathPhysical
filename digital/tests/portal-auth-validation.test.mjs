import {renderAuthLayout} from '../dist/auth-view.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from '../dist/i18n.mjs';
const pt=key=>translate('ms',key)||key;

// Exercise the portal's actual form validator without adding a browser/DOM
// dependency. The shim records only field errors, normalized values and focus.
const source = fs.readFileSync(new URL('../dist/portal.mjs', import.meta.url), 'utf8');
function functionSource(name, next) {
  const start = source.indexOf(`  ${name}`);
  const end = source.indexOf(`\n  ${next}`, start);
  assert.ok(start >= 0 && end > start, `Portal ${name} was not found`);
  return source.slice(start, end).trim();
}
const validate = vm.runInNewContext(`(${functionSource('function validate(form, values, type) {', 'async function handleAuth(')})`,{pt});
function formFor(values) {
  let focused = '';
  const fields = new Map(Object.entries(values).map(([name, value]) => [name, {
    value, invalid: false,
    setAttribute(key, value) { if (key === 'aria-invalid') this.invalid = value === 'true'; },
    focus() { focused = name; }
  }]));
  const errors = Object.keys(values).map(name => ({dataset: {errorFor: name}, textContent: ''}));
  const message = {textContent: ''};
  return {
    fields, errors, message,
    get focused() { return focused; },
    elements: {namedItem: name => fields.get(name)},
    querySelectorAll: selector => selector === '[data-error-for]' ? errors : [],
    querySelector: selector => selector === '[data-form-error]' ? message : [...fields.values()].find(field => field.invalid)
  };
}
const valid = () => ({username: ' Ijammahmad41 ', email: ' Ijamm+Kelas@Example.COM ', password: ' Test Pass#41 ', display_name: 'Nama Ujian', role: 'student', recovery_code: 'a'.repeat(32)});

test('security validates matching new passwords and current password without trimming secrets', () => {
  const values={current_password:' old ',password:' New Pass#41 ',password_confirm:' New Pass#41 '},form=formFor(values);
  assert.equal(validate(form,values,'change-password'),true);
  assert.equal(values.current_password,' old ');assert.equal(values.password,' New Pass#41 ');
  for(const invalid of [{...values,current_password:''},{...values,password:'short'},{...values,password_confirm:'different'}]){
    const bad=formFor(invalid);assert.equal(validate(bad,invalid,'change-password'),false);
    assert.ok(bad.focused);assert.ok([...bad.fields.values()].some(field=>field.invalid));
  }
});

test('signup requires an email and normalizes username/email without changing the password', () => {
  const values = valid(), form = formFor(values), password = values.password;
  assert.equal(validate(form, values, 'signup'), true);
  assert.equal(values.username, 'ijammahmad41');
  assert.equal(form.fields.get('username').value, 'ijammahmad41');
  assert.equal(values.email, 'ijamm+kelas@example.com');
  assert.equal(form.fields.get('email').value, 'ijamm+kelas@example.com');
  assert.equal(values.password, password, 'Passwords must not be trimmed or case-normalized');
});

test('signup and email link requests reject missing, malformed, and oversized email addresses', () => {
  for (const type of ['signup', 'recover-email', 'resend-confirmation']) {
    for (const email of ['', 'nama', 'nama@', 'nama@@contoh.com', 'nama contoh@contoh.com', 'nama@contoh', `${'a'.repeat(243)}@example.com`]) {
      const values = {...valid(), email}, form = formFor(values);
      assert.equal(validate(form, values, type), false, `${type}: ${email}`);
      assert.equal(form.fields.get('email').invalid, true);
      assert.match(form.errors.find(node => node.dataset.errorFor === 'email').textContent, /email.*254/);
    }
  }
});

test('recovery and confirmation email requests do not require username, password, or a recovery code', () => {
  for (const type of ['recover-email', 'resend-confirmation']) {
    const values = {email: ' Nama+Kelas@Contoh.COM '}, form = formFor(values);
    assert.equal(validate(form, values, type), true, type);
    assert.equal(values.email, 'nama+kelas@contoh.com');
  }
});

test('login accepts either an email or a username and retains support for existing short passwords', () => {
  for (const username of [' Ijammahmad41 ', ' Ijamm+Kelas@Example.COM ']) {
    const values = {username, password: 'old-pass'}, form = formFor(values);
    assert.equal(validate(form, values, 'login'), true, username);
    assert.equal(values.username, username.trim().toLowerCase());
    assert.equal(values.password, 'old-pass');
  }
  for (const username of ['ab', 'nama pelajar', 'nama@kelas', '<script>', `${'a'.repeat(243)}@example.com`]) {
    const values = {username, password: 'password'}, form = formFor(values);
    assert.equal(validate(form, values, 'login'), false, username);
    assert.equal(form.fields.get('username').invalid, true);
  }
});

test('legacy code recovery and class invitations keep the username-only rule', () => {
  for (const type of ['recover', 'invite']) {
    const values = valid(), form = formFor(values);
    assert.equal(validate(form, values, type), true, type);
    assert.equal(values.username, 'ijammahmad41', type);
    const emailValues = {...valid(), username: 'nama@contoh.com'}, emailForm = formFor(emailValues);
    assert.equal(validate(emailForm, emailValues, type), false, type);
    assert.equal(emailForm.fields.get('username').invalid, true, type);
  }
  const values = {...valid(), recovery_code: 'wrong-code'}, form = formFor(values);
  assert.equal(validate(form, values, 'recover'), false);
  assert.equal(form.fields.get('recovery_code').invalid, true);
});

test('a short signup password flags only the password after normalizing valid account fields', () => {
  const values = {...valid(), password: 'qa-short'}, form = formFor(values);
  assert.equal(validate(form, values, 'signup'), false);
  assert.equal(form.fields.get('username').invalid, false);
  assert.equal(form.fields.get('email').invalid, false);
  assert.equal(form.fields.get('password').invalid, true);
  assert.equal(form.focused, 'password');
  assert.match(form.errors.find(node => node.dataset.errorFor === 'password').textContent, /10.*128/);
});

test('signup username normalization rejects invalid characters and lengths', () => {
  for (const username of ['ab', 'a'.repeat(25), 'nama pelajar', 'nama@kelas', '<script>']) {
    const values = {...valid(), username}, form = formFor(values);
    assert.equal(validate(form, values, 'signup'), false);
    assert.equal(form.fields.get('username').invalid, true);
  }
});

test('reset accepts matching new passwords at both length boundaries without trimming', () => {
  for (const password of [' Pass#123 ', 'x'.repeat(128)]) {
    const values = {password, password_confirm: password}, form = formFor(values);
    assert.equal(validate(form, values, 'reset-password'), true);
    assert.equal(values.password, password);
    assert.equal(values.password_confirm, password);
  }
});

test('reset rejects mismatched or out-of-range confirmation and focuses the marked field', () => {
  const values = {password: 'Pass Baharu#41', password_confirm: 'Pass Lain#41'}, form = formFor(values);
  assert.equal(validate(form, values, 'reset-password'), false);
  assert.equal(form.fields.get('password').invalid, false);
  assert.equal(form.fields.get('password_confirm').invalid, true);
  assert.equal(form.focused, 'password_confirm');
  assert.match(form.message.textContent, /Semak/);
  assert.match(form.errors.find(node => node.dataset.errorFor === 'password_confirm').textContent, /sama/);
  for (const password of ['x'.repeat(9), 'x'.repeat(129)]) {
    const invalid = {password, password_confirm: password}, invalidForm = formFor(invalid);
    assert.equal(validate(invalidForm, invalid, 'reset-password'), false);
    assert.equal(invalidForm.fields.get('password').invalid, true);
    assert.equal(invalidForm.fields.get('password_confirm').invalid, true);
  }
});

test('actual auth rendering exposes email forms and derives reset exclusively from a verified recovery session', () => {
  const context = vm.createContext({renderAuthLayout,pt,
    cloud: {ready: true, recoveryRequired: false}, authMode: 'signup', authEmail: 'nama@contoh.com',
    document: {title: ''}, callbackError: () => '', emailCooldownSeconds: () => 60,
    geometryKit: () => '', icon: () => '', esc: value => String(value).replace(/[&<>"']/g, '')
  });
  vm.runInContext(`${functionSource('function button(', 'function badge(')}\n${functionSource('function renderAuth()', 'function renderRecovery(')}`, context);
  let html = vm.runInContext('renderAuth()', context);
  assert.match(html, /name="email" type="email" autocomplete="email"[^>]*maxlength="254"[^>]*required/);
  assert.doesNotMatch(html, /name="recovery_code"/);
  context.authMode = 'login';
  html = vm.runInContext('renderAuth()', context);
  assert.match(html, /Email atau nama pengguna/);
  assert.match(html, /name="username"[^>]*maxlength="254"/);
  context.authMode = 'recover-email';
  html = vm.runInContext('renderAuth()', context);
  assert.match(html, /data-portal-form="recover-email"/);
  assert.match(html, /Akaun lama tanpa email/);
  assert.doesNotMatch(html, /name="(?:username|password|recovery_code)"/);
  context.callbackError = () => 'Pautan sudah tamat. Minta pautan baharu.';
  html = vm.runInContext('renderAuth()', context);
  assert.match(html, /role="alert"/);
  assert.match(html, /Pautan sudah tamat/);
  assert.match(html, /data-portal-form="recover-email"/);
  context.callbackError = () => '';
  context.authMode = 'confirmation';
  html = vm.runInContext('renderAuth()', context);
  assert.match(html, /Jika email ini berdaftar, pautan pengesahan akan dihantar/);
  assert.match(html, /Hantar semula \(60s\)/);
  assert.match(html, /folder spam/);
  context.authMode = 'reset-password';
  context.cloud.recoveryRequired = 'true';
  html = vm.runInContext('renderAuth()', context);
  assert.doesNotMatch(html, /data-portal-form="reset-password"/);
  context.cloud.recoveryRequired = true;
  html = vm.runInContext('renderAuth()', context);
  assert.match(html, /data-portal-form="reset-password"/);
  assert.match(html, /name="password_confirm"[^>]*autocomplete="new-password"[^>]*minlength="10"[^>]*maxlength="128"/);
  assert.doesNotMatch(html, /data-portal-action="auth-mode"/);
});

test('recovery and invalid callback screens take precedence over signed-in dashboards and legacy codes', () => {
  const content = {innerHTML: '', querySelector: () => null};
  const context = vm.createContext({renderAuthLayout,pt,
    cloud: {session: {user: {id: 'verified-user'}}, recoveryRequired: true},
    active: true, destroyed: false, composing: false, renderDeferred: false, initializing: false,
    profileView: false, securityView: false, callbackErrorDismissed: false, authOnly: false, recoveryCode: 'old-code', snapshot: {}, profile: {}, roomId: null,
    clearSecurityFields() {},
    content, updateProfilePreview() {}, updateBusy() {}, renderAuth: () => 'AUTH', renderRecovery: () => 'LEGACY',
    renderStudent: () => 'DASHBOARD', renderTeacher: () => 'DASHBOARD', renderWorkspaceShell: html => html, isTeacher: () => false
  });
  vm.runInContext(`${functionSource('function signedIn()', 'function now(')}\n${functionSource('function render({', 'function updateEmailCooldown(')}`, context);
  vm.runInContext('render({preserve: false})', context);
  assert.equal(content.innerHTML, 'AUTH');
  assert.equal(vm.runInContext('accountAvailable()', context), false);
  context.cloud.recoveryRequired = false;
  context.cloud.callbackError = 'Pautan sudah tamat. Minta pautan baharu.';
  vm.runInContext('render({preserve: false})', context);
  assert.equal(content.innerHTML, 'AUTH');
  assert.equal(vm.runInContext('accountAvailable()', context), false);
  context.cloud.callbackError = '';
  context.recoveryCode = '';
  vm.runInContext('render({preserve: false})', context);
  assert.equal(content.innerHTML, 'DASHBOARD');
  assert.equal(vm.runInContext('accountAvailable()', context), true);
});

test('actual auth handler sends the email API payloads, surfaces provider errors, and guards unverified resets', async () => {
  function harness({session = null, recovery = false, result = {}, failure = ''} = {}) {
    const calls = [], notices = [];
    const message = {textContent: '', setAttribute() {}, focus() { this.focused = true; }};
    const context = vm.createContext({renderAuthLayout,pt,
      active: true, epoch: 0, operation: 0, pending: '', authPending: false, refreshAgain: false,
      authMode: 'login', authOnly: false, authEmail: '', callbackErrorDismissed: false,
      knownSession: '', knownRecovery: false, knownCallbackError: '', profile: null,
      recoveryCode: '', recoveryUsername: '', emailCooldownTimer: null, emailCooldownUntil: 0,
      cooldownStarts: 0, refreshes: 0, renders: 0, resets: 0,
      cloud: {session, recoveryRequired: recovery, async auth(type, payload) {
        calls.push({type, payload: JSON.parse(JSON.stringify(payload))});
        if (failure) throw new Error(failure);
        if (type === 'reset-password') { this.session = null; this.recoveryRequired = false; }
        return result;
      }},
      form: {isConnected: true, querySelector: () => message, reset() { context.resets += 1; }},
      updateBusy() {}, clearInterval() {},
      announce(text, tone) { notices.push({text, tone}); },
      errorText: error => error.message,
      clearAccount() { context.epoch += 1; context.operation += 1; context.pending = ''; context.authPending = false; },
      sessionKey: () => context.cloud.session?.user?.id || '',
      signedIn: () => Boolean(context.cloud.session),
      startEmailCooldown() { context.cooldownStarts += 1; },
      render() { context.renders += 1; },
      accountAvailable: () => Boolean(context.cloud.session) && !context.authOnly && context.cloud.recoveryRequired !== true && !context.recoveryCode,
      async refresh() { context.refreshes += 1; }
    });
    vm.runInContext(functionSource('async function handleAuth(', 'async function mutate('), context);
    return {context, calls, notices, message, async submit(type, values) {
      context.type = type; context.values = values;
      await vm.runInContext('handleAuth(form, values, type)', context);
    }};
  }
  const signup = harness({result: {confirmation_required: true, email: 'nama@contoh.com'}});
  await signup.submit('signup', {username: 'nama', email: 'nama@contoh.com', password: 'Pass Baharu#41', display_name: 'Nama Ujian', role: 'teacher'});
  assert.deepEqual(signup.calls[0], {type: 'signup', payload: {username: 'nama', password: 'Pass Baharu#41', display_name: 'Nama Ujian', role: 'teacher', email: 'nama@contoh.com'}});
  assert.equal(signup.context.authMode, 'confirmation');
  assert.equal(signup.context.recoveryCode, '');
  assert.equal(signup.context.refreshes, 0);
  assert.equal(signup.context.cooldownStarts, 1);
  assert.equal(signup.context.authPending, false);
  for (const type of ['recover-email', 'resend-confirmation']) {
    const sent = harness();
    await sent.submit(type, {email: 'nama@contoh.com'});
    assert.deepEqual(sent.calls[0], {type, payload: {email: 'nama@contoh.com'}});
    assert.equal(sent.context.authMode, type === 'recover-email' ? 'email-sent' : 'confirmation');
    assert.equal(sent.context.authOnly, true);
    assert.equal(sent.context.refreshes, 0);
    assert.equal(sent.notices.some(item => /Akaun.*didaftarkan/.test(item.text)), false);
    assert.equal(sent.context.authPending, false);
  }
  const failed = harness({failure: 'Penyedia email belum dikonfigurasi.'});
  await failed.submit('recover-email', {email: 'nama@contoh.com'});
  assert.equal(failed.message.textContent, 'Penyedia email belum dikonfigurasi.');
  assert.equal(failed.message.focused, true);
  assert.equal(failed.context.cooldownStarts, 0);
  assert.equal(failed.context.resets, 0);
  const unverified = harness();
  await unverified.submit('reset-password', {password: 'Pass Baharu#41'});
  assert.equal(unverified.calls.length, 0);
  assert.equal(unverified.context.authMode, 'recover-email');
  const reset = harness({session: {user: {id: 'recovery-user'}}, recovery: true});
  await reset.submit('reset-password', {password: 'Pass Baharu#41', password_confirm: 'Pass Baharu#41'});
  assert.deepEqual(reset.calls[0], {type: 'reset-password', payload: {password: 'Pass Baharu#41'}});
  assert.equal(reset.context.cloud.session, null);
  assert.equal(reset.context.authMode, 'login');
  assert.equal(reset.context.refreshes, 0);
  assert.match(reset.notices.at(-1).text, /Log masuk menggunakan kata laluan baharu/);
});
