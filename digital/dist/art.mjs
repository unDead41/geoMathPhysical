import {SHAPE_COPY, shapeName} from './i18n.mjs';
export const SHAPE_NAMES = Object.fromEntries(Object.entries(SHAPE_COPY.ms).map(([key,value])=>[key,value.name]));
export function describeShape(shape,kind,language='ms'){return SHAPE_COPY[language]?.[shape]?.[kind]||SHAPE_COPY.ms[shape]?.[kind]||'';}

export function icon(name, cls='') {
  const paths = {
    arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
    chevron:'<path d="m9 5 7 7-7 7"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.4 1.6c-1 .7-1.9 1-1.9 2.4m0 3h.01"/>',
    trophy:'<path d="M8 3h8v6a4 4 0 0 1-8 0V3Zm4 10v6m-4 2h8M8 5H4v2a5 5 0 0 0 5 5m7-7h4v2a5 5 0 0 1-5 5"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    bulb:'<path d="M8 15a6 6 0 1 1 8 0l-1 2H9l-1-2Zm1 5h6m-5 2h4M12 3v1"/>',
    skip:'<path d="m5 5 10 7L5 19V5Zm14 0v14"/>',
    sound:'<path d="M11 4 5 9H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    mute:'<path d="M11 4 5 9H2v6h3l6 5V4Zm5 5 6 6m0-6-6 6"/>',
    pause:'<path d="M8 5v14M16 5v14"/>',
    home:'<path d="m3 10 9-7 9 7v10H3V10Zm6 10v-7h6v7"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    trash:'<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
    cursor:'<path d="m5 3 14 10-7 1-3 7L5 3Z"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    refresh:'<path d="M20 7v5h-5M4 17v-5h5m-4-4a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3"/>',
    user:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/>',
    spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>'
  };
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.spark}</svg>`;
}

export function shapeArt(shape, kind='solid', decorative=false, language='ms') {
  const common='stroke="#236D69" stroke-width="2.2" stroke-linejoin="round"';
  let content='';
  if(kind==='solid') {
    const models={
      cube:`<path d="M100 22 152 50 100 78 48 50Z" fill="#C3F1DC"/><path d="M48 50 100 78 100 138 48 110Z" fill="#58BBA5"/><path d="M100 78 152 50 152 110 100 138Z" fill="#8AD6BA"/><path d="M100 22 152 50 152 110 100 138 48 110 48 50Z M48 50 100 78 152 50M100 78v60" fill="none" ${common}/>` ,
      cuboid:`<path d="M34 58 94 25 166 64 106 97Z" fill="#C3F1DC"/><path d="M34 58 106 97 106 139 34 100Z" fill="#58BBA5"/><path d="M106 97 166 64 166 106 106 139Z" fill="#8AD6BA"/><path d="M34 58 94 25 166 64 166 106 106 139 34 100Z M34 58 106 97 166 64M106 97v42" fill="none" ${common}/>` ,
      pyramid:`<path d="M100 18 40 108 100 140 160 108Z" fill="#8AD6BA"/><path d="M100 18 40 108 100 140Z" fill="#58BBA5"/><path d="M100 18 40 108 100 140 160 108Z M100 18v122" fill="none" ${common}/><path d="m40 108 60-30 60 30M100 18v60" fill="none" stroke="#236D69" stroke-width="1.8" stroke-dasharray="5 4" opacity=".55"/>`,
      cylinder:`<path d="M50 48v65c0 35 100 35 100 0V48Z" fill="#8AD6BA"/><path d="M50 48v65c0 12 12 21 29 24V68Z" fill="#58BBA5" opacity=".75"/><ellipse cx="100" cy="48" rx="50" ry="24" fill="#C3F1DC"/><path d="M50 48v65c0 35 100 35 100 0V48" fill="none" ${common}/><ellipse cx="100" cy="48" rx="50" ry="24" fill="none" ${common}/><path d="M50 113c0-31 100-31 100 0" fill="none" stroke="#236D69" stroke-width="1.5" stroke-dasharray="5 4" opacity=".5"/>`,
      cone:`<path d="M100 18 44 116c0 36 112 36 112 0Z" fill="#8AD6BA"/><path d="M100 18 44 116c0 14 15 22 36 25Z" fill="#58BBA5"/><path d="M100 18 44 116c0 36 112 36 112 0Z" fill="none" ${common}/><path d="M44 116c0-31 112-31 112 0" fill="none" stroke="#236D69" stroke-width="1.5" stroke-dasharray="5 4" opacity=".55"/>`
    };
    content=models[shape]||'';
  } else {
    const fill='#D5E6FF',stroke='#366BAD',fold='stroke="#366BAD" stroke-width="1.5" stroke-dasharray="4 3" fill="none"';
    const nets={
      cube:`<path d="M51 26h32v32h64v32H83v32H51V90H19V58h32Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><path d="M51 58h32M51 90h32M51 58v32M83 58v32M115 58v32" ${fold}/>`,
      cuboid:`<path d="M52 32h48v32h80v24h-80v32H52V88H20V64h32Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><path d="M52 64h48M52 88h48M52 64v24M100 64v24M132 64v24" ${fold}/>` ,
      pyramid:`<path d="m100 9 24 43 43 24-43 24-24 43-24-43-43-24 43-24Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><path d="M76 52h48v48H76Z" ${fold}/>`,
      cylinder:`<rect x="26" y="53" width="148" height="47" rx="0" fill="${fill}" stroke="${stroke}" stroke-width="2"/><circle cx="100" cy="29.5" r="23.5" fill="${fill}" stroke="${stroke}" stroke-width="2"/><circle cx="100" cy="123.5" r="23.5" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`,
      cone:`<path d="M95 20 23.55 61.25a82.5 82.5 0 0 0 142.9 0Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><circle cx="95" cy="130" r="27.5" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
    };
    content=nets[shape]||'';
  }
  return `<svg class="shape-art" viewBox="0 0 200 164" ${decorative?'aria-hidden="true"':`role="img" aria-label="${describeShape(shape,kind,language)}"`}><g>${kind==='solid'?'<ellipse cx="100" cy="148" rx="60" ry="7" fill="#18334B" opacity=".06"/>':''}${content}</g></svg>`;
}

export function brandArt() {
  return '<svg viewBox="0 0 40 44" class="brand-mark" aria-hidden="true"><path d="m20 2 17 10v20L20 42 3 32V12Z" fill="#215FF0"/><path d="m20 2 17 10-17 10L3 12Z" fill="#6EAAFF"/><path d="M20 22v20L3 32V12Z" fill="#215FF0"/><path d="m20 22 17-10v20L20 42Z" fill="#1847B0"/><path d="m11 17 9 5 9-5M20 22v10" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
}
