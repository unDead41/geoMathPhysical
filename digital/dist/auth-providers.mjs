/** Google authentication, safe errors and authored UI fragments. */
export const AUTH_PROVIDER_ERROR_KEYS = Object.freeze({
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
  if (error?.status === 429 || ['over-request-rate-limit', 'too-many-requests', 'rate-limit-exceeded'].includes(code)) return new AuthProviderError('rate-limit');
  if (['provider-disabled', 'oauth-provider-not-supported', 'unsupported-provider', 'provider-not-enabled'].includes(code)) return new AuthProviderError('provider-unavailable');
  if (['access-denied', 'oauth-access-denied', 'user-cancelled', 'cancelled'].includes(code)) return new AuthProviderError('provider-cancelled');
  if (code === 'auth-identity') return new AuthProviderError('session-changed');
  if (error?.status === 401 || error?.status === 403 || ['auth-required', 'session-not-found', 'refresh-token-not-found', 'refresh-token-already-used', 'bad-jwt', 'not-authenticated'].includes(code)) return new AuthProviderError('session-expired');
  if (['invalid-username', 'username-invalid'].includes(code)) return new AuthProviderError('username-invalid');
  if (['invalid-display-name', 'display-name-invalid'].includes(code)) return new AuthProviderError('display-name-invalid');
  if (['invalid-role', 'role-invalid'].includes(code)) return new AuthProviderError('role-invalid');
  if (code === 'invalid-account') return new AuthProviderError('profile-invalid');
  if (['profile-missing', '42883', 'pgrst202'].includes(code)) return new AuthProviderError('profile-unavailable');
  if (error?.name === 'TypeError' || error?.name === 'AbortError' || error?.status === 0 || ['network-error', 'fetch-error', 'request-timeout'].includes(code)) return new AuthProviderError('network');
  return new AuthProviderError(phase === 'profile' || phase === 'complete-profile' ? 'profile-failed' : 'auth-failed');
}

export function renderProviderChoices({button, t, available = true}) {
  return `<div class="portal-provider-options" role="group" aria-label="${t('Pilihan log masuk lain')}">${button(t('Teruskan dengan Google'), 'google-login', {disabled: !available, extra: 'data-auth-provider="google"'})}</div>`;
}

/** Profile values are drafts only; the authenticated server owns profile creation. */
export function renderProviderProfile({field, submit, formError, button, t, esc, values = {}}) {
  const role = values?.role === 'teacher' ? 'teacher' : 'student';
  return `<form data-portal-form="complete-profile" novalidate>${field('portal-provider-username', t('Nama pengguna'), {name: 'username', autocomplete: 'username', min: 3, max: 24, value: values?.username ?? '', help: t('3–24 aksara: huruf a–z, nombor atau garis bawah (_). Huruf besar ditukar kepada huruf kecil.')})}${field('portal-provider-display-name', t('Nama paparan'), {name: 'display_name', autocomplete: 'nickname', min: 2, max: 60, value: values?.display_name ?? '', help: t('2–60 aksara. Contoh: nama yang digunakan di kelas.')})}<fieldset class="portal-role-fieldset"><legend>${t('Saya seorang')}</legend><div class="portal-role-options">${[['student', 'Pelajar', 'Sertai kelas dan main'], ['teacher', 'Guru', 'Urus kelas dan bilik']].map(([value, label, description]) => `<label for="portal-provider-role-${value}"><input id="portal-provider-role-${value}" type="radio" name="role" value="${value}"${role === value ? ' checked' : ''} required><span><b>${t(label)}</b><small>${t(description)}</small></span></label>`).join('')}</div><span id="portal-provider-role-error" class="portal-field-error" data-error-for="role"></span></fieldset>${formError()}<div class="portal-auth-submit">${submit(t('Simpan profil dan teruskan'))}</div></form>${button(t('Log keluar'), 'logout', {quiet: true})}`;
}
