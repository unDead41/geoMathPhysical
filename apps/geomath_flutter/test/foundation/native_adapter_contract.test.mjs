import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// This is a unit harness for the actual bundled wrapper. It does not execute
// the teaching frame and is not Android/WebView integration evidence.
const adapter = fs.readFileSync(
  new URL('../../assets/module/native-adapter.js', import.meta.url),
  'utf8',
);
const settingsChannel = 'geodecoder.module.preferences';
const settingsInstance = 'geomath-settings-v1';

function harness() {
  const native = [];
  const teaching = [];
  const listeners = new Map();
  const teachingWindow = {
    postMessage(message, origin) {
      teaching.push({message: structuredClone(message), origin});
    },
  };
  const frame = {
    contentWindow: teachingWindow,
    srcdoc: '',
    removeAttribute(name) {
      if (name === 'srcdoc') this.srcdoc = '';
    },
  };
  const window = {
    GeoMathNative: {postMessage: value => native.push(JSON.parse(value))},
    addEventListener: (name, listener) => listeners.set(name, listener),
  };
  vm.runInNewContext(adapter, {
    window,
    document: {getElementById: id => id === 'module' ? frame : null},
  });
  const api = window.GeoMathModule;
  const config = {
    instanceId: 'instance_0123456789',
    bridgeSession: 'native_nonce_0123456789',
    progressSession: 'progress_nonce_0123456789',
    theme: 'light',
    settings: {
      language: 'ms',
      textSize: 100,
      motionPaused: false,
      contrast: 'standard',
      audioEnabled: false,
    },
    progress: [],
  };
  assert.equal(api.configure(config), true);
  const message = (data, overrides = {}) => listeners.get('message')({
    source: teachingWindow,
    origin: 'null',
    data,
    ...overrides,
  });
  const ready = () => {
    message({type: 'geodecoder:module-ready', protocol: 1});
    message({
      channel: settingsChannel,
      version: 1,
      instanceId: settingsInstance,
      type: 'ready',
    });
  };
  return {api, config, message, ready, native, teaching, frame};
}

test('ready waits for both canonical channels and rejects unrelated sources', () => {
  const h = harness();
  h.message({type: 'geodecoder:module-ready', protocol: 1}, {source: {}});
  h.message({type: 'geodecoder:module-ready', protocol: 1}, {origin: 'https://example.invalid'});
  h.message({channel: settingsChannel, version: 1, instanceId: settingsInstance, type: 'ready'});
  assert.equal(h.native.length, 0);
  h.message({type: 'geodecoder:module-ready', protocol: 1});
  assert.deepEqual(h.native.map(message => message.command), ['ready']);
  h.ready();
  assert.deepEqual(h.native.map(message => message.command), ['ready']);
});

test('readiness while backgrounded is delivered once after foreground', () => {
  const h = harness();
  assert.equal(h.api.setActive(false), true);
  h.ready();
  assert.equal(h.native.length, 0);
  assert.equal(h.api.diagnostics().emittedReady, false);

  assert.equal(h.api.setActive(true), true);
  assert.deepEqual(h.native.map(message => message.command), ['ready']);
  assert.equal(h.api.diagnostics().emittedReady, true);
  assert.equal(h.api.acknowledgeReady(), true);
  h.api.setActive(true);
  h.ready();
  assert.equal(h.native.length, 1);
});

test('native session stays outside child context and protocols stay separate', () => {
  const h = harness();
  h.ready();
  const serializedTeaching = JSON.stringify(h.teaching);
  assert.equal(serializedTeaching.includes(h.config.bridgeSession), false);
  assert.equal(serializedTeaching.includes(h.config.instanceId), false);
  const contexts = h.teaching.filter(({message}) => message.type === 'geodecoder:module-context');
  assert.ok(contexts.length > 0);
  for (const {message} of contexts) {
    assert.equal(message.protocol, 1);
    assert.equal(message.session, h.config.progressSession);
    assert.equal(Object.hasOwn(message, 'nativeBridgeVersion'), false);
  }
  const settings = h.teaching.filter(({message}) => message.channel === settingsChannel);
  assert.ok(settings.length > 0);
  for (const {message} of settings) {
    assert.equal(message.version, 1);
    assert.equal(message.instanceId, settingsInstance);
    assert.equal(Object.hasOwn(message, 'session'), false);
  }
});

test('an unacknowledged ready retries on foreground and stops after native acceptance', () => {
  const h = harness();
  assert.equal(h.api.acknowledgeReady(), false);
  h.ready();
  assert.deepEqual(h.native.map(message => message.command), ['ready']);

  // Posting can race native lifecycle validation. The native owner has not
  // accepted this first envelope, even though JavaScript queued it.
  h.api.setActive(true);
  assert.deepEqual(h.native.map(message => message.command), ['ready', 'ready']);
  assert.equal(h.api.acknowledgeReady(), true);
  h.api.setActive(false);
  h.api.setActive(true);
  h.ready();
  assert.equal(h.native.length, 2);

  h.api.dispose();
  assert.equal(h.api.acknowledgeReady(), false);
  h.api.setActive(true);
  assert.equal(h.native.length, 2);
});

test('progress requires the current progress session and exact record keys', () => {
  const h = harness();
  h.ready();
  const record = {
    type: 'geodecoder:module-progress',
    protocol: 1,
    session: h.config.progressSession,
    activity: 'net',
    stage: 'prediction',
    prediction: 'Six faces remain connected.',
    result: '',
    explanation: '',
    completed: false,
  };
  h.message({...record, session: 'old-progress-session'});
  h.message({...record, owner: 'child-cannot-choose-an-owner'});
  h.message({...record, access_token: 'must-not-cross-boundary'});
  assert.deepEqual(h.native.map(message => message.command), ['ready']);

  h.message(record);
  assert.deepEqual(h.native.map(message => message.command), ['ready', 'progress']);
  assert.deepEqual(h.native[1].payload, record);
  assert.equal(h.native[1].instanceId, h.config.instanceId);
  assert.equal(h.native[1].bridgeSession, h.config.bridgeSession);
});

test('disposed wrapper cannot emit a later teaching message', () => {
  const h = harness();
  h.ready();
  h.api.dispose();
  h.message({channel: settingsChannel, version: 1, instanceId: settingsInstance, type: 'open-help'});
  h.ready();
  assert.equal(h.frame.srcdoc, '');
  assert.deepEqual(h.native.map(message => message.command), ['ready']);
});
