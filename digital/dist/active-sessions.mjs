/** Only server-owned session records enter the view. Never persist this data. */
export function sessionListError(code) {
  const messages={
    'session-expired':'Sesi tamat atau tidak lagi sah. Log masuk semula sebelum mencuba lagi.',
    'session-changed':'Sesi akaun berubah. Buka semula halaman keselamatan dan cuba lagi.',
    'sessions-unavailable':'Senarai sesi belum tersedia. Cuba lagi kemudian atau gunakan log keluar semua peranti.',
    network:'Senarai sesi gagal dimuatkan. Semak Internet dan cuba lagi.',
    busy:'Tunggu senarai sesi selesai dimuatkan.',
    cancelled:'Tindakan dibatalkan.'
  };
  return Object.assign(Error(messages[code]||messages.network),{code});
}

export function readSessionList(data) {
  if(data?.error)throw sessionListError(data.error.code==='session-expired'?'session-expired':'sessions-unavailable');
  if(!Array.isArray(data?.sessions)||data.sessions.length>100||data.capabilities?.revoke_individual!==false||typeof data.truncated!=='boolean'||!Number.isFinite(Date.parse(data.server_now)))throw sessionListError('sessions-unavailable');
  const sessions=data.sessions.map(row=>{
    if(typeof row?.is_current!=='boolean'||!['recorded','expired'].includes(row.status)||(row.started_at!==null&&!Number.isFinite(Date.parse(row.started_at)))||(row.user_agent!==null&&typeof row.user_agent!=='string'))throw sessionListError('sessions-unavailable');
    return {is_current:row.is_current,started_at:row.started_at,user_agent:row.user_agent?.slice(0,512)||null,status:row.status};
  });
  if(sessions.filter(row=>row.is_current&&row.status==='recorded').length!==1||sessions.filter(row=>row.is_current).length!==1)throw sessionListError('session-expired');
  return {sessions,server_now:data.server_now,truncated:data.truncated};
}

/** User agents can be missing or spoofed; output only fixed, estimated labels. */
export function estimatedDevice(userAgent,t) {
  const ua=typeof userAgent==='string'?userAgent:'';
  const device=/iPad|Tablet/i.test(ua)?'Tablet':/Mobile|iPhone|Android/i.test(ua)?'Telefon':/Windows|Macintosh|Linux|X11/i.test(ua)?'Komputer':'Peranti tidak diketahui';
  const browser=/SamsungBrowser\//.test(ua)?'Samsung Internet':/Edg(?:e|A|iOS)?\//.test(ua)?'Edge':/OPR\/|Opera/.test(ua)?'Opera':/Firefox\/|FxiOS\//.test(ua)?'Firefox':/Chrome\/|CriOS\//.test(ua)?'Chrome':/Version\/.+Safari\//.test(ua)?'Safari':t('Pelayar tidak diketahui');
  return t(device)+' · '+browser;
}

function deviceIcon(userAgent) {
  const mobile = /Mobile|iPhone|Android|iPad|Tablet/i.test(userAgent || '');
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${mobile ? '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/>' : '<path d="M4 3h16v13H4zM2 20h20l-2-4H4z"/>'}</svg>`;
}

export function renderActiveSessions({state,confirming='',button,esc,t}) {
  const loading=state.status==='loading',data=state.status==='ready'?state.data:null;
  const rows=data?.sessions||[],others=rows.filter(row=>!row.is_current);
  const orderedRows=[...rows.filter(row=>row.is_current),...others];
  const date=value=>value?new Intl.DateTimeFormat(globalThis.document?.documentElement?.lang==='en'?'en-MY':'ms-MY',{timeZone:'Asia/Kuala_Lumpur',dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):t('Belum direkodkan');
  const confirm=confirming==='others'
    ? [t('Log keluar semua sesi lain?'),t('Semua sesi lain akan dibatalkan. Peranti ini kekal log masuk.'),'logout-others',t('Ya, log keluar sesi lain')]
    : [t('Log keluar peranti ini?'),t('Anda akan dibawa ke halaman log masuk. Untuk meneruskan, log masuk semula.'),'logout-current',t('Ya, log keluar peranti ini')];
  return `<section id="portal-active-sessions" class="portal-panel portal-active-sessions" aria-labelledby="portal-active-sessions-title" aria-busy="${loading}">
    <div class="portal-panel-title"><div><h2 id="portal-active-sessions-title" tabindex="-1">${t('Sesi Aktif')}</h2><p>${t('Rekod sesi daripada pelayan akaun. Ini bukan senarai peranti dalam talian.')}</p></div>${button(t('Muat semula sesi'),'refresh-sessions',{quiet:true,symbol:'refresh',disabled:loading})}</div>
    <p class="portal-security-note">${t('Jenis peranti dan pelayar ialah anggaran. Aktiviti terakhir tidak tersedia.')}</p>
    ${loading||state.status==='idle'?`<p role="status">${t('Memuatkan sesi…')}</p>`:''}
    ${state.status==='error'?`<p class="portal-inline-warning" role="status">${esc(t(state.error))}</p>`:''}
    ${data?`<ul class="portal-session-list">${orderedRows.map(row=>`<li data-session-row class="portal-session-row${row.is_current?' is-current':''}"><span class="portal-session-device" aria-hidden="true">${deviceIcon(row.user_agent)}</span><div class="portal-session-description"><div class="portal-session-heading"><b>${esc(estimatedDevice(row.user_agent,t))}</b>${row.is_current?`<span class="portal-session-current" data-current-session>${t('Peranti ini')}</span>`:''}</div><p class="portal-session-state"><span>${t('Status sesi')}: </span>${row.status==='expired'?t('Tamat mengikut pelayan'):t('Direkodkan oleh Auth')}</p></div><dl><div><dt>${t('Sesi bermula')}</dt><dd>${row.started_at?`<time datetime="${esc(row.started_at)}">${esc(date(row.started_at))}</time>`:t('Belum direkodkan')}</dd></div></dl></li>`).join('')}</ul>
      ${!others.length?`<p class="portal-session-empty">${t('Tiada sesi lain direkodkan.')}</p>`:''}
      ${data.truncated?`<p class="portal-security-note">${t('Hanya 100 sesi terkini dipaparkan, termasuk peranti ini. Log keluar sesi lain meliputi semua sesi lain.')}</p>`:''}
      <p class="portal-security-note">${t('Disemak pada')} ${esc(date(data.server_now))} ${t('(waktu Malaysia)')}</p>`:''}
    ${data?`<div class="portal-session-actions">${others.length?button(t('Log keluar semua sesi lain'),'request-logout-others',{danger:true}):''}${button(t('Log keluar peranti ini'),'request-logout-current',{quiet:true})}</div>`:''}
    <details class="portal-session-scope"><summary>${t('Tentang pembatalan sesi')}</summary><p class="portal-security-note">${t('Pembatalan satu sesi pilihan belum disokong. Gunakan log keluar semua sesi lain jika anda mahu mengekalkan peranti ini.')} ${t('Pembatalan menghentikan pembaharuan log masuk. Token akses sedia ada boleh kekal sah sehingga luput.')}</p></details>
    ${confirming?`<div id="portal-session-confirm" class="portal-close-confirmation portal-security-confirm" role="group" aria-labelledby="portal-session-confirm-title"><div><h3 id="portal-session-confirm-title">${confirm[0]}</h3><p>${confirm[1]}</p></div><div>${button(t('Batal'),'cancel-session-logout')}${button(confirm[3],confirm[2],{danger:true})}</div></div>`:''}
  </section>`;
}
