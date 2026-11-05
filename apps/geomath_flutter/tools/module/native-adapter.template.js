/* Native wrapper only. The opaque teaching frame never receives native identity. */
(() => {
  'use strict';
  const source = __GEOMATH_PREPARED_SOURCE__;
  const settingsInstanceId = 'geomath-settings-v1';
  const channel = 'geodecoder.module.preferences';
  const frame = document.getElementById('module');
  const learningSchema = __GEOMATH_LEARNING_SCHEMA__;
  let config = null, moduleReady = false, settingsReady = false, emittedReady = false, readyAcknowledged = false;
  let settings = null, active = true, modelSnapshot = null, audioGranted = false, audioRevision = 0, audioAck = 0;
  let learningReady=false, learningSequence=0, learningEvent=0, learningPending=false, learningCheckpoint=null, learningTransitionCheckpoint=null, learningDiagnostics=null, learningResult={ok:true}, learningExport=null, learningExternalLink=null;
  const progressSeen = new Map();
  // Read-only startup telemetry. No payload text, URL, identity or capability is
  // retained. These counters do not participate in readiness or authorization.
  const bootstrap = {srcdocAssigned:false,sourceCharacters:0,frameLoads:0,messages:0,beforeConfigured:0,rejectedSource:0,rejectedOrigin:0,rejectedShape:0,accepted:0,childStage:'none',childErrors:0,lastErrorCode:'none',lastErrorLine:0};
  const count = key => bootstrap[key] = Math.min(1000000,bootstrap[key]+1);
  frame.addEventListener?.('load',()=>count('frameLoads'));

  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const exact = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value,key));
  const validSettings = value => object(value) && ['ms','en'].includes(value.language) && [100,125,150].includes(value.textSize) && typeof value.motionPaused === 'boolean' && ['standard','strong'].includes(value.contrast) && typeof value.audioEnabled === 'boolean';
  function send(command, payload = {}) {
    if (!config || !active || !window.GeoMathNative?.postMessage) return false;
    const encoded=JSON.stringify({nativeBridgeVersion:1, instanceId:config.instanceId, bridgeSession:config.bridgeSession, command, payload});
    if(learningSchema.bytes(encoded)>65536)return false;
    window.GeoMathNative.postMessage(encoded);
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
    count('messages');
    if (!config) {count('beforeConfigured');return;}
    if (event.source !== frame.contentWindow) {count('rejectedSource');return;}
    if (event.origin !== 'null') {count('rejectedOrigin');return;}
    if (!object(event.data)) {count('rejectedShape');return;}
    count('accepted');
    const message = event.data;
    if(message.type==='geomath:bootstrap-diagnostic'){
      if(!exact(message,['type','version','stage','code','line'])||message.version!==1||!['head','dom-ready','loaded','error','rejection'].includes(message.stage)||!['none','Error','TypeError','SyntaxError','ReferenceError','RangeError','URIError','EvalError','AggregateError','unknown'].includes(message.code)||!Number.isSafeInteger(message.line)||message.line<0||message.line>1000000)return;
      if(message.stage==='error'||message.stage==='rejection'){
        count('childErrors');bootstrap.lastErrorCode=message.code;bootstrap.lastErrorLine=message.line;
      }else bootstrap.childStage=message.stage;
      return;
    }

    if(typeof message.type==='string'&&message.type.startsWith('geomath:learning-')){
      if(message.version!==1||!Number.isSafeInteger(message.eventSequence)||message.eventSequence<=learningEvent)return;
      if(message.type==='geomath:learning-ready'){
        if(!exact(message,['type','version','eventSequence']))return;
        learningReady=true;learningEvent=message.eventSequence;return;
      }
      if(!learningReady)return;
      if(message.type==='geomath:learning-external-link'){
        if(!exact(message,['type','version','eventSequence','url'])||!['https://bpk.moe.gov.my/kurikulum/kssm/kssm-tingkatan-2/341-dskp-kssm-matematik-tingkatan-2/file','https://sman.pahang.edu.my/system/documents/attachments/000/000/168/original/002_DSKP_KSSM_MATEMATIK_TINGKATAN_3.pdf?1544929347='].includes(message.url))return;
        learningEvent=message.eventSequence;learningExternalLink={url:message.url};return;
      }
      if(message.type==='geomath:learning-export'){
        const value=message.export;
        if(!exact(message,['type','version','eventSequence','export'])||!exact(value,['format','fileName','title','svg'])||value.format!=='image/svg+xml'||value.fileName!=='GeoDecoder_Bentangan.svg'||typeof value.title!=='string'||value.title.length>240||typeof value.svg!=='string'||value.svg.length>262144||!value.svg.startsWith('<svg ')||/<script|<foreignObject|<iframe|<object|<embed|<image|\bon[a-z]+\s*=|(?:href|src)\s*=/i.test(value.svg))return;
        learningEvent=message.eventSequence;learningExport={...value};return;
      }
      if(message.type==='geomath:learning-progress'){
        if(!exact(message,['type','version','eventSequence','progress']))return;
        if(forwardProgress(message.progress))learningEvent=message.eventSequence;return;
      }
      if(message.type==='geomath:learning-state'){
        if(!exact(message,['type','version','eventSequence','requestSequence','result','checkpoint','transitionCheckpoint','diagnostics'])||!Number.isSafeInteger(message.requestSequence)||message.requestSequence!==learningSequence||!object(message.result)||typeof message.result.ok!=='boolean'||!(message.result.ok?exact(message.result,['ok']):exact(message.result,['ok','error'])&&typeof message.result.error==='string'&&/^[a-z-]{1,80}$/.test(message.result.error))||!object(message.diagnostics)||!learningSchema.safe(message.diagnostics))return;
        if(message.checkpoint!==null&&!learningSchema.checkpoint(message.checkpoint))return;
        if(message.transitionCheckpoint!==null&&!learningSchema.checkpoint(message.transitionCheckpoint))return;
        learningEvent=message.eventSequence;learningPending=false;learningResult={ok:message.result.ok,...(typeof message.result.error==='string'?{error:message.result.error.slice(0,80)}:{})};
        if(message.checkpoint!==null)learningCheckpoint=JSON.parse(JSON.stringify(message.checkpoint));learningTransitionCheckpoint=message.transitionCheckpoint===null?null:JSON.parse(JSON.stringify(message.transitionCheckpoint));learningDiagnostics={...message.diagnostics};return;
      }
      return;
    }
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
    else if (!learningReady && moduleReady && message.type === 'geodecoder:module-progress') forwardProgress(message);
  });
  function forwardProgress(message){
    const keys=['type','protocol','session','activity','stage','prediction','result','explanation','completed'];
    if(!config||!moduleReady||!exact(message,keys)||message.type!=='geodecoder:module-progress'||message.protocol!==1||message.session!==config.progressSession||!['net','volume','area','composite'].includes(message.activity)||!['prediction','experiment','check','explanation'].includes(message.stage)||typeof message.completed!=='boolean')return;
    for(const [key,limit] of [['prediction',240],['result',600],['explanation',600]])if(typeof message[key]!=='string'||message[key].length>limit||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(message[key]))return;
    if(!message.prediction.trim()||message.stage!=='prediction'&&!message.result.trim()||message.stage==='explanation'&&!message.explanation.trim()||message.completed&&message.stage!=='explanation')return;
    const payload=Object.fromEntries(keys.map(key=>[key,message[key]])),fingerprint=JSON.stringify(payload);
    if(progressSeen.get(message.activity)===fingerprint)return true;
    if(send('progress',payload))progressSeen.set(message.activity,fingerprint);
    return true;
  }
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
      bootstrap.srcdocAssigned=true;bootstrap.sourceCharacters=source.length;
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
    learningAction(value) {
      if(!config||!active||!moduleReady||!settingsReady||!learningReady)return {accepted:false,sequence:learningSequence,error:'learning-not-ready'};
      if(learningPending)return {accepted:false,sequence:learningSequence,error:'learning-busy'};
      if(!learningSchema.action(value))return {accepted:false,sequence:learningSequence,error:'action-invalid'};
      learningSequence++;learningPending=true;learningResult={ok:true};learningExport=null;
      post({type:'geomath:learning-action',version:1,sequence:learningSequence,value:JSON.parse(JSON.stringify(value))});
      return {accepted:true,sequence:learningSequence};
    },
    learningSnapshot() {return JSON.parse(JSON.stringify({schemaVersion:1,sequence:learningSequence,pending:learningPending,ready:learningReady,result:learningResult,checkpoint:learningCheckpoint,transitionCheckpoint:learningTransitionCheckpoint,diagnostics:learningDiagnostics,export:learningExport,externalLink:learningExternalLink}));},
    clearNativeEvents() {if(!config)return false;learningExport=null;learningExternalLink=null;return true;},
    dispose() {active=false;audioGranted=false;learningReady=false;learningPending=false;learningCheckpoint=null;learningTransitionCheckpoint=null;learningDiagnostics=null;learningExport=null;learningExternalLink=null;progressSeen.clear();window.speechSynthesis?.cancel();config=null;settings=null;frame.removeAttribute('srcdoc');},
    // Read-only test/diagnostic seam. It contains no bridge nonce or actor.
    inspect() {post({type:'geomath:inspect'});return true;},
    activateControl(action,value) {if(!['rotate-right','set-unfold','stop-auto'].includes(action))return false;post({type:'geomath:control',action,value});return true;},
    diagnostics() {return {moduleReady,settingsReady,emittedReady,readyAcknowledged,active,audioAck,instanceId:config?.instanceId ?? null,settings:settings?{...settings}:null,model:modelSnapshot,bootstrap:{...bootstrap,configured:config!==null}};}
  }),writable:false,configurable:true});
})();
