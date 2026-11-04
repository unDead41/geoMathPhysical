import {sceneIllustration} from './entry-art.mjs';
import {icon} from './art.mjs';

/** Compose account entry around the host's existing forms and action markup. */
export function renderAuthLayout({mode = 'login', body = '', modes = '', warnings = '', details = [], note = '', guest = '', t}) {
  const signup = mode === 'signup';
  const reset = mode === 'reset-password';
  const recovery = ['recover-email', 'email-sent', 'reset-password', 'recover'].includes(mode);
  const emailRecovery = recovery && mode !== 'recover';
  const title = mode === 'login' ? t('Selamat kembali.') : signup ? t('Daftar akaun') : details[1];
  const introTitle = signup
    ? `${t('Mulakan')}<br>${t('penerokaan anda.')}`
    : `${t('Satu kelas.')}<br>${t('Banyak penemuan.')}`;
  const introCopy = signup
    ? t('Cipta akaun GeoMath dan terokai pembelajaran geometri dengan lebih teratur.')
    : recovery
      ? t('Pulihkan akses akaun anda dengan kaedah pemulihan yang didaftarkan.')
      : t('Belajar geometri dengan aktiviti interaktif, latihan terarah dan duel yang menyeronokkan.');
  const steps = emailRecovery ? `<ol class="portal-recovery-steps" aria-label="${t('Langkah pemulihan akaun')}">
    <li class="${reset ? 'is-complete' : 'is-current'}" ${!reset ? 'aria-current="step"' : ''}><span>${reset ? icon('check') : '1'}</span><b>${t('Pautan e-mel')}</b></li>
    <li class="${reset ? 'is-current' : ''}" ${reset ? 'aria-current="step"' : ''}><span>2</span><b>${t('Kata laluan baharu')}</b></li>
  </ol>` : '';
  const verified = reset ? `<p class="portal-recovery-verified" role="status">${icon('check')}<b>${t('Pautan pemulihan disahkan.')}</b></p>` : '';
  const recoveryAside = emailRecovery ? `<aside class="portal-recovery-help" aria-labelledby="portal-recovery-help-title">
    <h3 id="portal-recovery-help-title">${t('Pautan pemulihan')}</h3>
    <p>${reset ? t('Pautan sudah disahkan. Simpan kata laluan baharu untuk menyelesaikan pemulihan akaun.') : t('Belum menerima e-mel? Semak peti masuk dan folder spam. Selepas meminta pautan, anda boleh menghantarnya semula apabila tempoh menunggu selesai.')}</p>
    <p class="portal-security-note">${t('Gunakan pautan pemulihan terkini yang dihantar ke e-mel pendaftaran anda.')}</p>
  </aside>` : '';
  return `<div class="portal-auth-layout portal-account-entry${recovery ? ' portal-auth-recovery' : ''}" data-auth-mode="${mode}">
    <div class="portal-auth-intro">
      <div class="portal-auth-editorial"><h1 id="portal-title" tabindex="-1">${introTitle}</h1><p>${introCopy}</p></div>
      ${sceneIllustration({variant:'cluster',className:'portal-auth-scene'})}
    </div>
    <section class="portal-panel portal-auth-card" aria-labelledby="portal-auth-title">
      <header class="portal-auth-heading"><h2 id="portal-auth-title" tabindex="-1">${title}</h2><p class="portal-muted">${details[2] || ''}</p></header>
      ${steps}${warnings}
      <div class="portal-auth-form-layout"><div class="portal-auth-primary">${verified}${body}</div>${recoveryAside}</div>
      ${modes ? `<div class="portal-auth-secondary">${modes}</div>` : ''}
      ${guest ? `<div class="portal-auth-guest">${guest}</div>` : ''}
      <p class="portal-account-note">${note}</p>
    </section>
  </div>`;
}
