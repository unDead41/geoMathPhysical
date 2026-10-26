import test from 'node:test';
import assert from 'node:assert/strict';
import * as ui from '../src/ui.mjs';
import {UI_ICONS} from '../src/design-system.mjs';

// Strict DOM port: missing descendants return null rather than being created.
class SvgNode {
  constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.textContent='';}
  setAttribute(k,v){this.attrs[k]=String(v);}
  getAttribute(k){return this.attrs[k]??null;}
  append(...nodes){this.children.push(...nodes);}
  querySelector(tag){for(const n of this.children){if(n.tagName===tag)return n;const child=n.querySelector(tag);if(child)return child;}return null;}
}
test('modular source icons are hydrated before playback presentation reads the path',()=>{
  assert.equal(typeof ui.hydrateIcons,'function','source HTML needs the same shared SVG paths as the bundle');
  const saved=globalThis.document;globalThis.document={createElementNS:(_,tag)=>new SvgNode(tag)};
  try{
    const button=new SvgNode('button'),label=new SvgNode('span'),placeholder=new SvgNode('svg');
    placeholder.setAttribute('data-icon','play');button.append(placeholder,label);
    placeholder.replaceWith=node=>button.children.splice(button.children.indexOf(placeholder),1,node);
    const root={querySelectorAll:selector=>{assert.equal(selector,'svg[data-icon]');return [placeholder];}};
    assert.equal(button.querySelector('path'),null);
    ui.hydrateIcons(root);ui.playbackButton(button,'Jeda animasi',true);
    assert.equal(button.querySelector('path').getAttribute('d'),UI_ICONS.pause);
    assert.equal(label.textContent,'Jeda animasi');assert.equal(button.getAttribute('aria-label'),'Jeda animasi');
  }finally{if(saved===undefined)delete globalThis.document;else globalThis.document=saved;}
});
