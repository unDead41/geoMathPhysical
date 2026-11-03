/** Exact SVG illustrations; no generated mathematical diagrams. */
export function geometryKit() {
  const ticks=Array.from({length:40},(_,i)=>`<path d="M${12+i*10} 4v${i%5===0?13:7}"/>`).join('');
  return `<svg class="geometry-kit" viewBox="0 0 720 490" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="kit-blue" x2="1" y2=".5"><stop stop-color="#4097FF"/><stop offset="1" stop-color="#165CE0"/></linearGradient>
      <linearGradient id="kit-cylinder" x2="1" y2="0"><stop stop-color="#2F96EF"/><stop offset=".7" stop-color="#1A72DE"/><stop offset="1" stop-color="#0E54B5"/></linearGradient>
      <linearGradient id="kit-board" x2=".8" y2="1"><stop stop-color="#F7FBFF"/><stop offset="1" stop-color="#E9F1FF"/></linearGradient>
      <linearGradient id="kit-metal" x2="1" y2="0"><stop stop-color="#7286A2"/><stop offset=".45" stop-color="#F3F7FD"/><stop offset="1" stop-color="#506482"/></linearGradient>
      <pattern id="kit-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0v24" fill="none" stroke="#B4CFF1" stroke-width=".9"/></pattern>
      <filter id="kit-shadow" x="-30%" y="-30%" width="170%" height="180%"><feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#2C568E" flood-opacity=".17"/></filter>
      <filter id="kit-object-shadow" x="-40%" y="-40%" width="200%" height="200%"><feDropShadow dx="0" dy="8" stdDeviation="5" flood-color="#1B487F" flood-opacity=".2"/></filter>
    </defs>
    <ellipse cx="358" cy="421" rx="290" ry="34" fill="#C0D6F4" opacity=".24"/>
    <g filter="url(#kit-shadow)">
      <g transform="matrix(1 .15 -.34 .72 179 100)"><rect y="11" width="480" height="360" rx="18" fill="#A4BFE8"/><rect width="480" height="360" rx="18" fill="url(#kit-board)" stroke="#BED1ED" stroke-width="4"/><rect x="12" y="12" width="456" height="336" rx="9" fill="url(#kit-grid)"/><rect x="12" y="12" width="456" height="336" rx="9" fill="none" stroke="#D0E0F5" stroke-width="2"/></g>
    </g>
    <g transform="matrix(.91 .14 -.34 .72 222 117)" filter="url(#kit-object-shadow)">
      <path d="M0 0h177L0 123Z M20 16v71l103-71Z" fill="#B5DCFF" fill-rule="evenodd" stroke="#61AEF3" stroke-width="3"/>
      <path d="M10 6h140M6 15v88" fill="none" stroke="#E2F3FF" stroke-width="3"/>
      <g stroke="#4F9CDC" stroke-width="1.5">${Array.from({length:14},(_,i)=>`<path d="M${12+i*10} 0v7"/>`).join('')}</g>
    </g>
    <g filter="url(#kit-object-shadow)">
      <path d="M502 91v106c0 28 82 28 82 0V91" fill="url(#kit-cylinder)" stroke="#3074BF" stroke-width="1.2"/>
      <ellipse cx="543" cy="91" rx="41" ry="19" fill="#66B9FF" stroke="#90CCFF" stroke-width="1.5"/>
      <path d="M510 108v88" stroke="#68BBFF" stroke-width="3" opacity=".5"/>
      <path d="m364 150-62 104 75 36 57-28Z" fill="#2A9C9C" stroke="#24858C" stroke-width="1.1"/>
      <path d="m364 150 13 140 57-28Z" fill="#15797D"/>
      <path d="m364 150-62 104 75 36Z" fill="#55BEB5"/>
      <path d="m210 220 68 24v91l-68-26Z" fill="url(#kit-blue)"/>
      <path d="m278 244 48-32v90l-48 33Z" fill="#1759CE"/>
      <path d="m210 220 48-31 68 23-48 32Z" fill="#6DBBFF"/>
      <path d="m278 244 48-32" fill="none" stroke="#A6D7FF" stroke-width="1.3"/>
      <path d="m423 279 68 25v65l-68-27Z" fill="#FFC957"/>
      <path d="m491 304 69-49v65l-69 49Z" fill="#EAA329"/>
      <path d="m423 279 69-49 68 25-69 49Z" fill="#FFE197"/>
      <path d="m491 304 69-49" stroke="#FFEDB4" stroke-width="1.5"/>
    </g>
    <g transform="matrix(1 .15 -.34 .72 114 350)" filter="url(#kit-object-shadow)"><rect width="410" height="29" rx="3" fill="#B8DDFD" fill-opacity=".87" stroke="#65A9E7" stroke-width="1.5"/><g stroke="#448AC4" stroke-width="1">${ticks}</g><path d="M0 27h410" stroke="#E3F5FF" stroke-width="2"/></g>
    <g transform="translate(626 250) rotate(16)" filter="url(#kit-object-shadow)">
      <path d="m-11-12-41 129 6 4L2 2" fill="url(#kit-metal)" stroke="#7D8DA3"/>
      <path d="m9-10 41 128-6 4L-2 1" fill="url(#kit-metal)" stroke="#7D8DA3"/>
      <path d="m-46 121-7 16 1-20M45 122l7 15-2-19" fill="#243E63"/>
      <path d="M-5-25v-30a6 6 0 0 1 12 0v30" fill="#4086E7" stroke="#1D62BD" stroke-width="2"/>
      <ellipse rx="20" ry="12" fill="#2466C8" stroke="#76B6F4" stroke-width="2"/><ellipse rx="7" ry="4" fill="#C4DDF5"/>
      <path d="M-29 51h60" stroke="#7A8DA5" stroke-width="4"/><circle cx="1" cy="51" r="6" fill="#326EC1"/>
    </g>
  </svg>`;
}

export function entryIcon(name) {
  const paths={
    play:'<path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
    book:'<path d="M12 5C8 2 4 3 2 4v15c3-1 6-1 10 1 4-2 7-2 10-1V4c-3-1-6-1-10 1Zm0 0v15"/>',
    users:'<circle cx="9" cy="7" r="3"/><path d="M2 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 4 5v2"/>',
    quiz:'<path d="M8 4H4v18h16V4h-4M9 2h6v5H9Z M8 12h1m3 0h4M8 17h1m3 0h4"/>',
    cap:'<path d="m1 8 11-5 11 5-11 5Zm4 2v7c5 4 9 4 14 0v-7M2 9v8"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    keyboard:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M5 9h1m3 0h1m3 0h1m3 0h1M5 12h1m3 0h1m3 0h1m3 0h1M7 16h10"/>',
    back:'<path d="M20 12H4m6-6-6 6 6 6"/>'
  };
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.play}</svg>`;
}
