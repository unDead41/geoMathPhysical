import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMusic, MUSIC_KEY} from '../dist/music.mjs';

class FakeDocument {
  hidden = false;
  listeners = new Set();
  addEventListener(type, listener) { if (type === 'visibilitychange') this.listeners.add(listener); }
  removeEventListener(type, listener) { if (type === 'visibilitychange') this.listeners.delete(listener); }
  hide(hidden) { this.hidden = hidden; for (const listener of this.listeners) listener(); }
}

class FakeAudio {
  paused = true;
  currentTime = 0;
  mode = 'resolve';
  requests = [];
  history = [];
  listeners = new Map();
  _src = '';
  get src() { return this._src; }
  set src(src) { this.history.push({type:'source', src, paused:this.paused}); this._src = src; this.currentTime = 0; }
  addEventListener(type, listener) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(listener); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type) { for (const listener of this.listeners.get(type) || []) listener(); }
  pause() { this.paused = true; this.history.push({type:'pause'}); this.emit('pause'); }
  load() { this.history.push({type:'load', src:this.src}); }
  removeAttribute(name) { if (name === 'src') this._src = ''; }
  play() {
    this.history.push({type:'play', src:this.src});
    if (this.mode === 'throw') throw Object.assign(new Error('Autoplay blocked'), {name:'NotAllowedError'});
    if (this.mode === 'reject') return Promise.reject(Object.assign(new Error('Autoplay blocked'), {name:'NotAllowedError'}));
    if (this.mode === 'controlled') return new Promise((resolve, reject) => {
      this.requests.push({src:this.src, resolve:() => { this.paused = false; resolve(); }, reject});
    });
    this.paused = false;
    return Promise.resolve();
  }
}

function setup({saved = null, mode = 'resolve', storage, ...options} = {}) {
  const document = new FakeDocument(), audio = new FakeAudio(), writes = [], changes = [];
  audio.mode = mode;
  let created = 0;
  const music = createMusic({
    tracks:{menu:'menu.mp3', map:'map.mp3'}, document,
    storage:storage || {getItem:key => key === MUSIC_KEY ? saved : null, setItem:(...args) => writes.push(args)},
    createAudio:() => { created++; return audio; }, onChange:state => changes.push(state), ...options
  });
  return {music, audio, document, writes, changes, created:() => created};
}

test('music waits for a user gesture, with one quiet looping media element', async () => {
  const {music, audio, created} = setup();
  assert.equal(created(), 1);
  assert.equal(audio.loop, true);
  assert.equal(audio.volume, .22);
  assert.equal(audio.preload, 'none');
  assert.equal(music.state.enabled, true);
  assert.equal(music.state.unlocked, false);
  assert.equal(music.state.blocked, true);
  assert.equal(music.state.playing, false);
  await music.setScene('module');
  assert.equal(music.state.track, 'map');
  assert.equal(audio.src, '');
  assert.equal(audio.history.filter(event => event.type === 'play').length, 0);
  await music.unlock();
  assert.equal(audio.src, 'map.mp3');
  assert.equal(music.state.playing, true);
});

test('menu and game routes switch without overlap or restarting the same track', async () => {
  const {music, audio, created} = setup();
  await music.unlock();
  audio.currentTime = 37;
  for (const scene of ['guest', 'portal', 'result', 'welcome', 'home']) await music.setScene(scene);
  assert.equal(audio.currentTime, 37);
  assert.equal(audio.history.filter(event => event.type === 'play').length, 1);
  await music.setScene('module');
  assert.equal(music.state.track, 'map');
  audio.currentTime = 12;
  for (const scene of ['game', 'map']) await music.setScene(scene);
  assert.equal(audio.currentTime, 12);
  await music.setScene('result');
  assert.equal(audio.src, 'menu.mp3');
  assert.equal(created(), 1);
  const sources = audio.history.filter(event => event.type === 'source');
  assert.deepEqual(sources.map(event => event.src), ['menu.mp3', 'map.mp3', 'menu.mp3']);
  assert.ok(sources.every(event => event.paused), 'pause the shared element before changing its source');
});

test('the saved music preference survives route changes and is updated by the toggle', async () => {
  const {music, audio, writes} = setup({saved:'false'});
  await music.setScene('game');
  await music.unlock();
  assert.equal(music.state.enabled, false);
  assert.equal(music.state.playing, false);
  assert.equal(audio.src, '');
  await music.toggle();
  assert.equal(music.state.enabled, true);
  assert.equal(music.state.playing, true);
  assert.equal(audio.src, 'map.mp3');
  await music.setEnabled(false);
  await music.setScene('welcome');
  assert.equal(audio.paused, true);
  assert.equal(music.state.enabled, false);
  assert.deepEqual(writes, [[MUSIC_KEY, 'true'], [MUSIC_KEY, 'false']]);
});

test('unavailable storage does not prevent playing or changing the in-memory preference', async () => {
  const storage = {getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); }};
  const {music} = setup({storage});
  assert.equal(music.state.enabled, true);
  assert.equal(await music.unlock(), true);
  await music.toggle();
  assert.equal(music.state.enabled, false);
  await music.toggle();
  assert.equal(music.state.playing, true);
});

test('an autoplay rejection leaves accurate state and waits for an explicit gesture to retry', async () => {
  const {music, audio, document, changes} = setup({mode:'reject'});
  assert.equal(await music.unlock(), false);
  assert.equal(music.state.playing, false);
  assert.equal(music.state.pending, false);
  assert.equal(music.state.blocked, true);
  assert.equal(music.state.error, 'NotAllowedError');
  assert.ok(changes.every(state => !state.playing));
  await music.setScene('game');
  await music.setScene('result');
  document.hide(true);
  document.hide(false);
  await music.setEnabled(true);
  assert.equal(audio.history.filter(event => event.type === 'play').length, 1);
  audio.mode = 'resolve';
  assert.equal(await music.unlock(), true);
  assert.equal(music.state.blocked, false);
  assert.equal(music.state.playing, true);
  assert.equal(audio.history.filter(event => event.type === 'play').length, 2);
});

test('hidden tabs pause and resume the same track position, unless the preference was turned off', async () => {
  const {music, audio, document} = setup();
  await music.unlock();
  audio.currentTime = 48;
  document.hide(true);
  assert.equal(audio.paused, true);
  assert.equal(music.state.hidden, true);
  assert.equal(music.state.playing, false);
  document.hide(false);
  await Promise.resolve();
  assert.equal(music.state.playing, true);
  assert.equal(audio.currentTime, 48);
  assert.equal(audio.history.filter(event => event.type === 'source').length, 1);
  document.hide(true);
  await music.setEnabled(false);
  document.hide(false);
  assert.equal(audio.paused, true);
  assert.equal(audio.history.filter(event => event.type === 'play').length, 2);
});

test('a rejected old request cannot block the newer scene request', async () => {
  const {music, audio} = setup({mode:'controlled'});
  const first = music.unlock();
  const second = music.setScene('game');
  assert.equal(audio.requests.length, 2);
  assert.deepEqual(audio.requests.map(request => request.src), ['menu.mp3', 'map.mp3']);
  audio.requests[0].reject(Object.assign(new Error('old request aborted'), {name:'NotAllowedError'}));
  assert.equal(await first, false);
  assert.equal(music.state.track, 'map');
  assert.equal(music.state.pending, true);
  audio.requests[1].resolve();
  assert.equal(await second, true);
  assert.equal(music.state.playing, true);
  assert.equal(music.state.blocked, false);
  assert.equal(music.state.error, null);
});

test('a late old completion does not pause music already playing for the new scene', async () => {
  const {music, audio} = setup({mode:'controlled'});
  const first = music.unlock();
  const second = music.setScene('game');
  audio.requests[1].resolve();
  await second;
  const pauses = audio.history.filter(event => event.type === 'pause').length;
  audio.requests[0].resolve();
  assert.equal(await first, false);
  assert.equal(music.state.track, 'map');
  assert.equal(music.state.playing, true);
  assert.equal(audio.paused, false);
  assert.equal(audio.history.filter(event => event.type === 'pause').length, pauses);
});

test('late play completions cannot restart audio after mute, hiding, or destruction', async () => {
  for (const action of ['mute', 'hide', 'destroy']) {
    const {music, audio, document} = setup({mode:'controlled'});
    const request = music.unlock();
    if (action === 'mute') await music.setEnabled(false);
    if (action === 'hide') document.hide(true);
    if (action === 'destroy') music.destroy();
    audio.requests[0].resolve();
    assert.equal(await request, false, action);
    assert.equal(audio.paused, true, action);
    assert.equal(music.state.playing, false, action);
    if (action === 'destroy') assert.equal(document.listeners.size, 0);
  }
});

test('repeated calls reuse an in-flight request and synchronous play failure is handled', async () => {
  const {music, audio} = setup({mode:'controlled'});
  const first = music.unlock(), second = music.unlock(), third = music.setScene('guest');
  assert.equal(audio.requests.length, 1);
  audio.requests[0].resolve();
  assert.deepEqual(await Promise.all([first, second, third]), [true, true, true]);
  const denied = setup({mode:'throw'});
  assert.equal(await denied.music.unlock(), false);
  assert.equal(denied.music.state.blocked, true);
  assert.equal(denied.music.state.playing, false);
  const toggleDenied = setup({saved:'false', mode:'throw'});
  await toggleDenied.music.unlock();
  assert.equal(await toggleDenied.music.toggle(), false);
  assert.equal(toggleDenied.audio.history.filter(event => event.type === 'play').length, 1);
});

test('media unavailability and playback errors leave the application usable', async () => {
  const unavailable = setup({createAudio() { throw new Error('unsupported'); }});
  assert.equal(await unavailable.music.unlock(), false);
  assert.equal(unavailable.music.state.status, 'unavailable');
  const {music, audio} = setup();
  await music.unlock();
  audio.error = {code:2};
  audio.emit('error');
  assert.equal(music.state.playing, false);
  assert.equal(music.state.blocked, true);
  assert.equal(audio.paused, true);
  await music.setScene('game');
  assert.equal(audio.history.filter(event => event.type === 'play').length, 1);
});

test('standalone builds can supply embedded track URLs without global configuration', async () => {
  const tracks = {menu:'data:audio/mpeg;base64,bWVudQ==', map:'data:audio/mpeg;base64,bWFw'};
  const {music, audio} = setup({tracks});
  await music.unlock();
  assert.equal(audio.src, tracks.menu);
  await music.setScene('game');
  assert.equal(audio.src, tracks.map);
});
