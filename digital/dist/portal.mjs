import {icon, shapeArt} from './art.mjs';
import {VERSION, formatTime} from './core.mjs';

const PAGE_SIZE = 20;
const ROOM_PAGE_SIZE = 6;
const POLL_MS = 15000;
const ONLINE_MS = 45000;
const timeFormat = new Intl.DateTimeFormat('ms-MY', {timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', second: '2-digit'});
const dateFormat = new Intl.DateTimeFormat('ms-MY', {timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}
function list(value) { return Array.isArray(value) ? value : []; }
function number(value, fallback = 0) { return Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : fallback; }
function stamp(value) { const result = Date.parse(value || ''); return Number.isFinite(result) ? result : null; }
function dateText(value) { const date = stamp(value); return date === null ? 'Belum direkodkan' : dateFormat.format(date); }
function initial(name) { return Array.from(String(name || '?').trim())[0]?.toLocaleUpperCase('ms-MY') || '?'; }
function statusLabel(status) { return ({open: 'Belum bermula', playing: 'Sedang bermain', closed: 'Ditutup'})[status] || 'Menunggu'; }
function playerLabel(status) { return ({waiting: 'Menunggu mula', playing: 'Sedang menjawab', review: 'Menyemak jawapan', finished: 'Selesai', closed: 'Bilik ditutup'})[status] || 'Menunggu'; }
function hasAttempt(player) {
  return ['playing', 'review', 'finished'].includes(player.status) || Boolean(player.attempt_id || player.started_at || player.timer_started_at || number(player.question_index) || number(player.elapsed_ms) || number(player.score) || number(player.mistakes) || number(player.hints) || number(player.skipped));
}
function errorText(error) { return error?.message || 'Permintaan belum dapat disahkan. Cuba semula.'; }

/** Account, class, invitation, and live-room UI. All authorization remains server-owned. */
export function createPortal({cloud, onPlay = () => {}, onExit = () => {}, onError = () => {}} = {}) {
  const screen = document.getElementById('portal-screen');
  if (!screen) throw new Error('Bahagian #portal-screen diperlukan.');
  if (!cloud || typeof cloud.rpc !== 'function' || typeof cloud.auth !== 'function') throw new Error('Sambungan akaun diperlukan.');

  let active = false;
  let destroyed = false;
  let epoch = 0;
  let authMode = 'login';
  let snapshot = null;
  let profile = null;
  let roomId = null;
  let classId = null;
  let recoveryCode = '';
  let recoveryUsername = '';
  let authEmail = '';
  let authOnly = false;
  let emailCooldownUntil = 0;
  let emailCooldownTimer = null;
  let callbackErrorDismissed = false;
  let knownRecovery = false;
  let knownCallbackError = '';
  let closeConfirmation = false;
  let pending = '';
  let operation = 0;
  let authPending = false;
  let initializing = false;
  let refreshPromise = null;
  let refreshAgain = false;
  let watchStop = null;
  let watchTimeout = null;
  let sessionStop = null;
  let poll = null;
  let tick = null;
  let watchingRoom = null;
  let watchGeneration = 0;
  let connection = 'idle';
  let serverOffset = 0;
  let lastUpdated = null;
  let stale = false;
  let roomError = '';
  let rosterQuery = '';
  let rosterPage = 1;
  let boardPage = 1;
  let roomPage = 1;
  let composing = false;
  let renderDeferred = false;
  let previousTitle = '';
  let knownSession = '';
  let notice = {text: '', tone: 'info'};

  screen.classList.add('portal-screen');
  screen.setAttribute('aria-labelledby', 'portal-title');
  screen.innerHTML = '<div class="portal-topline"><button type="button" class="button button-quiet portal-back" data-portal-action="exit">' + icon('home') + '<span>Kembali ke mula</span></button><span class="portal-edition">GEODECODER <b>V' + esc(VERSION) + '</b></span></div><div class="portal-feedback"><div id="portal-notice" class="portal-notice" role="status" aria-live="polite" aria-atomic="true"></div><div id="portal-alert" class="portal-notice portal-notice-error" role="alert" aria-atomic="true"></div></div><div id="portal-content"></div>';
  const content = screen.querySelector('#portal-content');
  const statusNode = screen.querySelector('#portal-notice');
  const alertNode = screen.querySelector('#portal-alert');

  function sessionKey() {
    const session = cloud.session;
    return String(session?.user?.id || session?.profile?.id || session?.user_id || session?.id || session?.access_token || '');
  }
  function signedIn() { return Boolean(cloud.session); }
  function callbackError() { return callbackErrorDismissed ? '' : String(cloud.callbackError || ''); }
  function accountAvailable() { return signedIn() && cloud.recoveryRequired !== true && !callbackError() && !authOnly && !recoveryCode; }
  function now() { return Date.now() + serverOffset; }
  function online(value) { const date = stamp(value); return date !== null && now() - date <= ONLINE_MS; }
  function currentClass() { return list(snapshot?.classes).find(item => String(item.id) === String(classId)) || null; }
  function currentRoom() { return snapshot?.room && String(snapshot.room.id) === String(roomId) ? snapshot.room : null; }
  function isTeacher() { return profile?.role === 'teacher'; }
  function valid(token, identity) { return active && !destroyed && token === epoch && identity === sessionKey() && accountAvailable(); }
  function report(error) { try { onError(error); } catch { /* Host feedback must not break account recovery. */ } }

  function announce(text, tone = 'info') {
    if (notice.text === text && notice.tone === tone) return;
    notice = {text, tone};
    statusNode.className = `portal-notice portal-notice-${tone}`;
    statusNode.textContent = tone === 'error' ? '' : text;
    alertNode.textContent = tone === 'error' ? text : '';
  }

  function button(label, action, {primary = false, danger = false, quiet = false, id = '', disabled = false, symbol = '', extra = ''} = {}) {
    return `<button type="button" class="button ${primary ? 'button-primary' : danger ? 'button-danger' : quiet ? 'button-quiet' : 'button-outline'}" data-portal-action="${action}"${id ? ` data-id="${esc(id)}"` : ''} data-block-while-busy data-base-disabled="${disabled}" ${disabled ? 'disabled' : ''} ${extra}>${symbol ? icon(symbol) : ''}<span>${label}</span></button>`;
  }

  function submit(label, primary = true) {
    return `<button type="submit" class="button ${primary ? 'button-primary' : 'button-outline'} portal-submit" data-block-while-busy data-base-disabled="false"><span>${label}</span>${icon('arrow')}</button>`;
  }

  function field(id, label, {name = id, help = '', type = 'text', autocomplete = 'off', placeholder = '', min = '', max = '', inputmode = '', required = true, value = '', password = false, secretLabel = 'kata laluan'} = {}) {
    return `<div class="portal-field"><label for="${id}">${label}${!required ? '<span class="portal-optional"> (pilihan)</span>' : ''}</label><div class="portal-input-wrap"><input id="${id}" name="${name}" type="${type}" autocomplete="${autocomplete}" autocapitalize="none" spellcheck="${['name', 'display_name'].includes(name)}" ${placeholder ? `placeholder="${esc(placeholder)}"` : ''} ${min ? `minlength="${min}"` : ''} ${max ? `maxlength="${max}"` : ''} ${inputmode ? `inputmode="${inputmode}"` : ''} ${required ? 'required' : ''} aria-describedby="${id}-help ${id}-error" value="${esc(value)}" ${password ? 'class="portal-password"' : ''}>${password ? `<button class="portal-password-toggle" type="button" data-portal-action="password" data-input="${id}" data-secret-label="${esc(secretLabel)}" aria-label="Tunjukkan ${esc(secretLabel)}" aria-pressed="false" data-block-while-busy data-base-disabled="false">Tunjuk</button>` : ''}</div><small class="portal-field-help" id="${id}-help">${help}</small><span class="portal-field-error" id="${id}-error" data-error-for="${name}"></span></div>`;
  }

  function formError() { return '<p class="portal-form-error" data-form-error role="alert"></p>'; }
  function badge(status) { return `<span class="portal-badge portal-badge-${esc(status)}">${statusLabel(status)}</span>`; }
  function presence(value) {
    return `<span class="portal-presence ${online(value) ? 'is-online' : ''}" data-presence="${esc(value || '')}"><i aria-hidden="true"></i><span>${online(value) ? 'Aktif sekarang' : 'Tidak aktif'}</span></span>`;
  }

  function geometryKit() {
    return `<div class="portal-kit" aria-hidden="true"><div class="portal-kit-model">${shapeArt('cube', 'solid', true, 'mint')}<span>R1 <b>Bongkah</b></span></div><span class="portal-kit-link">${icon('arrow')}</span><div class="portal-kit-model portal-kit-net">${shapeArt('cube', 'net', true, 'violet')}<span>R2 <b>Bentangan</b></span></div></div>`;
  }

  function emailCooldownSeconds() { return Math.max(0, Math.ceil((emailCooldownUntil - Date.now()) / 1000)); }

  function renderAuth() {
    const modes = ['login', 'signup', 'recover-email', 'recover', 'resend-confirmation', 'confirmation', 'email-sent'];
    const mode = cloud.recoveryRequired === true ? 'reset-password' : modes.includes(authMode) ? authMode : 'login';
    const signup = mode === 'signup';
    const legacy = mode === 'recover';
    const reset = mode === 'reset-password';
    const emailRequest = ['recover-email', 'resend-confirmation'].includes(mode);
    const confirmation = mode === 'confirmation';
    const sent = confirmation || mode === 'email-sent';
    const available = cloud.ready !== false;
    const invalidLink = reset ? '' : callbackError();
    const details = {
      login: ['SELAMAT DATANG KEMBALI', 'Masuk ke ruang kelas', 'Gunakan email atau nama pengguna dan kata laluan anda.'],
      signup: ['MULA BELAJAR BERSAMA', 'Buka akaun GeoDecoder', 'Pilih peranan anda. Gunakan email yang boleh anda buka untuk mengesahkan akaun dan memulihkan kata laluan.'],
      'recover-email': ['KEMBALI KE AKAUN ANDA', 'Terlupa kata laluan?', 'Masukkan email pendaftaran untuk meminta pautan menetapkan semula kata laluan.'],
      recover: ['UNTUK AKAUN LAMA', 'Pulihkan dengan kod', 'Pilihan ini untuk akaun lama yang didaftarkan tanpa email. Gunakan kod pemulihan yang anda simpan.'],
      'resend-confirmation': ['SAHKAN EMAIL ANDA', 'Minta pautan pengesahan', 'Masukkan email yang digunakan semasa mendaftar.'],
      confirmation: ['SEMAK EMAIL ANDA', 'Sahkan email untuk meneruskan', 'Buka pautan pengesahan dalam email sebelum log masuk.'],
      'email-sent': ['SEMAK EMAIL ANDA', 'Permintaan pemulihan diterima', 'Buka pautan pemulihan dalam email untuk memilih kata laluan baharu.'],
      'reset-password': ['PAUTAN PEMULIHAN DISAHKAN', 'Tetapkan kata laluan baharu', 'Pilih kata laluan baharu untuk akaun anda. Selepas disimpan, log masuk semula.']
    }[mode];
    document.title = `${details[1]} — GeoDecoder Digital`;
    const modeLink = (label, next, secondary = false) => `<button type="button" class="portal-text-button${secondary ? ' portal-legacy-link' : ''}" data-portal-action="auth-mode" data-mode="${next}" data-block-while-busy data-base-disabled="false">${label}</button>`;
    let body = '';
    if (sent) {
      const kind = confirmation ? 'pengesahan' : 'pemulihan';
      const remaining = emailCooldownSeconds();
      body = `<div class="portal-inline-info"><b>Jika email ini berdaftar, pautan ${kind} akan dihantar.</b><p>Semak peti masuk dan folder spam. Penghantaran email mungkin mengambil sedikit masa.</p></div>${authEmail ? `<p class="portal-email-summary"><span>Email yang dimasukkan</span><b>${esc(authEmail)}</b></p>` : ''}<div class="portal-auth-submit">${button(remaining ? `Hantar semula (${remaining}s)` : 'Hantar pautan semula', 'resend-email', {primary: true, disabled: !available || !authEmail, extra: `data-email-cooldown data-resend-kind="${confirmation ? 'resend-confirmation' : 'recover-email'}"`})}</div>${modeLink('Kembali ke log masuk', 'login')}`;
    } else {
      let fields = '';
      if (signup) fields += `<fieldset class="portal-role-fieldset"><legend>Saya seorang</legend><div class="portal-role-options"><label><input type="radio" name="role" value="student" checked><span>${icon('user')}<b>Pelajar</b><small>Sertai kelas dan main</small></span></label><label><input type="radio" name="role" value="teacher"><span>${icon('bulb')}<b>Guru</b><small>Urus kelas dan bilik</small></span></label></div></fieldset>${field('portal-display-name', 'Nama paparan', {name: 'display_name', autocomplete: 'nickname', min: 2, max: 60, help: '2–60 aksara. Contoh: nama yang digunakan di kelas.'})}`;
      if (!emailRequest && !reset) fields += field('portal-username', mode === 'login' ? 'Email atau nama pengguna' : 'Nama pengguna', {name: 'username', autocomplete: 'username', max: mode === 'login' ? 254 : 24, help: mode === 'login' ? 'Nama pengguna tidak membezakan huruf besar dan kecil.' : '3–24 aksara: huruf a–z, nombor atau garis bawah (_). Huruf besar ditukar kepada huruf kecil.', placeholder: mode === 'login' ? 'nama@contoh.com atau nama_pengguna' : 'nama_pengguna'});
      if (signup || emailRequest) fields += field('portal-email', 'Email', {name: 'email', type: 'email', autocomplete: 'email', inputmode: 'email', max: 254, value: emailRequest ? authEmail : '', placeholder: 'nama@contoh.com', help: signup ? 'Pautan pengesahan akaun dan pemulihan kata laluan menggunakan email ini.' : 'Gunakan email yang didaftarkan untuk akaun anda.'});
      if (legacy) fields += field('portal-recovery-code', 'Kod pemulihan', {name: 'recovery_code', type: 'password', password: true, secretLabel: 'kod pemulihan', max: 32, autocomplete: 'off', help: 'Kod 32 aksara yang diberi semasa pendaftaran akaun lama.'});
      if (!emailRequest) fields += field('portal-password', reset || legacy ? 'Kata laluan baharu' : 'Kata laluan', {name: 'password', type: 'password', autocomplete: signup || legacy || reset ? 'new-password' : 'current-password', min: signup || legacy || reset ? 10 : '', max: 128, password: true, help: signup || legacy || reset ? 'Gunakan 10–128 aksara. Anda boleh menampal kata laluan.' : ''});
      if (reset) fields += field('portal-password-confirm', 'Sahkan kata laluan baharu', {name: 'password_confirm', type: 'password', autocomplete: 'new-password', min: 10, max: 128, password: true, secretLabel: 'pengesahan kata laluan', help: 'Masukkan semula kata laluan baharu yang sama.'});
      const submitLabel = reset || legacy ? 'Simpan kata laluan baharu' : signup ? 'Daftar akaun' : mode === 'recover-email' ? 'Hantar pautan pemulihan' : mode === 'resend-confirmation' ? 'Hantar pautan pengesahan' : 'Log masuk';
      body = `<form data-portal-form="${mode}" novalidate ${!available ? 'inert' : ''}>${fields}${formError()}<div class="portal-auth-submit">${submit(submitLabel)}</div></form>`;
      if (mode === 'login') body += `<div class="portal-auth-links">${modeLink('Terlupa kata laluan?', 'recover-email')}${modeLink('Belum sahkan email?', 'resend-confirmation', true)}</div>`;
      else if (mode === 'recover-email') body += `${modeLink('Kembali ke log masuk', 'login')}<div>${modeLink('Akaun lama tanpa email?', 'recover', true)}</div>`;
      else if (legacy) body += modeLink('Kembali ke pemulihan email', 'recover-email');
      else if (!reset) body += modeLink('Kembali ke log masuk', 'login');
    }
    const note = legacy ? 'Kod pemulihan hanya untuk akaun lama tanpa email. Jangan kongsi kata laluan atau kod anda.' : 'Jangan kongsi kata laluan atau pautan pengesahan dan pemulihan akaun anda.';
    return `<div class="portal-auth-layout"><div class="portal-auth-intro"><div class="eyebrow"><span class="tiny-cube"></span> BELAJAR BERSAMA</div><h1 id="portal-title" tabindex="-1">Satu kelas.<br><span>Banyak penemuan.</span></h1><p>Guru sediakan bilik. Pelajar padankan bongkah dan bentangan. Lihat kemajuan kelas semasa permainan berlangsung.</p>${geometryKit()}<div class="portal-auth-facts"><span>${icon('user')} Akaun guru &amp; pelajar</span><span>${icon('lock')} Sertai melalui PIN</span><span>${icon('trophy')} Skor kelas secara langsung</span></div></div><section class="portal-panel portal-auth-card" aria-labelledby="portal-auth-title">${!reset ? `<div class="portal-auth-modes" role="group" aria-label="Pilihan akaun"><button type="button" data-portal-action="auth-mode" data-mode="login" aria-pressed="${mode === 'login'}" data-block-while-busy data-base-disabled="false">Log masuk</button><button type="button" data-portal-action="auth-mode" data-mode="signup" aria-pressed="${signup}" data-block-while-busy data-base-disabled="false">Daftar akaun</button></div>` : ''}<p class="card-kicker">${details[0]}</p><h2 id="portal-auth-title" tabindex="-1">${details[1]}</h2><p class="portal-muted">${details[2]}</p>${invalidLink ? `<div class="portal-inline-warning" role="alert"><b>Pautan belum dapat digunakan.</b><p>${esc(invalidLink)}</p><p>Minta pautan baharu melalui email atau kembali ke log masuk.</p>${mode !== 'recover-email' ? modeLink('Minta pautan pemulihan baharu', 'recover-email') : ''}</div>` : ''}${!available ? '<div class="portal-inline-info"><b>Akaun dalam talian belum tersedia.</b><p>Anda masih boleh kembali ke mula dan bermain tanpa akaun.</p></div>' : ''}${body}<p class="portal-account-note">${icon('lock')} ${note}</p></section></div>`;
  }

  function renderRecovery() {
    document.title = 'Simpan kod pemulihan — GeoDecoder Digital';
    return `<section class="portal-panel portal-recovery-card"><div class="portal-recovery-symbol">${icon('lock')}</div><p class="card-kicker">AKAUN ANDA SUDAH SEDIA</p><h1 id="portal-title" tabindex="-1">Simpan kod pemulihan</h1><p>Kod ini hanya ditunjukkan sekarang. Gunakannya untuk menetapkan semula kata laluan akaun <b>@${esc(recoveryUsername)}</b>.</p><label for="portal-saved-code">Kod pemulihan peribadi</label><div class="portal-code-copy"><input id="portal-saved-code" value="${esc(recoveryCode)}" readonly autocomplete="off" spellcheck="false">${button('Salin kod', 'copy-recovery')}</div><p class="portal-inline-warning">Simpan di tempat selamat sebelum meneruskan. Jangan beri kod ini kepada guru, rakan atau orang lain.</p>${button('Saya sudah simpan, teruskan', 'recovery-done', {primary: true, symbol: 'arrow'})}</section>`;
  }

  function accountHeading(eyebrow, title, description) {
    return `<header class="portal-page-heading"><div><p class="card-kicker">${eyebrow}</p><h1 id="portal-title" tabindex="-1">${title}</h1><p>${description}</p></div><div class="portal-account-chip"><span class="portal-avatar">${esc(initial(profile?.display_name))}</span><div><b>${esc(profile?.display_name)}</b><small>@${esc(profile?.username)} · ${isTeacher() ? 'Guru' : 'Pelajar'}</small></div>${button('Log keluar', 'logout', {quiet: true})}</div></header>`;
  }

  function freshness() {
    const text = roomId && isTeacher() ? connection === 'live' ? 'Masa nyata disambungkan' : connection === 'connecting' ? 'Menyambung kemas kini masa nyata…' : 'Disegar setiap 15 saat' : 'Disegar setiap 15 saat';
    return `<div class="portal-freshness"><span class="portal-live-state ${connection === 'live' && roomId ? 'is-live' : ''}" id="portal-connection"><i aria-hidden="true"></i><span>${text}</span></span><span id="portal-last-updated">${lastUpdated ? `Dikemas kini ${timeFormat.format(lastUpdated)} MYT` : 'Belum dikemas kini'}</span>${button('Muat semula', 'refresh', {quiet: true, symbol: 'refresh'})}</div>`;
  }

  function pinPanel(owner, kind) {
    if (!owner || kind === 'room' && owner.status === 'closed') return '';
    if (!owner.pin) return `<div class="portal-pin-panel"><div><span class="portal-small-label">PIN ${kind === 'class' ? 'KELAS' : 'BILIK'}</span><p>Tiada PIN aktif. Jana PIN baharu untuk menjemput pelajar.</p></div><div class="portal-pin-actions">${button('PIN baharu', 'rotate-pin', {id: owner.id, symbol: 'refresh', extra: `data-kind="${kind}"`})}</div><p>PIN baharu sah selama 24 jam.</p></div>`;
    const expiresAt = stamp(owner.pin_expires_at);
    const expired = expiresAt !== null && expiresAt <= now();
    return `<div class="portal-pin-panel"><div><span class="portal-small-label">PIN ${kind === 'class' ? 'KELAS' : 'BILIK'}</span><input class="portal-pin" id="portal-pin-${kind}" value="${esc(owner.pin)}" aria-label="PIN ${kind === 'class' ? 'kelas' : 'bilik'}" readonly autocomplete="off" spellcheck="false"><small>${owner.pin_expires_at ? `Sah hingga ${esc(dateText(owner.pin_expires_at))} MYT` : 'Kongsi PIN ini kepada pelajar anda.'}</small></div><div class="portal-pin-actions">${button('Salin PIN', 'copy-pin', {id: owner.id, disabled: expired, extra: `data-kind="${kind}"`})}${button('PIN baharu', 'rotate-pin', {id: owner.id, quiet: true, symbol: 'refresh', extra: `data-kind="${kind}"`})}</div><p>${expired ? 'PIN ini sudah tamat. Tekan PIN baharu untuk menjemput pelajar.' : 'PIN baharu menggantikan PIN lama. PIN sah selama 24 jam.'}</p></div>`;
  }

  function renderClassList(classes) {
    return `<aside class="portal-class-sidebar portal-panel"><div class="portal-panel-title"><h2>Kelas saya</h2><span class="portal-count">${classes.length}</span></div><div class="portal-class-list">${classes.length ? classes.map(item => `<button type="button" class="portal-class-choice ${String(item.id) === String(classId) ? 'is-selected' : ''}" data-portal-action="select-class" data-id="${esc(item.id)}" aria-pressed="${String(item.id) === String(classId)}" data-block-while-busy data-base-disabled="false"><span class="portal-class-icon">${icon('user')}</span><span><b>${esc(item.name)}</b><small>${list(item.members).length} pelajar</small></span>${icon('chevron')}</button>`).join('') : '<p class="portal-empty-note">Belum ada kelas. Cipta kelas pertama anda di bawah.</p>'}</div><form data-portal-form="create-class" novalidate><h3>Cipta kelas</h3>${field('portal-class-name', 'Nama kelas', {name: 'name', max: 80, placeholder: 'Contoh: 1 Bestari', help: 'Gunakan nama yang dikenali pelajar.'})}${formError()}${submit('Cipta kelas', false)}</form></aside>`;
  }

  function pager(total, page, size, target) {
    if (!total) return '';
    const pages = Math.max(1, Math.ceil(total / size));
    const start = (page - 1) * size + 1;
    return `<div class="portal-pagination"><span>${start}–${Math.min(page * size, total)} daripada ${total}</span>${pages > 1 ? `<div>${button('Sebelum', 'page', {disabled: page <= 1, extra: `data-target="${target}" data-page="${page - 1}"`})}<span class="portal-page-number" aria-label="Halaman ${page} daripada ${pages}">${page} / ${pages}</span>${button('Seterusnya', 'page', {disabled: page >= pages, extra: `data-target="${target}" data-page="${page + 1}"`})}</div>` : ''}</div>`;
  }

  function renderRoster(item) {
    const members = list(item.members);
    const query = rosterQuery.toLocaleLowerCase('ms-MY');
    const filtered = members.filter(member => `${member.display_name || ''} ${member.username || ''}`.toLocaleLowerCase('ms-MY').includes(query));
    rosterPage = Math.min(rosterPage, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
    return `<section class="portal-panel portal-roster-panel" aria-labelledby="portal-roster-title"><div class="portal-panel-title"><div><h2 id="portal-roster-title">Pelajar dalam kelas</h2><p><span data-online-count>${members.filter(member => online(member.last_seen)).length}</span> aktif sekarang daripada ${members.length} pelajar</p></div><div class="portal-search"><label class="sr-only" for="portal-roster-search">Cari nama atau nama pengguna</label><input id="portal-roster-search" type="search" autocomplete="off" placeholder="Cari pelajar" value="${esc(rosterQuery)}"><button type="button" data-portal-action="clear-search" aria-label="Kosongkan carian pelajar" ${rosterQuery ? '' : 'hidden'}>${icon('close')}</button></div></div><div class="portal-table-scroll" tabindex="0" role="region" aria-label="Senarai pelajar, leret untuk melihat semua lajur"><table class="portal-table"><caption class="sr-only">Senarai pelajar bagi kelas ${esc(item.name)}</caption><thead><tr><th scope="col">Pelajar</th><th scope="col">Kehadiran</th><th scope="col">Terakhir aktif (MYT)</th></tr></thead><tbody>${filtered.length ? filtered.slice((rosterPage - 1) * PAGE_SIZE, rosterPage * PAGE_SIZE).map(member => `<tr><th scope="row"><span class="portal-table-person"><span class="portal-avatar portal-avatar-small">${esc(initial(member.display_name))}</span><span><b>${esc(member.display_name)}</b><small>@${esc(member.username)}</small></span></span></th><td>${presence(member.last_seen)}</td><td class="portal-muted">${esc(dateText(member.last_seen))}</td></tr>`).join('') : `<tr><td colspan="3" class="portal-empty-cell">${query ? 'Tiada pelajar sepadan. Cuba nama atau nama pengguna lain.' : 'Belum ada pelajar. Kongsi PIN kelas atau jemput menggunakan nama pengguna.'}</td></tr>`}</tbody></table></div>${pager(filtered.length, rosterPage, PAGE_SIZE, 'roster')}<p class="portal-table-note">“Aktif sekarang” bermaksud akaun dikesan dalam 45 saat terakhir.</p></section>`;
  }

  function renderRoomCards(rooms, teacher) {
    roomPage = Math.min(roomPage, Math.max(1, Math.ceil(rooms.length / ROOM_PAGE_SIZE)));
    return `${rooms.length ? `<div class="portal-room-grid">${rooms.slice((roomPage - 1) * ROOM_PAGE_SIZE, roomPage * ROOM_PAGE_SIZE).map(room => `<article class="portal-room-card"><div class="portal-room-card-top"><span class="portal-room-symbol">${icon('trophy')}</span>${badge(room.status)}</div><h3>${esc(room.name)}</h3><p>${esc(room.class_name || currentClass()?.name || '')}</p><div class="portal-room-card-bottom"><span>${number(room.members_count)} pelajar</span>${button(teacher ? 'Pantau bilik' : room.status === 'closed' ? 'Lihat keputusan' : 'Masuk bilik', teacher || room.status === 'closed' ? 'view-room' : 'join-room', {id: room.id, symbol: 'arrow', disabled: !teacher && room.status === 'closed' && room.is_member !== true})}${!teacher && room.status === 'closed' && room.is_member !== true ? '<small>Anda tidak menyertai bilik ini.</small>' : ''}</div></article>`).join('')}</div>` : '<div class="portal-empty-state"><span class="portal-empty-art" aria-hidden="true">' + shapeArt('pyramid', 'solid', true, 'violet') + '</span><h3>Belum ada bilik permainan</h3><p>' + (teacher ? 'Cipta bilik untuk melihat kemajuan pelajar bersama-sama.' : 'Bilik daripada guru anda akan muncul di sini.') + '</p></div>'}${pager(rooms.length, roomPage, ROOM_PAGE_SIZE, 'rooms')}`;
  }

  function renderTeacher() {
    document.title = 'Ruang guru — GeoDecoder Digital';
    const classes = list(snapshot?.classes);
    if (!currentClass()) classId = classes[0]?.id || null;
    const selected = currentClass();
    const rooms = list(snapshot?.rooms).filter(room => !selected || String(room.class_id) === String(selected.id));
    return `${accountHeading('RUANG GURU', 'Kelas anda, belajar bersama.', 'Urus pelajar, kongsi PIN dan pantau permainan kelas.')}${freshness()}<div class="portal-teacher-layout">${renderClassList(classes)}<div class="portal-class-main">${selected ? `<section class="portal-panel portal-class-overview"><div class="portal-panel-title"><div><p class="card-kicker">KELAS DIPILIH</p><h2>${esc(selected.name)}</h2><p>${list(selected.members).length} pelajar berdaftar</p></div><span class="portal-class-geometry" aria-hidden="true">${shapeArt('cuboid', 'solid', true, 'orange')}</span></div>${pinPanel(selected, 'class')}<form data-portal-form="invite" novalidate class="portal-inline-form"><div><h3>Jemput pelajar</h3><p>Masukkan nama pengguna tepat. Pelajar perlu menerima jemputan dalam akaunnya.</p></div><div class="portal-inline-form-fields">${field('portal-invite-username', 'Nama pengguna pelajar', {name: 'username', max: 24, placeholder: 'nama_pengguna', help: 'Huruf besar ditukar kepada huruf kecil. Gunakan username berdaftar pelajar.'})}${submit('Hantar jemputan', false)}</div>${formError()}</form></section>${renderRoster(selected)}<section class="portal-panel" aria-labelledby="portal-rooms-title"><div class="portal-panel-title"><div><h2 id="portal-rooms-title">Bilik permainan</h2><p>Setiap bilik mempunyai PIN dan papan skor sendiri.</p></div><span class="portal-count">${rooms.length}</span></div><form data-portal-form="create-room" novalidate class="portal-room-form"><div class="portal-inline-form-fields">${field('portal-room-name', 'Nama bilik', {name: 'name', max: 80, placeholder: 'Contoh: Latihan bongkah', help: 'Pelajar akan melihat nama ini.'})}${submit('Cipta bilik')}</div>${formError()}</form>${renderRoomCards(rooms, true)}</section>` : '<section class="portal-panel portal-first-class"><div class="portal-empty-state">' + geometryKit() + '<h2>Sediakan kelas pertama anda</h2><p>Masukkan nama kelas di sebelah. Kemudian kongsi PIN atau jemput pelajar menggunakan nama pengguna.</p></div></section>'}</div></div>`;
  }

  function renderStudent() {
    document.title = 'Ruang pelajar — GeoDecoder Digital';
    const classes = list(snapshot?.classes);
    const invites = list(snapshot?.invites);
    const rooms = list(snapshot?.rooms);
    return `${accountHeading('RUANG PELAJAR', 'Jom temui padanannya.', 'Sertai kelas anda dan tunggu guru memulakan permainan.')}${freshness()}<div class="portal-student-top"><section class="portal-panel portal-join-panel"><div><p class="card-kicker">ADA PIN DARIPADA GURU?</p><h2>Sertai kelas atau bilik</h2><p>Masukkan enam digit PIN yang diberi oleh guru.</p></div><form data-portal-form="join-pin" novalidate>${field('portal-join-pin', 'PIN enam digit', {name: 'pin', max: 6, inputmode: 'numeric', placeholder: '000000', help: 'PIN kelas menambah anda ke kelas. PIN bilik membuka bilik permainan.'})}${formError()}${submit('Sertai dengan PIN')}</form></section><section class="portal-panel portal-student-classes"><div class="portal-panel-title"><h2>Kelas saya</h2><span class="portal-count">${classes.length}</span></div>${classes.length ? `<ul>${classes.map(item => `<li><span class="portal-class-icon">${icon('user')}</span><span><b>${esc(item.name)}</b><small>Anda ahli kelas ini</small></span>${icon('check')}</li>`).join('')}</ul>` : '<p class="portal-empty-note">Kelas anda akan muncul selepas menyertai melalui PIN atau menerima jemputan.</p>'}</section></div>${invites.length ? `<section class="portal-panel portal-invites"><div class="portal-panel-title"><div><h2>Jemputan kelas</h2><p>Semak nama guru dan kelas sebelum menerima.</p></div><span class="portal-count">${invites.length}</span></div><ul>${invites.map(invite => `<li><span class="portal-invite-symbol">${icon('user')}</span><div><b>${esc(invite.class_name)}</b><p>Daripada ${esc(invite.teacher_name)}</p></div>${button('Terima jemputan', 'accept-invite', {id: invite.id, primary: true, symbol: 'check'})}</li>`).join('')}</ul></section>` : ''}<section class="portal-panel" aria-labelledby="portal-rooms-title"><div class="portal-panel-title"><div><h2 id="portal-rooms-title">Bilik permainan kelas</h2><p>Masuk ke bilik untuk melihat status dan papan skor.</p></div><span class="portal-count">${rooms.length}</span></div>${renderRoomCards(rooms, false)}</section>`;
  }

  function elapsed(player) {
    const start = stamp(player.timer_started_at);
    return number(player.elapsed_ms) + (player.status === 'playing' && start !== null ? Math.max(0, now() - start) : 0);
  }

  function renderLeaderboard(room) {
    const players = list(room.players).slice().sort((a, b) => Number(hasAttempt(b)) - Number(hasAttempt(a)) || number(b.score) - number(a.score) || elapsed(a) - elapsed(b) || String(a.username || '').localeCompare(String(b.username || ''), 'ms-MY'));
    const started = players.filter(hasAttempt);
    const finished = players.filter(player => player.status === 'finished');
    boardPage = Math.min(boardPage, Math.max(1, Math.ceil(players.length / PAGE_SIZE)));
    let rank = (boardPage - 1) * PAGE_SIZE;
    return `<section class="portal-panel portal-live-board" aria-labelledby="portal-board-title"><div class="portal-panel-title"><div><p class="card-kicker">${room.status === 'closed' ? 'KEPUTUSAN BILIK' : 'KEMAJUAN BILIK'}</p><h2 id="portal-board-title">${room.status === 'closed' ? 'Papan skor akhir' : isTeacher() ? 'Papan skor langsung' : 'Papan skor bilik'}</h2><p>Markah tertinggi dahulu, kemudian masa menjawab paling singkat.</p></div><div class="portal-board-counts"><span><b>${players.length}</b> dalam bilik</span><span><b>${started.length}</b> sudah mula</span><span><b>${finished.length}</b> selesai</span></div></div><div class="portal-table-scroll" tabindex="0" role="region" aria-label="Papan skor, leret untuk melihat semua lajur"><table class="portal-table portal-score-table"><caption class="sr-only">Markah dan masa menjawab bagi bilik ${esc(room.name)}</caption><thead><tr><th scope="col">Kedudukan</th><th scope="col">Pelajar</th><th scope="col">Status</th><th scope="col">Soalan</th><th scope="col">${room.status === 'closed' ? 'Markah akhir' : 'Markah semasa / akhir'}</th><th scope="col">Masa menjawab</th></tr></thead><tbody>${players.length ? players.slice((boardPage - 1) * PAGE_SIZE, boardPage * PAGE_SIZE).map(player => {
      rank += 1;
      const attempted = hasAttempt(player);
      const mine = String(player.user_id || player.id) === String(profile?.id);
      const total = number(player.total, 10) || 10;
      const current = player.status === 'finished' ? total : Math.min(total, number(player.question_index) + (player.status === 'playing' || player.status === 'review' ? 1 : 0));
      return `<tr class="${mine ? 'portal-is-me' : ''}"><td><span class="portal-rank ${attempted && rank <= 3 ? 'portal-rank-top' : ''}">${attempted ? rank : '—'}</span></td><th scope="row"><span class="portal-table-name"><b>${esc(player.display_name)}${mine ? ' <span class="portal-you">Anda</span>' : ''}</b><small>@${esc(player.username)}</small></span></th><td><span class="portal-player-status portal-player-status-${esc(player.status)}">${playerLabel(player.status)}</span>${presence(player.last_seen)}</td><td class="portal-number">${attempted ? `${current}/${total}` : '—'}</td><td><span class="portal-score-value">${attempted ? `${number(player.score)}<small>/${total}</small>` : '—'}</span>${attempted ? `<small class="portal-score-kind">${player.status === 'finished' || room.status === 'closed' ? 'Akhir' : 'Semasa'}</small>` : '<small class="portal-score-kind">Belum menjawab</small>'}</td><td><span class="portal-number" ${attempted ? `data-elapsed="${number(player.elapsed_ms)}" data-timer-start="${esc(player.timer_started_at || '')}" data-player-status="${esc(player.status)}"` : ''}>${attempted ? formatTime(elapsed(player)) : '—'}</span></td></tr>`;
    }).join('') : '<tr><td colspan="6" class="portal-empty-cell">Belum ada pelajar dalam bilik. Kongsi PIN bilik atau minta pelajar masuk melalui akaun kelas.</td></tr>'}</tbody></table></div>${pager(players.length, boardPage, PAGE_SIZE, 'board')}<p class="portal-table-note">Masa menjawab mengira masa membuat pilihan sahaja. Masa menunggu mula dan semakan jawapan tidak dikira. Kehadiran: aktif dalam 45 saat terakhir.</p></section>`;
  }

  function renderRoom() {
    const room = currentRoom();
    if (!room && roomError) return `<section class="portal-panel portal-load-error"><h1 id="portal-title" tabindex="-1">Bilik belum dapat dibuka</h1><p>${esc(roomError)}</p><div>${button('Muat semula', 'refresh', {primary: true, symbol: 'refresh'})}${button('Kembali ke kelas', 'dashboard', {symbol: 'home'})}</div></section>`;
    if (!room) return `${accountHeading(isTeacher() ? 'RUANG GURU' : 'RUANG PELAJAR', 'Membuka bilik…', 'Sedang mendapatkan maklumat bilik.')}${button('Kembali ke kelas', 'dashboard', {symbol: 'home'})}<div class="portal-panel portal-loading" aria-busy="true"><span class="portal-spinner" aria-hidden="true"></span><p>Memuatkan bilik permainan…</p></div>`;
    document.title = `${room.name} — GeoDecoder Digital`;
    const attempt = room.my_attempt;
    const finished = attempt?.status === 'finished';
    return `<div class="portal-room-navigation">${button('Kembali ke kelas', 'dashboard', {quiet: true, symbol: 'home'})}<span>${esc(room.class_name)}</span></div><header class="portal-room-heading"><div><p class="card-kicker">BILIK PERMAINAN</p><h1 id="portal-title" tabindex="-1">${esc(room.name)}</h1><p>${esc(room.class_name)}</p></div>${badge(room.status)}</header>${freshness()}<section class="portal-panel portal-room-controls">${isTeacher() ? `${pinPanel(room, 'room')}<div class="portal-room-action-row"><div><h2>${room.status === 'open' ? 'Semua sudah bersedia?' : room.status === 'playing' ? 'Permainan sedang berlangsung' : 'Bilik sudah ditutup'}</h2><p>${room.status === 'open' ? 'Pelajar boleh masuk dahulu. Tekan mula apabila kelas sudah bersedia.' : room.status === 'playing' ? 'Pantau markah dan masa menjawab dalam papan skor di bawah.' : 'Markah akhir kekal dipaparkan. Bilik yang ditutup tidak boleh dimulakan semula.'}</p></div><div class="portal-control-buttons">${room.status === 'open' ? button('Mulakan permainan', 'start-room', {id: room.id, primary: true, symbol: 'arrow'}) : ''}${room.status !== 'closed' ? button('Tutup bilik', 'request-close-room', {id: room.id, quiet: true, symbol: 'close'}) : ''}</div></div>${closeConfirmation && room.status !== 'closed' ? `<div class="portal-close-confirmation" role="group" aria-labelledby="portal-close-title"><div><h3 id="portal-close-title">Tutup bilik “${esc(room.name)}”?</h3><p>Pelajar tidak boleh meneruskan atau memulakan permainan dalam bilik ini. Markah yang sudah direkodkan kekal. Bilik tidak boleh dibuka semula.</p></div><div>${button('Kekalkan bilik', 'cancel-close-room')}${button('Ya, tutup bilik', 'close-room', {id: room.id, danger: true})}</div></div>` : ''}` : `<div class="portal-student-play"><span class="portal-room-play-art" aria-hidden="true">${shapeArt('cone', 'solid', true, 'orange')}</span><div><h2>${finished ? 'Permainan anda sudah selesai' : room.status === 'closed' ? 'Bilik ini sudah ditutup' : room.status === 'open' ? 'Anda sudah berada dalam bilik' : attempt ? 'Sambung penemuan anda' : 'Permainan sudah bermula'}</h2><p>${finished ? 'Lihat keputusan dan semakan jawapan anda, atau bandingkan kemajuan dalam papan skor.' : room.status === 'closed' ? 'Lihat markah akhir dalam papan skor di bawah.' : room.status === 'open' ? 'Tunggu guru memulakan permainan. Status akan dikemas kini di sini.' : 'Selesaikan 10 soalan dengan memadankan bongkah di R1 dan bentangan di R2.'}</p></div>${finished ? button('Lihat keputusan saya', 'play-result', {primary: true, symbol: 'trophy'}) : room.status === 'playing' && attempt?.status !== 'closed' ? button(attempt ? 'Sambung permainan' : 'Mula bermain', 'play', {id: room.id, primary: true, symbol: 'arrow'}) : `<span class="portal-waiting-label">${icon(room.status === 'closed' ? 'lock' : 'clock')}${room.status === 'closed' ? 'Permainan ditamatkan' : 'Menunggu guru'}</span>`}</div>`}</section>${renderLeaderboard(room)}`;
  }

  function captureEdits() {
    const fields = new Map();
    for (const input of content.querySelectorAll('input[id]')) {
      if (!['password', 'hidden'].includes(input.type) && !input.classList.contains('portal-password') && !input.readOnly) fields.set(input.id, {value: input.value, checked: input.checked});
    }
    const focused = document.activeElement;
    const focus = content.contains(focused) ? {id: focused.id, action: focused.dataset?.portalAction, keys: Object.fromEntries(['portalAction', 'id', 'target', 'page', 'mode', 'kind', 'input'].map(key => [key, focused.dataset?.[key]])), form: focused.closest?.('form[data-portal-form]')?.dataset.portalForm, type: focused.type, start: focused.selectionStart, end: focused.selectionEnd} : null;
    return {fields, focus};
  }

  function render({focus = false, preserve = true} = {}) {
    if (!active || destroyed) return;
    if (composing && preserve && !focus) { renderDeferred = true; return; }
    renderDeferred = false;
    const saved = preserve ? captureEdits() : null;
    if (initializing) content.innerHTML = '<div class="portal-panel portal-loading" aria-busy="true"><span class="portal-spinner" aria-hidden="true"></span><h1 id="portal-title" tabindex="-1">Membuka akaun…</h1></div>';
    else if (cloud.recoveryRequired === true || callbackError()) content.innerHTML = renderAuth();
    else if (recoveryCode) content.innerHTML = renderRecovery();
    else if (authOnly || !signedIn()) content.innerHTML = renderAuth();
    else if (!snapshot || !profile) content.innerHTML = '<div class="portal-panel portal-loading" aria-busy="true"><span class="portal-spinner" aria-hidden="true"></span><h1 id="portal-title" tabindex="-1">Memuatkan ruang kelas…</h1><p>Sedang mendapatkan kelas dan permainan anda.</p></div>';
    else content.innerHTML = roomId ? renderRoom() : isTeacher() ? renderTeacher() : renderStudent();
    if (saved && !focus) {
      for (const [id, value] of saved.fields) {
        const input = document.getElementById(id);
        if (!input || !content.contains(input)) continue;
        input.value = value.value;
        if (['checkbox', 'radio'].includes(input.type)) input.checked = value.checked;
      }
      let target = saved.focus?.id ? document.getElementById(saved.focus.id) : null;
      if (!target && saved.focus?.action) target = [...content.querySelectorAll('[data-portal-action]')].find(item => Object.entries(saved.focus.keys).every(([key, value]) => item.dataset[key] === value));
      if (!target && saved.focus?.form && saved.focus.type === 'submit') target = [...content.querySelectorAll('form[data-portal-form]')].find(form => form.dataset.portalForm === saved.focus.form)?.querySelector('[type="submit"]');
      if (target && content.contains(target) && !target.disabled) {
        target.focus({preventScroll: true});
        if (saved.focus.start !== null && saved.focus.start !== undefined && typeof target.setSelectionRange === 'function' && ['text', 'search', 'password', 'tel', 'url'].includes(target.type)) target.setSelectionRange(saved.focus.start, saved.focus.end);
      }
    }
    updateBusy();
    if (focus) (content.querySelector('#portal-auth-title') || content.querySelector('#portal-title'))?.focus({preventScroll: true});
  }

  function updateEmailCooldown() {
    const remaining = emailCooldownSeconds();
    for (const control of screen.querySelectorAll('[data-email-cooldown]')) {
      control.disabled = Boolean(pending) || control.dataset.baseDisabled === 'true' || remaining > 0;
      const label = control.querySelector('span');
      if (label) label.textContent = remaining ? `Hantar semula (${remaining}s)` : 'Hantar pautan semula';
    }
    if (!remaining || !active || destroyed) { clearInterval(emailCooldownTimer); emailCooldownTimer = null; }
  }

  function startEmailCooldown() {
    emailCooldownUntil = Date.now() + 60000;
    clearInterval(emailCooldownTimer);
    emailCooldownTimer = setInterval(updateEmailCooldown, 1000);
  }

  function updateBusy() {
    for (const control of screen.querySelectorAll('[data-block-while-busy]')) control.disabled = Boolean(pending) || control.dataset.baseDisabled === 'true';
    for (const form of screen.querySelectorAll('form')) {
      const busy = pending === form.dataset.portalForm;
      form.setAttribute('aria-busy', String(busy));
      const submitButton = form.querySelector('[type="submit"]');
      if (submitButton) submitButton.setAttribute('aria-busy', String(busy));
    }
    for (const control of screen.querySelectorAll('[data-portal-action]')) if (control.dataset.portalAction === pending) control.setAttribute('aria-busy', 'true'); else control.removeAttribute('aria-busy');
    updateEmailCooldown();
  }

  function updateLiveLabels() {
    if (!active) return;
    const onlineCount = content.querySelector('[data-online-count]');
    if (onlineCount) onlineCount.textContent = String(list(currentClass()?.members).filter(member => online(member.last_seen)).length);
    for (const node of content.querySelectorAll('[data-presence]')) {
      const present = online(node.dataset.presence);
      node.classList.toggle('is-online', present);
      node.querySelector('span').textContent = present ? 'Aktif sekarang' : 'Tidak aktif';
    }
    for (const node of content.querySelectorAll('[data-elapsed]')) node.textContent = formatTime(elapsed({elapsed_ms: node.dataset.elapsed, timer_started_at: node.dataset.timerStart, status: node.dataset.playerStatus}));
  }

  function stopWatch() {
    watchGeneration += 1;
    clearTimeout(watchTimeout);
    watchTimeout = null;
    try { watchStop?.(); } catch { /* Local cleanup is best-effort. */ }
    watchStop = null;
    watchingRoom = null;
    connection = 'idle';
  }

  function stopLive() {
    stopWatch();
    clearInterval(poll);
    clearInterval(tick);
    poll = null;
    tick = null;
  }

  function updateConnection() {
    const node = content.querySelector('#portal-connection');
    if (!node) return;
    node.classList.toggle('is-live', connection === 'live' && Boolean(roomId));
    node.querySelector('span').textContent = roomId && isTeacher() ? connection === 'live' ? 'Masa nyata disambungkan' : connection === 'connecting' ? 'Menyambung kemas kini masa nyata…' : 'Disegar setiap 15 saat' : 'Disegar setiap 15 saat';
  }

  function startLive() {
    if (!active || !accountAvailable()) return;
    if (!poll) poll = setInterval(() => { if (!document.hidden && (!roomId || !isTeacher() || connection !== 'live')) refresh({silent: true}); }, POLL_MS);
    if (!tick) tick = setInterval(updateLiveLabels, 1000);
    if (!roomId || !isTeacher()) { if (watchingRoom) stopWatch(); return; }
    if (String(watchingRoom) === String(roomId)) return;
    stopWatch();
    watchingRoom = roomId;
    const watched = roomId;
    const generation = watchGeneration;
    const identity = sessionKey();
    connection = 'connecting';
    watchTimeout = setTimeout(() => {
      if (active && generation === watchGeneration && identity === sessionKey() && String(watched) === String(roomId) && connection === 'connecting') {
        connection = 'polling';
        updateConnection();
      }
    }, 10000);
    try {
      if (typeof cloud.watch !== 'function') { connection = 'polling'; updateConnection(); return; }
      watchStop = cloud.watch(roomId, () => {
        if (active && generation === watchGeneration && identity === sessionKey() && String(watched) === String(roomId)) refresh({silent: true});
      }, value => {
        if (!active || generation !== watchGeneration || identity !== sessionKey() || String(watched) !== String(roomId)) return;
        const status = String(value?.status || value || '').toUpperCase();
        connection = status === 'SUBSCRIBED' ? 'live' : ['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED', 'ERROR', 'DISCONNECTED', 'UNAVAILABLE'].includes(status) ? 'polling' : 'connecting';
        if (connection !== 'connecting') { clearTimeout(watchTimeout); watchTimeout = null; }
        updateConnection();
        if (connection === 'polling') refresh({silent: true});
      });
      if (typeof watchStop !== 'function') { watchStop = null; connection = 'polling'; }
    } catch { connection = 'polling'; }
    updateConnection();
  }

  function applySnapshot(data) {
    if (!data || !data.profile) return false;
    snapshot = {...data, classes: list(data.classes), invites: list(data.invites), rooms: list(data.rooms)};
    profile = data.profile;
    const server = stamp(data.server_now);
    if (server !== null) { serverOffset = server - Date.now(); lastUpdated = server; }
    stale = false;
    roomError = '';
    if (classId && !snapshot.classes.some(item => String(item.id) === String(classId))) classId = null;
    return true;
  }

  async function refresh({silent = false} = {}) {
    if (!active || destroyed || !accountAvailable() || initializing) return;
    if (pending) { refreshAgain = true; return; }
    if (refreshPromise) { refreshAgain = true; return refreshPromise; }
    const token = epoch;
    const identity = sessionKey();
    const requestedRoom = roomId;
    if (!silent) screen.setAttribute('aria-busy', 'true');
    const task = Promise.resolve().then(async () => {
      try {
        const data = await cloud.rpc('snapshot', requestedRoom ? {room_id: requestedRoom} : {});
        if (!valid(token, identity) || String(requestedRoom || '') !== String(roomId || '')) return;
        const wasStale = stale;
        if (!applySnapshot(data)) throw new Error('Maklumat akaun belum lengkap. Muat semula untuk mencuba lagi.');
        if (notice.tone === 'error' && wasStale) announce('Sambungan berjaya dikemas kini.', 'success');
        render();
        startLive();
      } catch (error) {
        if (!valid(token, identity)) return;
        stale = true;
        if (requestedRoom && !currentRoom()) { roomError = errorText(error); render(); }
        announce(`${errorText(error)}${lastUpdated ? ' Data terakhir masih dipaparkan. Tekan Muat semula untuk mencuba lagi.' : ' Tekan Muat semula untuk mencuba lagi.'}`, 'error');
        if (!snapshot) content.innerHTML = `<section class="portal-panel portal-load-error"><h1 id="portal-title" tabindex="-1">Ruang kelas belum dapat dimuatkan</h1><p>Semak sambungan anda dan cuba semula. Anda masih boleh log keluar.</p><div>${button('Muat semula', 'refresh', {primary: true, symbol: 'refresh'})}${button('Log keluar', 'logout')}</div></section>`;
        updateBusy();
        report(error);
      } finally {
        if (refreshPromise === task) refreshPromise = null;
        if (active) screen.removeAttribute('aria-busy');
        if (refreshAgain && active && !destroyed) { refreshAgain = false; queueMicrotask(() => refresh({silent: true})); }
      }
    });
    refreshPromise = task;
    return task;
  }

  function clearAccount() {
    epoch += 1;
    operation += 1;
    pending = '';
    authPending = false;
    stopLive();
    snapshot = null;
    profile = null;
    roomId = null;
    cloud.setRoom?.(null);
    classId = null;
    recoveryCode = '';
    recoveryUsername = '';
    closeConfirmation = false;
    lastUpdated = null;
    serverOffset = 0;
    rosterQuery = '';
    rosterPage = boardPage = roomPage = 1;
    composing = false;
    renderDeferred = false;
    stale = false;
    roomError = '';
    refreshAgain = false;
  }

  function connectSession() {
    if (sessionStop || typeof cloud.onSessionChange !== 'function') return;
    sessionStop = cloud.onSessionChange(() => {
      if (!active || destroyed || authPending || initializing) return;
      const identity = sessionKey();
      const recovery = cloud.recoveryRequired === true;
      const linkError = String(cloud.callbackError || '');
      if (identity === knownSession && recovery === knownRecovery && linkError === knownCallbackError) return;
      knownSession = identity;
      knownRecovery = recovery;
      if (linkError !== knownCallbackError || recovery) callbackErrorDismissed = false;
      knownCallbackError = linkError;
      clearAccount();
      authMode = linkError && !recovery ? 'recover-email' : 'login';
      authOnly = recovery || Boolean(callbackError());
      announce(recovery || callbackError() || signedIn() ? '' : 'Anda telah log keluar. Log masuk untuk membuka kelas anda.');
      render({focus: true, preserve: false});
      if (accountAvailable()) refresh();
    });
  }

  function clearFormErrors(form) {
    for (const input of form.querySelectorAll('[aria-invalid]')) input.removeAttribute('aria-invalid');
    for (const node of form.querySelectorAll('[data-error-for], [data-form-error]')) node.textContent = '';
  }

  function validate(form, values, type) {
    const errors = {};
    const username = values.username?.trim().toLowerCase();
    const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (typeof values.username === 'string') {
      values.username = username;
      const input = form.elements.namedItem('username');
      if (input) input.value = username;
    }
    if (['signup', 'recover', 'invite'].includes(type) && !/^[a-z0-9_]{3,24}$/.test(username || '')) errors.username = 'Gunakan 3–24 aksara: huruf kecil, nombor atau garis bawah (_).';
    if (type === 'login' && !/^[a-z0-9_]{3,24}$/.test(username || '') && !validEmail(username)) errors.username = 'Masukkan email yang sah atau nama pengguna 3–24 aksara.';
    if (['signup', 'recover-email', 'resend-confirmation'].includes(type)) {
      values.email = String(values.email || '').trim().toLowerCase();
      const input = form.elements.namedItem('email');
      if (input) input.value = values.email;
      if (!validEmail(values.email)) errors.email = 'Masukkan alamat email yang sah, maksimum 254 aksara.';
    }
    if (type === 'signup' && (String(values.display_name || '').trim().length < 2 || String(values.display_name || '').trim().length > 60)) errors.display_name = 'Masukkan nama paparan antara 2 hingga 60 aksara.';
    if (['signup', 'recover', 'reset-password'].includes(type) && (String(values.password || '').length < 10 || String(values.password || '').length > 128)) errors.password = 'Gunakan kata laluan antara 10 hingga 128 aksara.';
    if (type === 'login' && !values.password) errors.password = 'Masukkan kata laluan anda.';
    if (type === 'login' && values.password?.length > 128) errors.password = 'Kata laluan mestilah maksimum 128 aksara.';
    if (type === 'reset-password') {
      if (String(values.password_confirm || '').length < 10 || String(values.password_confirm || '').length > 128) errors.password_confirm = 'Gunakan pengesahan kata laluan antara 10 hingga 128 aksara.';
      else if (values.password_confirm !== values.password) errors.password_confirm = 'Pengesahan kata laluan mesti sama dengan kata laluan baharu.';
    }
    if (type === 'recover' && !/^[a-fA-F0-9]{32}$/.test(String(values.recovery_code || '').trim())) errors.recovery_code = 'Masukkan kod pemulihan 32 aksara yang anda simpan.';
    if (type === 'join-pin' && !/^\d{6}$/.test(values.pin.trim())) errors.pin = 'Masukkan tepat enam digit PIN daripada guru.';
    if (['create-class', 'create-room'].includes(type) && (!values.name.trim() || values.name.trim().length > 80)) errors.name = 'Masukkan nama antara 1 hingga 80 aksara.';
    for (const [name, message] of Object.entries(errors)) {
      const input = form.elements.namedItem(name);
      input?.setAttribute?.('aria-invalid', 'true');
      const node = [...form.querySelectorAll('[data-error-for]')].find(item => item.dataset.errorFor === name);
      if (node) node.textContent = message;
    }
    if (Object.keys(errors).length) {
      form.querySelector('[data-form-error]').textContent = 'Semak ruangan yang ditandakan.';
      form.querySelector('[aria-invalid="true"]')?.focus();
      return false;
    }
    return true;
  }

  async function handleAuth(form, values, type) {
    if (type === 'reset-password' && cloud.recoveryRequired !== true) {
      authMode = 'recover-email';
      authOnly = true;
      announce('Minta pautan pemulihan yang baharu untuk menetapkan kata laluan.', 'error');
      render({focus: true, preserve: false});
      return;
    }
    if (cloud.recoveryRequired === true && type !== 'reset-password') return;
    const token = epoch;
    const job = ++operation;
    pending = form ? type : 'resend-email';
    authPending = true;
    updateBusy();
    announce('');
    const emailAction = ['recover-email', 'resend-confirmation'].includes(type);
    const payload = emailAction ? {email: values.email.trim()} : type === 'reset-password' ? {password: values.password} : {username: values.username.trim(), password: values.password};
    if (type === 'signup') Object.assign(payload, {display_name: values.display_name.trim(), role: values.role === 'teacher' ? 'teacher' : 'student', email: values.email.trim()});
    if (type === 'recover') payload.recovery_code = values.recovery_code.trim();
    try {
      const result = await cloud.auth(type, payload);
      if (!active || token !== epoch) return;
      if (emailAction) {
        authMode = type === 'resend-confirmation' ? 'confirmation' : 'email-sent';
        authOnly = true;
        authEmail = payload.email;
        callbackErrorDismissed = true;
        form?.reset();
        startEmailCooldown();
        render({focus: true, preserve: false});
        return;
      }
      clearAccount();
      knownSession = sessionKey();
      knownRecovery = cloud.recoveryRequired === true;
      knownCallbackError = String(cloud.callbackError || '');
      callbackErrorDismissed = true;
      form?.reset();
      if (type === 'signup' && result?.confirmation_required) {
        authMode = 'confirmation';
        authOnly = true;
        authEmail = String(result.email || payload.email);
        startEmailCooldown();
        render({focus: true, preserve: false});
        return;
      }
      authMode = 'login';
      authOnly = !signedIn() || type === 'reset-password';
      authEmail = '';
      clearInterval(emailCooldownTimer);
      emailCooldownTimer = null;
      emailCooldownUntil = 0;
      profile = result?.profile || cloud.session?.profile || null;
      recoveryCode = result?.recovery_code || '';
      recoveryUsername = payload.username || '';
      if (type === 'reset-password' || type === 'recover' && !signedIn()) announce('Kata laluan telah ditetapkan. Log masuk menggunakan kata laluan baharu.', 'success');
      else if (!signedIn()) announce(type === 'signup' ? 'Akaun sudah didaftarkan. Log masuk untuk meneruskan.' : 'Log masuk belum dapat disahkan. Cuba semula.', type === 'signup' ? 'success' : 'error');
      else announce(recoveryCode || cloud.recoveryRequired ? '' : 'Anda telah log masuk.', 'success');
      render({focus: true, preserve: false});
      if (accountAvailable()) await refresh();
    } catch (error) {
      if (!active || token !== epoch) return;
      const message = form?.isConnected !== false ? form?.querySelector('[data-form-error]') : null;
      if (message) {
        message.textContent = errorText(error);
        message.setAttribute('tabindex', '-1');
        message.focus({preventScroll: true});
      } else announce(errorText(error), 'error');
    } finally {
      if (job === operation) { authPending = false; pending = ''; }
      if (active) {
        updateBusy();
        if (refreshAgain && !pending) { refreshAgain = false; refresh({silent: true}); }
      }
    }
  }

  async function mutate(action, payload, {form = null, success = '', navigateRoom = false, navigateClass = false, play = false} = {}) {
    if (pending || !active) return;
    const token = ++epoch;
    const job = ++operation;
    const identity = sessionKey();
    pending = form?.dataset.portalForm || (action === 'set_room' ? payload.status === 'playing' ? 'start-room' : 'close-room' : ({start_attempt: 'play', rotate_pin: 'rotate-pin', join_room: 'join-room', accept_invite: 'accept-invite'})[action] || action);
    updateBusy();
    announce('');
    try {
      const result = await cloud.rpc(action, payload);
      if (!valid(token, identity)) return;
      if (play) {
        const state = result?.state || result;
        if (!state?.attemptId && !state?.attempt_id) throw new Error('Permainan belum dapat dibuka. Cuba semula.');
        close();
        onPlay(state);
        return;
      }
      form?.reset();
      if (navigateClass && result?.class_id) { classId = result.class_id; rosterPage = roomPage = 1; rosterQuery = ''; }
      const nextRoom = navigateRoom ? result?.room_id || result?.room?.id : null;
      if (nextRoom) { roomId = nextRoom; cloud.setRoom?.(roomId); boardPage = 1; closeConfirmation = false; epoch += 1; stopWatch(); }
      if (action === 'set_room') closeConfirmation = false;
      applySnapshot(result);
      announce(action === 'join_pin' ? nextRoom ? 'Anda telah masuk ke bilik permainan.' : 'Anda kini ahli kelas ini. Bilik daripada guru anda akan muncul di sini.' : success, 'success');
      render({focus: Boolean(nextRoom), preserve: !nextRoom});
      await refresh({silent: true});
      startLive();
    } catch (error) {
      if (!valid(token, identity)) return;
      if (form?.isConnected) {
        form.querySelector('[data-form-error]').textContent = errorText(error);
        form.querySelector('[data-form-error]').setAttribute('tabindex', '-1');
        form.querySelector('[data-form-error]').focus({preventScroll: true});
      } else announce(errorText(error), 'error');
      report(error);
    } finally {
      if (job === operation) pending = '';
      if (active) {
        updateBusy();
        if (refreshAgain && !pending) { refreshAgain = false; refresh({silent: true}); }
      }
    }
  }

  async function submitForm(event) {
    const form = event.target.closest('form[data-portal-form]');
    if (!form || !screen.contains(form)) return;
    event.preventDefault();
    if (pending || cloud.ready === false || event.isComposing || composing) return;
    const type = form.dataset.portalForm;
    const values = Object.fromEntries(new FormData(form));
    clearFormErrors(form);
    if (!validate(form, values, type)) return;
    if (['login', 'signup', 'recover', 'recover-email', 'resend-confirmation', 'reset-password'].includes(type)) return handleAuth(form, values, type);
    if (!accountAvailable()) return;
    if (type === 'create-class') return mutate('create_class', {name: values.name.trim()}, {form, success: 'Kelas berjaya dicipta. Kongsi PIN untuk menambah pelajar.', navigateClass: true});
    if (type === 'invite' && currentClass()) return mutate('invite', {class_id: classId, username: values.username.trim()}, {form, success: 'Jemputan telah dihantar. Pelajar perlu menerimanya dalam akaun sendiri.'});
    if (type === 'create-room' && currentClass()) return mutate('create_room', {class_id: classId, name: values.name.trim()}, {form, success: 'Bilik berjaya dicipta. Pelajar boleh masuk dengan PIN bilik.', navigateRoom: true});
    if (type === 'join-pin') return mutate('join_pin', {pin: values.pin.trim()}, {form, success: 'PIN diterima. Anda telah menyertai kelas atau bilik.', navigateRoom: true, navigateClass: true});
  }

  async function copy(value, success) {
    const token = epoch;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard');
      await navigator.clipboard.writeText(String(value));
      if (active && token === epoch) announce(success, 'success');
    } catch {
      if (!active || token !== epoch) return;
      const input = content.querySelector('#portal-saved-code') || content.querySelector('input.portal-pin');
      if (input) { input.focus(); input.select(); }
      announce('Salinan automatik tidak tersedia. Pilih kod atau PIN yang dipaparkan, kemudian salin secara manual.', 'error');
    }
  }

  function showRoom(id) {
    if (!active || pending || !accountAvailable()) return;
    epoch += 1;
    stopWatch();
    roomId = id;
    cloud.setRoom?.(roomId);
    roomError = '';
    boardPage = 1;
    closeConfirmation = false;
    announce('');
    render({focus: true, preserve: false});
    refresh();
  }

  async function click(event) {
    const control = event.target.closest('[data-portal-action]');
    if (!control || !screen.contains(control) || control.disabled) return;
    const action = control.dataset.portalAction;
    if (action === 'exit') {
      if (recoveryCode) {
        announce('Simpan kod pemulihan dahulu, kemudian tekan “Saya sudah simpan, teruskan”. Kod ini hanya ditunjukkan sekali.', 'error');
        content.querySelector('#portal-saved-code')?.focus();
        return;
      }
      close(); onExit(); return;
    }
    if (action === 'password') {
      const input = document.getElementById(control.dataset.input);
      const showing = input.type === 'password';
      const subject = control.dataset.secretLabel || 'kata laluan';
      input.type = showing ? 'text' : 'password';
      control.textContent = showing ? 'Sembunyi' : 'Tunjuk';
      control.setAttribute('aria-label', `${showing ? 'Sembunyikan' : 'Tunjukkan'} ${subject}`);
      control.setAttribute('aria-pressed', String(showing));
      return;
    }
    if (pending) return;
    if (action === 'auth-mode') {
      if (cloud.recoveryRequired === true || !['login', 'signup', 'recover-email', 'recover', 'resend-confirmation'].includes(control.dataset.mode)) return;
      authMode = control.dataset.mode;
      announce('');
      render({preserve: false});
      content.querySelector('#portal-auth-title')?.focus({preventScroll: true});
      return;
    }
    if (action === 'resend-email') {
      if (!authEmail || emailCooldownSeconds() || cloud.recoveryRequired === true) return;
      return handleAuth(null, {email: authEmail}, control.dataset.resendKind === 'resend-confirmation' ? 'resend-confirmation' : 'recover-email');
    }
    if (action === 'refresh') return refresh();
    if (action === 'copy-recovery') return copy(recoveryCode, 'Kod pemulihan telah disalin. Simpan di tempat selamat.');
    if (action === 'recovery-done') { recoveryCode = ''; recoveryUsername = ''; render({focus: true, preserve: false}); if (accountAvailable()) refresh(); return; }
    if (action === 'logout') {
      const token = epoch;
      const job = ++operation;
      authPending = true;
      pending = 'logout';
      updateBusy();
      try {
        await cloud.auth('logout', {});
        if (!active || token !== epoch) return;
        clearAccount();
        knownSession = sessionKey();
        knownRecovery = cloud.recoveryRequired === true;
        knownCallbackError = String(cloud.callbackError || '');
        callbackErrorDismissed = true;
        authMode = 'login';
        authOnly = false;
        announce('Anda telah log keluar.');
        render({focus: true, preserve: false});
      } catch (error) { if (active && token === epoch) announce(errorText(error), 'error'); }
      finally { if (job === operation) { authPending = false; pending = ''; } if (active) updateBusy(); }
      return;
    }
    if (!accountAvailable()) return;
    if (action === 'select-class') {
      classId = control.dataset.id; rosterQuery = ''; rosterPage = roomPage = 1; render({preserve: false});
      const heading = content.querySelector('.portal-class-overview h2');
      heading?.setAttribute('tabindex', '-1'); heading?.focus({preventScroll: true});
      return;
    }
    if (action === 'clear-search') { rosterQuery = ''; rosterPage = 1; render({preserve: false}); content.querySelector('#portal-roster-search')?.focus({preventScroll: true}); return; }
    if (action === 'page') { const page = Math.max(1, Number(control.dataset.page) || 1); if (control.dataset.target === 'roster') rosterPage = page; else if (control.dataset.target === 'board') boardPage = page; else roomPage = page; render(); return; }
    if (action === 'view-room') return showRoom(control.dataset.id);
    if (action === 'dashboard') { epoch += 1; roomId = null; cloud.setRoom?.(null); roomError = ''; closeConfirmation = false; stopWatch(); announce(''); render({focus: true, preserve: false}); return refresh(); }
    if (action === 'join-room') return mutate('join_room', {room_id: control.dataset.id}, {success: 'Anda telah masuk ke bilik permainan.', navigateRoom: true});
    if (action === 'accept-invite') return mutate('accept_invite', {invite_id: control.dataset.id}, {success: 'Jemputan diterima. Anda kini ahli kelas ini.', navigateClass: true});
    if (action === 'rotate-pin') return mutate('rotate_pin', {kind: control.dataset.kind, id: control.dataset.id}, {success: 'PIN baharu sudah sedia. PIN lama tidak boleh digunakan lagi.'});
    if (action === 'copy-pin') { const owner = control.dataset.kind === 'class' ? currentClass() : currentRoom(); if (owner?.pin) return copy(owner.pin, 'PIN telah disalin.'); return; }
    if (action === 'start-room') return mutate('set_room', {room_id: control.dataset.id, status: 'playing'}, {success: 'Permainan dimulakan. Pelajar kini boleh mula bermain.'});
    if (action === 'request-close-room') { closeConfirmation = true; render(); content.querySelector('[data-portal-action="cancel-close-room"]')?.focus({preventScroll: true}); return; }
    if (action === 'cancel-close-room') { closeConfirmation = false; render(); content.querySelector('[data-portal-action="request-close-room"]')?.focus({preventScroll: true}); return; }
    if (action === 'close-room') return mutate('set_room', {room_id: control.dataset.id, status: 'closed'}, {success: 'Bilik telah ditutup. Papan skor akhir dipaparkan.'});
    if (action === 'play') return mutate('start_attempt', {room_id: roomId}, {play: true});
    if (action === 'play-result' && currentRoom()?.my_attempt) { const state = currentRoom().my_attempt; close(); onPlay(state); }
  }

  function input(event) {
    if (event.type === 'compositionend') composing = false;
    if (event.target.id === 'portal-roster-search' && !event.isComposing) {
      rosterQuery = event.target.value;
      rosterPage = 1;
      render();
    }
    const fieldInput = event.target.closest('input[aria-invalid="true"]');
    if (fieldInput) {
      fieldInput.removeAttribute('aria-invalid');
      const node = document.getElementById(`${fieldInput.id}-error`);
      if (node) node.textContent = '';
    }
    if (renderDeferred && !composing) render();
  }

  function compositionStart() { composing = true; }

  function visibility() { if (active && !document.hidden && accountAvailable()) refresh({silent: true}); }
  function keyboard(event) {
    if (event.key === 'Escape' && closeConfirmation) {
      event.preventDefault?.();
      event.stopPropagation?.();
      closeConfirmation = false;
      render();
      content.querySelector('[data-portal-action="request-close-room"]')?.focus({preventScroll: true});
    }
  }
  screen.addEventListener('click', click);
  screen.addEventListener('submit', submitForm);
  screen.addEventListener('input', input);
  screen.addEventListener('compositionstart', compositionStart);
  screen.addEventListener('compositionend', input);
  screen.addEventListener('keydown', keyboard);
  document.addEventListener('visibilitychange', visibility);

  async function open(options = {}) {
    if (destroyed) return;
    if (active) {
      if (cloud.recoveryRequired === true || callbackError()) {
        stopLive();
        authOnly = true;
        if (callbackError() && cloud.recoveryRequired !== true) authMode = 'recover-email';
        render({focus: true, preserve: false});
      } else if (options.roomId) showRoom(options.roomId);
      else refresh({silent: true});
      return;
    }
    active = true;
    epoch += 1;
    const token = epoch;
    previousTitle = document.title;
    screen.hidden = false;
    initializing = cloud.ready !== false && typeof cloud.init === 'function';
    announce('');
    render({focus: true, preserve: false});
    try { if (initializing) await cloud.init(); }
    catch (error) { if (active && token === epoch) announce(errorText(error), 'error'); }
    if (!active || token !== epoch) return;
    initializing = false;
    knownSession = sessionKey();
    knownRecovery = cloud.recoveryRequired === true;
    const linkError = String(cloud.callbackError || '');
    if (linkError !== knownCallbackError || knownRecovery) callbackErrorDismissed = false;
    knownCallbackError = linkError;
    if (knownRecovery || callbackError()) {
      authOnly = true;
      if (!knownRecovery) authMode = 'recover-email';
    }
    connectSession();
    roomId = accountAvailable() ? options.roomId || null : null;
    cloud.setRoom?.(roomId);
    render({focus: true, preserve: false});
    if (accountAvailable()) await refresh();
  }

  function close() {
    if (!active) return;
    active = false;
    clearAccount();
    try { sessionStop?.(); } catch { /* Local cleanup is best-effort. */ }
    sessionStop = null;
    pending = '';
    authPending = false;
    initializing = false;
    clearInterval(emailCooldownTimer);
    emailCooldownTimer = null;
    emailCooldownUntil = 0;
    authEmail = '';
    authOnly = false;
    authMode = 'login';
    screen.hidden = true;
    screen.removeAttribute('aria-busy');
    content.replaceChildren();
    announce('');
    if (previousTitle) document.title = previousTitle;
  }

  function destroy() {
    close();
    destroyed = true;
    screen.removeEventListener('click', click);
    screen.removeEventListener('submit', submitForm);
    screen.removeEventListener('input', input);
    screen.removeEventListener('compositionstart', compositionStart);
    screen.removeEventListener('compositionend', input);
    screen.removeEventListener('keydown', keyboard);
    document.removeEventListener('visibilitychange', visibility);
  }

  return {open, close, refresh, showRoom, destroy, get isOpen() { return active; }};
}
