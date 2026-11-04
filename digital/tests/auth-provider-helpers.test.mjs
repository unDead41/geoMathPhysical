import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  AuthProviderError, authProviderError,
  AUTH_PROVIDER_ERROR_KEYS, renderProviderChoices, renderProviderProfile
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

test('provider error mapping uses known codes/status and never exposes provider descriptions', () => {
  const privateDetail = 'Provider internal details: token=secret user@email.invalid';
  for (const [input, phase, code, field] of [
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
  assert.doesNotMatch(available, /phone|SMS|type="tel"/);
  assert.doesNotMatch(available, / disabled/);
  const unavailable = renderProviderChoices({...components, available: false});
  assert.equal((unavailable.match(/data-base-disabled="true" disabled/g) || []).length, 1);
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
