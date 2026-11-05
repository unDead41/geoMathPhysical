/* Native wrapper only. The opaque teaching frame never receives native identity. */
(() => {
  'use strict';
  const source = __GEOMATH_PREPARED_SOURCE__;
  const settingsInstanceId = 'geomath-settings-v1';
  const channel = 'geodecoder.module.preferences';
  const frame = document.getElementById('module');
  let config = null, moduleReady = false, settingsReady = false, emittedReady = false, readyAcknowledged = false;
  let settings = null, active = true, modelSnapshot = null, audioGranted = false, audioRevision = 0, audioAck = 0;
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const exact = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value,key));
  const validSettings = value => object(value) && ['ms','en'].includes(value.language) && [100,125,150].includes(value.textSize) && typeof value.motionPaused === 'boolean' && ['standard','strong'].includes(value.contrast) && typeof value.audioEnabled === 'boolean';
  function send(command, payload = {}) {
    if (!config || !active || !window.GeoMathNative?.postMessage) return false;
    window.GeoMathNative.postMessage(JSON.stringify({nativeBridgeVersion:1, instanceId:config.instanceId, bridgeSession:config.bridgeSession, command, payload}));
    return true;
  }
  function post(message) { frame.contentWindow?.postMessage(message, '*'); }
  function sync() {
    if (!config || !settings) return;
    post({channel,version:1,instanceId:settingsInstanceId,type:'settings',settings:{...settings,motionPaused:settings.motionPaused || !active,audioEnabled:settings.audioEnabled && audioGranted}});
    if (moduleReady) post({type:'geodecoder:module-context',protocol:1,session:config.progressSession,theme:config.theme,progress:config.progress});
  }
  function ready(retry = false) {
    if (!readyAcknowledged && (!emittedReady || retry) && moduleReady && settingsReady) { sync(); emittedReady = send('ready') || emittedReady; }
  }
  window.addEventListener('message', event => {
    if (!config || event.source !== frame.contentWindow || event.origin !== 'null' || !object(event.data)) return;
    const message = event.data;
    if (message.type === 'geomath:diagnostics' && object(message.snapshot)) {modelSnapshot = {...message.snapshot};return;}
    if (message.type === 'geomath:audio-ack' && Number.isInteger(message.revision) && message.revision === audioRevision) {audioAck = message.revision;return;}
    if (message.channel === channel && message.version === 1 && message.instanceId === settingsInstanceId) {
      if (message.type === 'ready') { settingsReady = true; ready(); }
      else if (message.type === 'open-settings') send('open-settings');
      else if (message.type === 'open-help') send('open-help');
      // The canonical choice notifications are local teaching choices. They do
      // not overwrite the native preferences repository or mutate identity.
      return;
    }
    if (message.protocol !== 1) return;
    if (message.type === 'geodecoder:module-ready') { moduleReady = true; sync(); ready(); }
    else if (moduleReady && message.type === 'geodecoder:module-progress' && message.session === config.progressSession) {
      const keys = ['type','protocol','session','activity','stage','prediction','result','explanation','completed'];
      if (!exact(message,keys)) return;
      const payload = Object.fromEntries(keys.map(key => [key,message[key]]));
      send('progress',payload);
    }
  });
  // Methods are used only by native code in the pinned top-level local asset.
  // Identity remains in this closure and is absent from the child document.
  Object.defineProperty(window,'GeoMathModule',{value:Object.freeze({
    configure(value) {
      if (config || !exact(value,['instanceId','bridgeSession','progressSession','theme','settings','progress']) ||
          ![value.instanceId,value.bridgeSession,value.progressSession].every(v => typeof v === 'string' && /^[\w-]{16,100}$/.test(v)) ||
          !['light','dark'].includes(value.theme) || !validSettings(value.settings) || !Array.isArray(value.progress)) return false;
      config = {instanceId:value.instanceId,bridgeSession:value.bridgeSession,progressSession:value.progressSession,theme:value.theme,progress:value.progress};
      settings = {...value.settings};
      const runtime = Object.fromEntries(Object.entries(window.GeoMathModule).filter(([key])=>key!=='configure'));
      Object.defineProperty(window,'GeoMathModule',{value:Object.freeze(runtime),writable:false,configurable:false});
      frame.srcdoc = source;
      return true;
    },
    updatePreferences(value) {
      if (!config || !exact(value,['theme','settings']) || !['light','dark'].includes(value.theme) || !validSettings(value.settings)) return false;
      config.theme = value.theme;settings = {...value.settings};sync();return true;
    },
    setActive(value) {
      if (typeof value !== 'boolean' || !config) return false;
      active = value;sync();post({type:'geomath:native-lifecycle',active});if(active)ready(true);return true;
    },
    acknowledgeReady() {if(!config || !emittedReady)return false;readyAcknowledged=true;return true;},
    setAudioAllowed(value) {
      if(!config || typeof value!=='boolean')return -1;
      audioGranted=value;audioRevision++;if(!value)window.speechSynthesis?.cancel();sync();post({type:'geomath:audio',allowed:value,revision:audioRevision});return audioRevision;
    },
    updateProgress(value) {if (!config || !Array.isArray(value)) return false;config.progress=value;sync();return true;},
    dispose() {active=false;audioGranted=false;window.speechSynthesis?.cancel();config=null;settings=null;frame.removeAttribute('srcdoc');},
    // Read-only test/diagnostic seam. It contains no bridge nonce or actor.
    inspect() {post({type:'geomath:inspect'});return true;},
    activateControl(action,value) {if(!['rotate-right','set-unfold','stop-auto'].includes(action))return false;post({type:'geomath:control',action,value});return true;},
    diagnostics() {return {moduleReady,settingsReady,emittedReady,readyAcknowledged,active,audioAck,instanceId:config?.instanceId ?? null,settings:settings?{...settings}:null,model:modelSnapshot};}
  }),writable:false,configurable:true});
})();
