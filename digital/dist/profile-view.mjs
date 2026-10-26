/** Render authored profile UI; identity and class values are escaped by the host. */
export function renderProfileView({profile, classes, signedIn, accountHeading, avatarArt, button, field, formError, submit, esc, t}) {
  if (!signedIn) return `<section class="portal-panel"><h1 id="portal-title" tabindex="-1">${t('Profil Saya')}</h1><p>${t('Anda sedang menggunakan mod tetamu. Log masuk untuk melihat dan menyimpan profil akaun anda.')}</p>${button(t('Log masuk'), 'profile-login', {primary: true})}</section>`;
  const email = profile.email;
  const legacy = typeof email !== 'string' || email.endsWith('@accounts.geodecoder.invalid');
  const choices = [['initial', 'Inisial'], ['cube', 'Kubus'], ['cuboid', 'Kuboid'], ['pyramid', 'Piramid'], ['cylinder', 'Silinder'], ['cone', 'Kon']];
  return `${accountHeading(t('AKAUN ANDA'), t('Profil Saya'), t('Pilih rupa anda. Nama dan avatar ini digunakan dalam akaun GeoDecoder.'))}
    <div class="portal-utility-navigation">${button(t('Kembali ke kelas'), 'profile-back', {quiet: true, symbol: 'home'})}${button(t('Kata Laluan & Keselamatan'), 'security', {quiet: true, symbol: 'lock'})}</div>
    <div class="portal-profile-layout"><section class="portal-panel"><h2>${t('Nama & avatar')}</h2><form data-portal-form="profile" novalidate>
      ${field('portal-profile-name', t('Nama paparan'), {name: 'display_name', autocomplete: 'nickname', value: profile.display_name, help: t('Gunakan 2–60 aksara. Nama pengguna anda kekal sama.')})}
      <fieldset class="portal-avatar-options"><legend>${t('Pilih avatar')}</legend>${choices.map(([id, label]) => `<label><input id="portal-avatar-${id}" type="radio" name="avatar" value="${id}" ${id === (profile.avatar || 'initial') ? 'checked' : ''} required><span class="portal-avatar">${avatarArt(id)}</span><span>${t(label)}</span></label>`).join('')}</fieldset>${formError()}${submit(t('Simpan'))}
    </form></section><section class="portal-panel portal-profile-details"><h2>${t('Maklumat akaun')}</h2><p class="portal-muted">${t('Maklumat ini baca sahaja. Peranan ditetapkan oleh sistem akaun.')}</p><dl>
      <dt>${t('Nama pengguna')}</dt><dd>@${esc(profile.username)}</dd><dt>${t('E-mel')}</dt><dd>${legacy ? t('Tiada e-mel berdaftar (akaun lama).') : esc(email)}</dd>
      <dt>${t('Status pengesahan e-mel')}</dt><dd>${legacy ? t('Tidak berkenaan') : profile.email_verified === true ? t('Disahkan') : profile.email_verified === false ? t('Belum disahkan') : t('Belum tersedia')}</dd>
      <dt>${t('Peranan')}</dt><dd>${t(profile.role === 'teacher' ? 'Guru' : profile.role === 'student' ? 'Murid' : 'Belum tersedia')}</dd>
      <dt>${t('Kelas')}</dt><dd>${classes.length ? `<ul>${classes.map(c => `<li>${esc(c.name)}</li>`).join('')}</ul>` : t('Belum ada kelas.')}</dd>
    </dl></section></div>`;
}
