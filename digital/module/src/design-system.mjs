// UI values are generated from digital/design-system/tokens.mjs.
// Geometry face palettes, icons and educational timing remain module-owned.
import {CENTRAL_UI_TIMING,CENTRAL_MODULE_TOKENS,CENTRAL_DARK_TOKENS,centralModuleTokenCss} from './central-tokens.mjs';
export const UI_MOTION=Object.freeze({
  fast:CENTRAL_UI_TIMING.fast,feedback:CENTRAL_UI_TIMING.feedback,panel:CENTRAL_UI_TIMING.panel,
  camera:700,unfold:5800,fold:4000,join:1600,pour:2600,layer:600,
  compareAdd:1200,compareFill:2600,hold:1000,maxFrame:100
});
export const UI_TOKENS=CENTRAL_MODULE_TOKENS;
export const UI_DARK_TOKENS=CENTRAL_DARK_TOKENS;
// One 24×24, 1.8px stroke family; all geometry illustrations stay separate.
export const UI_ICONS=Object.freeze({
  play:'m8 5 11 7-11 7V5Z',pause:'M8 5v14M16 5v14',
  reset:'M20 7v5h-5M4 17v-5h5m-4-4a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3',
  left:'m14 6-6 6 6 6',right:'m10 6 6 6-6 6',up:'m6 14 6-6 6 6',down:'m6 10 6 6 6-6',
  plus:'M12 5v14M5 12h14',minus:'M5 12h14',check:'m5 12 4 4L19 6',
  arrow:'M5 19 19 5M5 5h14v14',cube:'m12 3 9 5v9l-9 5-9-5V8l9-5Zm0 10 9-5M3 8l9 5v9',
  book:'M3 5c3-1 6 0 9 2 3-2 6-3 9-2v15c-3-1-6 0-9 2-3-2-6-3-9-2V5Zm9 2v15',
  labs:'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 15h8',
  net:'M8 2h8v20H8V2ZM2 8h20v8H2V8Z',
  volume:'M4 5h16v15H4V5Zm0 5h16M4 15h16M9 5v15M15 5v15',
  area:'M4 4h16v16H4V4Zm5 0v5H4m11-5v5h5M9 20v-5H4m11 5v-5h5',
  combine:'m3 10 9-7 9 7v11H3V10Zm0 0h18M12 10v11',
  info:'M12 10v7m0-10v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'
});
export function designTokenCss(){return centralModuleTokenCss();}
export function iconMarkup(name){
  if(!UI_ICONS[name])throw new Error('Unknown UI icon: '+name);
  return '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="'+UI_ICONS[name]+'"/></svg>';
}
