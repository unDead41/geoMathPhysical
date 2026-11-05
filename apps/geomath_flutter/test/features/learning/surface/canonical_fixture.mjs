import fs from 'node:fs';
import vm from 'node:vm';
import {surfaceAdapterSource} from '../../../../tools/module/surface_adapter.mjs';

export const canonicalHtml = fs.readFileSync(new URL('../../../../assets/module/canonical-module.html', import.meta.url), 'utf8');
const canonicalCode = canonicalHtml.match(/<script>([\s\S]*?)<\/script>/)[1];
const anchor = 'window.__geodecoderModuleHost?.start(refreshModuleHost);';
const exports = 'globalThis.surfaceTestApi={learningMesh,studySurfacePieces,compositionMesh,compositionMeasures,workshopMesh,containerMeasures,holeMeasures,calculateMeasures,meshBounds,viewPoint,drawNoteDiagram,launch:geomathSurfaceLaunch,snapshot:geomathSurfaceSnapshot,validate:geomathSurfaceValidate,restore:geomathSurfaceRestore};';

export function geometryFixture(adapted = true) {
  const context = {window: {}, document: {querySelectorAll: () => []}};
  const prefix = canonicalCode.slice(0, canonicalCode.indexOf('const el=id=>'));
  vm.runInNewContext(prefix + (adapted ? surfaceAdapterSource() + exports
    : 'globalThis.surfaceTestApi={learningMesh,studySurfacePieces,compositionMesh,compositionMeasures,workshopMesh,containerMeasures,holeMeasures,calculateMeasures,meshBounds,viewPoint,drawNoteDiagram};') + '})();', context, {timeout: 2000});
  return context.surfaceTestApi;
}

// Minimal DOM test port, following canonical tests/app-fixture.mjs. It executes
// the shipped activity/controller, not a duplicate guided-state implementation.
// This fixture is not evidence of browser layout, WebView or touch behaviour.
class NodePort {
  constructor(tag = 'div') { this.tagName = tag; this.children = []; this.attributes = {}; this.dataset = {}; this.events = {}; this.style = {}; this.ownText = ''; this.value = '0'; this.disabled = false; this.checked = false; this.placeholderChild = {textContent: ''}; }
  get textContent() { return this.ownText + this.children.map(n => n.textContent ?? '').join(''); }
  set textContent(value) { this.ownText = String(value); this.children = []; }
  get firstChild() { return this.children[0] || this.placeholderChild; }
  setAttribute(key, value) { this.attributes[key] = String(value); if (key === 'id') {this.id = value; this.register?.(value, this);} if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value); }
  getAttribute(key) { return this.attributes[key] ?? null; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.ownText = ''; this.children = [...nodes]; }
  addEventListener(type, action) { (this.events[type] ??= []).push(action); }
  querySelectorAll(selector) { const match = node => selector.startsWith('.') ? (node.attributes?.class || '').split(' ').includes(selector.slice(1)) : node.tagName?.toLowerCase() === selector; return this.children.flatMap(node => [...(match(node) ? [node] : []), ...(node.querySelectorAll?.(selector) || [])]); }
  querySelector(selector) { const found = this.querySelectorAll(selector)[0]; if (found) return found; const fallback = new NodePort(selector); this.children.push(fallback); return fallback; }
  getContext() { return null; }
  getBoundingClientRect() { return {left: 0, top: 0, bottom: 0, width: 0, height: 0}; }
  scrollIntoView() {}
  focus() { this.focused = true; }
  click() { if (!this.disabled) this.emit('click'); }
  emit(type, event = {}) { for (const action of this.events[type] || []) action({target: this, ...event}); }
  dispatchEvent(event) { this.emit(event.type, event); return true; }
}

export function activityFixture() {
  const nodes = {};
  for (const match of canonicalHtml.matchAll(/id="([^"]+)"/g)) {nodes[match[1]] = new NodePort(); nodes[match[1]].setAttribute('id', match[1]);}
  let clock = 0, counter = 0;
  const queue = new Map();
  const media = {matches: true, addEventListener() {}};
  const register = (id, node) => {nodes[id] = node;};
  const document = {documentElement: new NodePort('html'), hidden: false, events: {},
    querySelectorAll: () => [], getElementById: id => nodes[id] ?? null,
    createElement: tag => Object.assign(new NodePort(tag), {register}),
    createElementNS: (_, tag) => Object.assign(new NodePort(tag), {register}),
    createTextNode: text => ({textContent: text}),
    addEventListener(type, action) {const old = this.events[type]; this.events[type] = old ? () => {old(); action();} : action;}};
  const window = {matchMedia: () => media, addEventListener() {}};
  window.parent = window;
  const context = {document, window, location: {hash: ''}, history: {replaceState() {}},
    performance: {now: () => clock}, ResizeObserver: class {observe() {}},
    Event: class {constructor(type, options = {}) {this.type = type; Object.assign(this, options);}},
    requestAnimationFrame: action => {queue.set(++counter, action); return counter;}, cancelAnimationFrame: id => queue.delete(id), console};
  vm.runInNewContext(canonicalCode.replace(anchor, anchor + '\n' + surfaceAdapterSource() + '\n' + exports + '\nsurfaceTestApi.selectShape=selectShape;'), context, {timeout: 2000});
  const tick = (ms = 16) => {clock += ms; const current = [...queue.values()]; queue.clear(); for (const action of current) action(clock);};
  const advance = ms => {for (let n = 0; n < ms; n += 100) tick(Math.min(100, ms - n));};
  tick(0);
  return {nodes, api: context.surfaceTestApi, click: id => nodes[id].click(),
    change(id, value, type = 'change') {nodes[id].value = value; nodes[id].emit(type);}, advance};
}
