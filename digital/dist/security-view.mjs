function accountProviders(authUser) {
  const providers = Array.isArray(authUser?.app_metadata?.providers) ? authUser.app_metadata.providers : [];
  const identities = Array.isArray(authUser?.identities) ? authUser.identities.map(identity => identity?.provider) : [];
  return new Set([...providers, authUser?.app_metadata?.provider, ...identities].filter(provider => typeof provider === 'string'));
}

/** Presentation only; password changes still require server-verified reauthentication. */
export function passwordFormAvailable(authUser) {
  if (authUser === undefined) return true;
  if (!authUser) return false;
  const providers = accountProviders(authUser);
  if (!providers.size) return !authUser.phone;
  return providers.has('email') && typeof authUser.email === 'string' && Boolean(authUser.email.trim());
}

function providerGuidance(authUser) {
  const providers = accountProviders(authUser);
  if (providers.has('google') && providers.has('phone')) return 'Gunakan Google atau kod SMS untuk log masuk. Urus kata laluan Google melalui akaun Google anda.';
  if (providers.has('google')) return 'Akaun ini menggunakan Google. Urus kata laluan dan pemulihan melalui akaun Google anda.';
  if (providers.has('phone') || authUser?.phone) return 'Akaun ini menggunakan kod SMS sekali guna. Pastikan nombor telefon anda boleh menerima SMS.';
  return 'Akaun ini menggunakan penyedia log masuk. Urus pengesahan melalui penyedia akaun anda.';
}

/** Render security UI without retaining credentials in a model or persistent store. */
export function renderSecurityView({profile, authUser, confirming, sessionsHTML='', accountHeading, button, field, formError, submit, icon, esc, t}) {
  const heading = profile
    ? accountHeading(t('TETAPAN AKAUN'), t('Kata Laluan & Keselamatan'), t('Lindungi akaun anda dan urus sesi log masuk.'))
    : `<header class="portal-page-heading"><div><p class="card-kicker">${t('TETAPAN AKAUN')}</p><h1 id="portal-title" tabindex="-1">${t('Kata Laluan & Keselamatan')}</h1><p>${t('Lindungi akaun yang sedang log masuk.')}</p></div></header>`;
  const passwordSection = passwordFormAvailable(authUser) ? `<section class="portal-panel" aria-labelledby="portal-change-title"><div class="portal-panel-title"><div><h2 id="portal-change-title">${t('Tukar kata laluan')}</h2><p>${t('Sahkan identiti menggunakan kata laluan semasa.')}${profile?.username ? ` <b>@${esc(profile.username)}</b>` : ''}</p></div><span class="portal-class-icon" aria-hidden="true">${icon('lock')}</span></div>
    <form data-portal-form="change-password" novalidate>
      ${field('portal-security-current', t('Kata laluan semasa'), {name: 'current_password', type: 'password', autocomplete: 'current-password', max: 128, password: true, secretLabel: t('kata laluan semasa'), help: t('Digunakan hanya untuk mengesahkan identiti anda semula.')})}
      ${field('portal-security-new', t('Kata laluan baharu'), {name: 'password', type: 'password', autocomplete: 'new-password', min: 10, max: 128, password: true, secretLabel: t('kata laluan baharu'), help: t('10–128 aksara. Anda boleh tampal atau menggunakan pengurus kata laluan.')})}
      ${field('portal-security-confirm', t('Sahkan kata laluan baharu'), {name: 'password_confirm', type: 'password', autocomplete: 'new-password', min: 10, max: 128, password: true, secretLabel: t('pengesahan kata laluan baharu'), help: t('Masukkan semula kata laluan baharu yang sama.')})}
      ${formError()}${submit(t('Simpan kata laluan baharu'))}<p class="portal-security-note">${t('Gunakan kata laluan baharu apabila diminta log masuk semula.')} ${t('Terlupa kata laluan semasa?')} ${button(t('Dapatkan pautan reset'), 'security-recover', {quiet: true})}</p>
    </form></section>` : `<section class="portal-panel" aria-labelledby="portal-provider-title"><div class="portal-panel-title"><div><h2 id="portal-provider-title">${t('Kaedah log masuk')}</h2><p>${t(providerGuidance(authUser))}</p></div><span class="portal-class-icon" aria-hidden="true">${icon('lock')}</span></div></section>`;
  return `<div class="portal-room-navigation">${button(t('Kembali ke kelas'), 'dashboard', {quiet: true, symbol: 'home'})}</div>${heading}
    <div class="portal-security-layout">${passwordSection}<aside class="portal-panel portal-security-sessions" aria-labelledby="portal-sessions-title"><span class="portal-security-symbol" aria-hidden="true">${icon('user')}</span><h2 id="portal-sessions-title">${t('Sesi semua peranti')}</h2>
      <p>${t('Log keluar pada telefon, komputer dan pelayar yang menggunakan akaun ini, termasuk peranti ini.')}</p><p class="portal-security-note">${t('Pelayan membatalkan sesi untuk pembaharuan log masuk. Token akses yang sudah dikeluarkan mungkin masih sah sehingga tamat tempoh; peranti lain tidak semestinya terkeluar serta-merta.')}</p>${button(t('Log keluar semua peranti'), 'request-logout-all', {danger: true})}
      ${confirming ? `<div class="portal-close-confirmation portal-security-confirm" role="group" aria-labelledby="portal-global-title"><div><h3 id="portal-global-title" tabindex="-1">${t('Log keluar semua peranti?')}</h3><p>${t('Anda juga akan keluar pada peranti ini. Simpan kerja anda dahulu. Untuk kembali, gunakan kaedah log masuk akaun anda.')}</p></div><div>${button(t('Batal'), 'cancel-logout-all')}${button(t('Ya, log keluar semua'), 'logout-all', {danger: true})}</div></div>` : ''}
    </aside></div>${sessionsHTML}`;
}
