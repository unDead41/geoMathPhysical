import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePhone, isValidPhoneOTP, AuthProviderError, authProviderError,
  AUTH_PROVIDER_ERROR_KEYS, renderProviderChoices, renderPhoneAuth, renderProviderProfile
} from '../dist/auth-providers.mjs';
import {AUTH_PROVIDER_COPY} from '../dist/auth-provider-copy.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const t = key => key;
// Use the portal's shared-component argument contract. This deliberately
// escapes values in field(), as the real field() does, rather than in callers.
const components = {
  t, esc,
  field(id, label, {name = id, type = 'text', autocomplete = 'off', inputmode = '', min = '', max = '', value = '', help = ''} = {}) {
    return `<label for="${id}">${label}</label><input id="${id}" name="${name}" type="${type}" autocomplete="${autocomplete}"${inputmode ? ` inputmode="${inputmode}"` : ''}${min ? ` minlength="${min}"` : ''}${max ? ` maxlength="${max}"` : ''} value="${esc(value)}" required><small>${help}</small><span data-error-for="${name}"></span>`;
  },
  button(label, action, {disabled = false, extra = ''} = {}) {
    return `<button type="button" data-portal-action="${action}" data-base-disabled="${disabled}"${disabled ? ' disabled' : ''} ${extra}>${label}</button>`;
  },
  submit: label => `<button type="submit">${label}</button>`,
  formError: () => '<p data-form-error role="alert"></p>'
};

test('phone normalization accepts Malaysian local and explicit international forms', () => {
  for (const [input, expected] of [
    ['0123456789', '+60123456789'],
    ['011 1234 5678', '+601112345678'],
    ['(012) 345-6789', '+60123456789'],
    ['60123456789', '+60123456789'],
    ['60 (12) 345-6789', '+60123456789'],
    [' +60 (12) 345-6789 ', '+60123456789'],
    ['+44 7700 900123', '+447700900123'],
    ['+12345678', '+12345678'],
    ['+123456789012345', '+123456789012345']
  ]) assert.equal(normalizePhone(input), expected, input);
});

test('phone normalization rejects text, extensions, controls and ambiguous or oversized numbers', () => {
  for (const input of [
    undefined, null, 60123456789, {}, '', '   ',
    '012345678', '012345678901', '0312345678', '447700900123',
    '+0123456789', '+1234567', '+1234567890123456', '+60+123456789', '60/123456789',
    '60.123456789', '0123456789x123', '+60123456789 ext 3', 'tel:+60123456789',
    '\t+60123456789', '+60123456789\n', '+6012\r3456789', '+6012\u00003456789',
    '+60\u00a0123456789', '+６０１２３４５６７８９', '<script>60123456789</script>'
  ]) assert.equal(normalizePhone(input), '', String(input));
});

test('SMS verification accepts exactly six ASCII digits without trimming or coercing', () => {
  for (const value of ['000000', '123456', '999999']) assert.equal(isValidPhoneOTP(value), true, value);
  for (const value of [undefined, null, 123456, '', '12345', '1234567', ' 123456', '123456 ', '123456\n', '123\t456', '123-456', '１２３４５６', '12e456']) {
    assert.equal(isValidPhoneOTP(value), false, String(value));
  }
});

test('provider error mapping uses known codes/status and never exposes provider descriptions', () => {
  const privateDetail = 'Provider internal details: token=secret user@email.invalid';
  for (const [input, phase, code, field] of [
    [{code: 'invalid_phone'}, 'phone-send', 'phone-invalid', 'phone'],
    [{code: 'validation_failed'}, 'phone-send', 'phone-invalid', 'phone'],
    [{code: 'otp_expired'}, 'phone-verify', 'invalid-otp', 'token'],
    [{code: 'otp_invalid'}, 'phone-verify', 'invalid-otp', 'token'],
    [{code: 'over_sms_send_rate_limit'}, 'auth', 'rate-limit', undefined],
    [{status: 429}, 'auth', 'rate-limit', undefined],
    [{code: 'provider_disabled'}, 'auth', 'provider-unavailable', undefined],
    [{code: 'access_denied'}, 'google', 'provider-cancelled', undefined],
    [{name: 'TypeError'}, 'auth', 'network', undefined],
    [{code: 'session-changed'}, 'auth', 'session-changed', undefined],
    [{code: 'busy'}, 'auth', 'busy', undefined],
    [{code: 'auth_required'}, 'profile', 'session-expired', undefined],
    [{code: 'auth_identity'}, 'profile', 'session-changed', undefined],
    [{code: 'invalid_account'}, 'profile', 'profile-invalid', undefined],
    [{code: 'username_taken'}, 'profile', 'username-taken', 'username'],
    [{code: 'profile_missing'}, 'profile', 'profile-unavailable', undefined],
    [{code: '42883'}, 'profile', 'profile-unavailable', undefined],
    [{code: 'PGRST202'}, 'profile', 'profile-unavailable', undefined],
    [{code: 'unknown_provider_error', field: 'password'}, 'profile', 'profile-failed', undefined],
    [{code: 'unknown_provider_error', field: 'token'}, 'auth', 'auth-failed', undefined]
  ]) {
    const error = authProviderError({...input, message: privateDetail, error_description: privateDetail}, phase);
    assert.ok(error instanceof AuthProviderError);
    assert.equal(error.code, code);
    assert.equal(error.field, field);
    assert.equal(error.message, AUTH_PROVIDER_ERROR_KEYS[code]);
    assert.doesNotMatch(error.message, /token=|user@|Provider internal/);
    assert.equal(error.error_description, undefined);
  }
  assert.equal(authProviderError(new Error('invalid_phone')).code, 'auth-failed', 'Untrusted message text must not select an error');
  assert.equal(new AuthProviderError('__proto__').code, 'auth-failed');
  assert.equal(new AuthProviderError('<script>').code, 'auth-failed');
});

test('all stable authored provider errors have English translations', () => {
  for (const key of Object.values(AUTH_PROVIDER_ERROR_KEYS)) assert.ok(AUTH_PROVIDER_COPY[key], key);
});

test('provider choices expose stable actions and the host availability flag', () => {
  const available = renderProviderChoices(components);
  assert.match(available, /role="group"/);
  assert.match(available, /data-portal-action="google-login"/);
  assert.match(available, /data-portal-action="phone-login"/);
  assert.doesNotMatch(available, / disabled/);
  const unavailable = renderProviderChoices({...components, available: false});
  assert.equal((unavailable.match(/data-base-disabled="true" disabled/g) || []).length, 2);
});

test('phone-send form reuses tel field and escapes the supplied phone draft', () => {
  const html = renderPhoneAuth({...components, phone: '"><img src=x onerror=alert(1)>'});
  assert.match(html, /data-portal-form="phone-send"/);
  assert.match(html, /name="phone" type="tel" autocomplete="tel" inputmode="tel"/);
  assert.match(html, /maxlength="40"/);
  assert.match(html, /value="&quot;&gt;&lt;img/);
  assert.doesNotMatch(html, /<img|name="token"|phone-resend/);
  assert.match(html, /data-portal-action="auth-mode"[^>]*data-mode="login"/);
  assert.match(renderPhoneAuth({...components, available: false}), /novalidate inert/);
});

test('phone-verify form leaves the SMS code empty and exposes cooldown/edit controls', () => {
  const html = renderPhoneAuth({...components, verify: true, phone: '+60123456789', remaining: 9.2});
  assert.match(html, /data-portal-form="phone-verify"/);
  assert.match(html, /<input class="portal-auth-otp" data-auth-otp[^>]*name="token" type="text" autocomplete="one-time-code" inputmode="numeric" minlength="6" maxlength="6" value=""/);
  assert.doesNotMatch(html, /type="number"|name="phone"/);
  assert.match(html, /data-portal-action="phone-resend" data-base-disabled="false" data-phone-cooldown disabled[^>]*>Hantar kod semula \(10s\)/);
  assert.match(html, /data-portal-action="phone-edit"/);
  assert.match(html, /Kod dihantar ke<\/span><b>\+60123456789<\/b>/);
  const ready = renderPhoneAuth({...components, verify: true, phone: '+60123456789'});
  assert.match(ready, /data-portal-action="phone-resend" data-base-disabled="false" data-phone-cooldown/);
  assert.doesNotMatch(ready, /\([0-9]+s\)/);
  const malicious = renderPhoneAuth({...components, verify: true, phone: '</b><script>bad</script>'});
  assert.doesNotMatch(malicious, /<script>/);
  assert.match(malicious, /&lt;script&gt;/);
});

test('first-login profile form has bounded shared fields, stable role IDs and safe draft values', () => {
  const html = renderProviderProfile({...components, values: {username: 'ijamm', display_name: '"><img src=x>', role: 'teacher'}});
  assert.match(html, /data-portal-form="complete-profile"/);
  assert.match(html, /name="username" type="text" autocomplete="username" minlength="3" maxlength="24" value="ijamm"/);
  assert.match(html, /name="display_name" type="text" autocomplete="nickname" minlength="2" maxlength="60" value="&quot;&gt;&lt;img src=x&gt;"/);
  assert.doesNotMatch(html, /<img|name="password"|name="email"/);
  assert.match(html, /id="portal-provider-role-teacher" type="radio" name="role" value="teacher" checked required/);
  assert.match(html, /id="portal-provider-role-student" type="radio" name="role" value="student" required/);
  assert.match(html, /data-error-for="role"/);
  assert.match(html, /data-portal-action="logout"/);
  const defaultRole = renderProviderProfile({...components, values: {role: '"><script>bad</script>'}});
  assert.match(defaultRole, /name="role" value="student" checked/);
  assert.doesNotMatch(defaultRole, /<script>/);
});
