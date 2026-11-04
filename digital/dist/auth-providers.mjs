/** Pure provider-authentication validation, safe errors and authored UI fragments. */
export function normalizePhone(value) {
  // Accept only explicit formatting characters. Do not trim away controls,
  // interpret extensions, coerce numbers or silently discard arbitrary text.
  if (typeof value !== 'string' || /[^0-9+ ()-]/.test(value)) return '';
  const compact = value.replace(/[ ()-]/g, '');
  const international = /^01[0-9]{8,9}$/.test(compact)
    ? `+60${compact.slice(1)}`
    : /^60[0-9]+$/.test(compact) ? `+${compact}` : compact;
  return /^\+[1-9][0-9]{7,14}$/.test(international) ? international : '';
}

export function isValidPhoneOTP(value) {
  return typeof value === 'string' && /^[0-9]{6}$/.test(value);
}

export const AUTH_PROVIDER_ERROR_KEYS = Object.freeze({
  'phone-invalid': 'Masukkan nombor telefon yang sah dengan kod negara, seperti +60123456789.',
  'otp-format': 'Masukkan tepat enam digit kod SMS.',
  'invalid-otp': 'Kod SMS tidak sah atau sudah tamat. Minta kod baharu dan cuba lagi.',
  'rate-limit': 'Terlalu banyak cubaan. Tunggu sebentar sebelum mencuba lagi.',
  'provider-unavailable': 'Kaedah log masuk ini belum tersedia. Cuba kaedah lain.',
  'provider-cancelled': 'Log masuk dibatalkan. Anda boleh cuba lagi.',
  network: 'Sambungan log masuk gagal. Semak Internet dan cuba lagi.',
  'auth-failed': 'Log masuk belum berjaya. Cuba semula atau gunakan kaedah lain.',
  'session-expired': 'Sesi tamat. Log masuk semula sebelum mencuba lagi.',
  'session-changed': 'Sesi akaun berubah. Log masuk semula untuk meneruskan.',
  busy: 'Tunggu permintaan log masuk selesai.',
  'username-invalid': 'Gunakan nama pengguna 3–24 aksara: huruf kecil, nombor atau garis bawah (_).',
  'username-taken': 'Nama pengguna ini telah digunakan. Pilih nama lain.',
  'display-name-invalid': 'Masukkan nama paparan 2–60 aksara tanpa aksara kawalan.',
  'role-invalid': 'Pilih Pelajar atau Guru.',
  'profile-invalid': 'Semak nama pengguna, nama paparan dan peranan anda.',
  'profile-unavailable': 'Penyediaan profil belum tersedia. Cuba lagi kemudian.',
  'profile-failed': 'Profil belum dapat disimpan. Cuba semula.'
});

const ERROR_FIELDS = Object.freeze({
  'phone-invalid': 'phone',
  'otp-format': 'token',
  'invalid-otp': 'token',
  'username-invalid': 'username',
  'username-taken': 'username',
  'display-name-invalid': 'display_name',
  'role-invalid': 'role'
});

export class AuthProviderError extends Error {
  constructor(code = 'auth-failed') {
    const safeCode = Object.hasOwn(AUTH_PROVIDER_ERROR_KEYS, code) ? code : 'auth-failed';
    super(AUTH_PROVIDER_ERROR_KEYS[safeCode]);
    this.name = 'AuthProviderError';
    this.code = safeCode;
    if (ERROR_FIELDS[safeCode]) this.field = ERROR_FIELDS[safeCode];
  }
}

/** Map codes/status only; provider messages and descriptions never reach the UI. */
export function authProviderError(error, phase = 'auth') {
  const code = typeof error?.code === 'string' ? error.code.toLowerCase().replace(/_/g, '-') : '';
  if (Object.hasOwn(AUTH_PROVIDER_ERROR_KEYS, code)) return new AuthProviderError(code);
  if (['invalid-phone', 'invalid-phone-number', 'phone-number-invalid', 'phone-invalid'].includes(code)) return new AuthProviderError('phone-invalid');
  if (['otp-expired', 'otp-invalid', 'invalid-otp', 'otp-invalid-or-expired', 'otp-not-found'].includes(code)) return new AuthProviderError('invalid-otp');
  if (error?.status === 429 || ['over-sms-send-rate-limit', 'over-request-rate-limit', 'sms-send-rate-limit-exceeded', 'too-many-requests', 'rate-limit-exceeded'].includes(code)) return new AuthProviderError('rate-limit');
  if (['provider-disabled', 'phone-provider-disabled', 'sms-provider-disabled', 'otp-disabled', 'oauth-provider-not-supported', 'unsupported-provider', 'provider-not-enabled'].includes(code)) return new AuthProviderError('provider-unavailable');
  if (['access-denied', 'oauth-access-denied', 'user-cancelled', 'cancelled'].includes(code)) return new AuthProviderError('provider-cancelled');
  if (code === 'auth-identity') return new AuthProviderError('session-changed');
  if (error?.status === 401 || error?.status === 403 || ['auth-required', 'session-not-found', 'refresh-token-not-found', 'refresh-token-already-used', 'bad-jwt', 'not-authenticated'].includes(code)) return new AuthProviderError('session-expired');
  if (['invalid-username', 'username-invalid'].includes(code)) return new AuthProviderError('username-invalid');
  if (['invalid-display-name', 'display-name-invalid'].includes(code)) return new AuthProviderError('display-name-invalid');
  if (['invalid-role', 'role-invalid'].includes(code)) return new AuthProviderError('role-invalid');
  if (code === 'invalid-account') return new AuthProviderError('profile-invalid');
  if (['profile-missing', '42883', 'pgrst202'].includes(code)) return new AuthProviderError('profile-unavailable');
  if (code === 'validation-failed' && ['phone-send', 'phone-verify'].includes(phase)) return new AuthProviderError('phone-invalid');
  if (error?.name === 'TypeError' || error?.name === 'AbortError' || error?.status === 0 || ['network-error', 'fetch-error', 'request-timeout'].includes(code)) return new AuthProviderError('network');
  return new AuthProviderError(phase === 'profile' || phase === 'complete-profile' ? 'profile-failed' : 'auth-failed');
}

export function renderProviderChoices({button, t, available = true}) {
  return `<div class="portal-provider-options" role="group" aria-label="${t('Pilihan log masuk lain')}">${button(t('Teruskan dengan Google'), 'google-login', {disabled: !available, extra: 'data-auth-provider="google"'})}${button(t('Log masuk dengan nombor telefon'), 'phone-login', {disabled: !available, extra: 'data-auth-provider="phone"'})}</div>`;
}

/** Host field() escapes input values; directly rendered identity values use esc(). */
export function renderPhoneAuth({verify = false, phone = '', remaining = 0, field, submit, formError, button, t, esc, available = true}) {
  const seconds = Number.isFinite(Number(remaining)) ? Math.max(0, Math.ceil(Number(remaining))) : 0;
  const input = verify
    ? field('portal-phone-otp', t('Kod SMS enam digit'), {name: 'token', type: 'text', autocomplete: 'one-time-code', inputmode: 'numeric', min: 6, max: 6, help: t('Masukkan enam digit kod yang diterima melalui SMS.')}).replace('<input ', '<input class="portal-auth-otp" data-auth-otp ')
    : field('portal-phone', t('Nombor telefon'), {name: 'phone', type: 'tel', autocomplete: 'tel', inputmode: 'tel', max: 40, value: phone, placeholder: '+60123456789', help: t('Gunakan nombor Malaysia bermula 01 atau nombor antarabangsa dengan kod negara, seperti +60123456789.')});
  return `${verify ? `<p class="portal-email-summary"><span>${t('Kod dihantar ke')}</span><b>${esc(phone)}</b></p>` : ''}<form data-portal-form="${verify ? 'phone-verify' : 'phone-send'}" novalidate${!available ? ' inert' : ''}>${input}${formError()}<div class="portal-auth-submit">${submit(t(verify ? 'Sahkan kod dan log masuk' : 'Hantar kod SMS'))}</div></form>${verify ? `<div class="portal-phone-actions">${button(`${t('Hantar kod semula')}${seconds ? ` (${seconds}s)` : ''}`, 'phone-resend', {disabled: !available || !phone, extra: `data-phone-cooldown${seconds > 0 && available && phone ? ' disabled' : ''}`})}${button(t('Tukar nombor telefon'), 'phone-edit', {quiet: true})}</div>` : ''}${button(t('Kembali ke log masuk'), 'auth-mode', {quiet: true, extra: 'data-mode="login"'})}`;
}

/** Profile values are drafts only; the authenticated server owns profile creation. */
export function renderProviderProfile({field, submit, formError, button, t, esc, values = {}}) {
  const role = values?.role === 'teacher' ? 'teacher' : 'student';
  return `<form data-portal-form="complete-profile" novalidate>${field('portal-provider-username', t('Nama pengguna'), {name: 'username', autocomplete: 'username', min: 3, max: 24, value: values?.username ?? '', help: t('3–24 aksara: huruf a–z, nombor atau garis bawah (_). Huruf besar ditukar kepada huruf kecil.')})}${field('portal-provider-display-name', t('Nama paparan'), {name: 'display_name', autocomplete: 'nickname', min: 2, max: 60, value: values?.display_name ?? '', help: t('2–60 aksara. Contoh: nama yang digunakan di kelas.')})}<fieldset class="portal-role-fieldset"><legend>${t('Saya seorang')}</legend><div class="portal-role-options">${[['student', 'Pelajar', 'Sertai kelas dan main'], ['teacher', 'Guru', 'Urus kelas dan bilik']].map(([value, label, description]) => `<label for="portal-provider-role-${value}"><input id="portal-provider-role-${value}" type="radio" name="role" value="${value}"${role === value ? ' checked' : ''} required><span><b>${t(label)}</b><small>${t(description)}</small></span></label>`).join('')}</div><span id="portal-provider-role-error" class="portal-field-error" data-error-for="role"></span></fieldset>${formError()}<div class="portal-auth-submit">${submit(t('Simpan profil dan teruskan'))}</div></form>${button(t('Log keluar'), 'logout', {quiet: true})}`;
}
