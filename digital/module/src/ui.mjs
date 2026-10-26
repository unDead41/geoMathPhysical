import {UI_ICONS} from './design-system.mjs';
export function uiNode(tag,attrs={},text=''){
  const node=document.createElement(tag);
  for(const [name,value] of Object.entries(attrs))node.setAttribute(name,String(value));
  if(text)node.textContent=text;
  return node;
}
export function uiSvg(tag,attrs={},text=''){
  const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const [name,value] of Object.entries(attrs))node.setAttribute(name,String(value));
  if(text)node.textContent=text;
  return node;
}
export function uiIcon(name){
  if(!UI_ICONS[name])throw new Error('Unknown UI icon: '+name);
  const icon=uiSvg('svg',{class:'ui-icon',viewBox:'0 0 24 24','aria-hidden':'true'});
  icon.append(uiSvg('path',{d:UI_ICONS[name]}));return icon;
}
// Source-mode SVG placeholders use the same owner as build-time icon markup.
// The bundled HTML has no placeholders, so this is a no-op there.
export function hydrateIcons(root){
  for(const placeholder of root.querySelectorAll('svg[data-icon]'))placeholder.replaceWith(uiIcon(placeholder.getAttribute('data-icon')));
}
export function playbackButton(button,label,playing){
  button.setAttribute('aria-label',label);button.setAttribute('data-playing',String(playing));
  button.querySelector('span').textContent=label;
  button.querySelector('path').setAttribute('d',UI_ICONS[playing?'pause':'play']);
}
