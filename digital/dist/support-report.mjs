import {VERSION} from './core.mjs';
import {QUESTIONS} from './questions.mjs';
import {translate} from './i18n.mjs';

export const REPORT_CATEGORIES=Object.freeze(['game','duel','module','account','settings','connection','other']);
export const REPORT_LIMITS=Object.freeze({description:2000,steps:3000,expected:1000,actual:1000});
export const SUPPORT_BUILD=Object.freeze({channel:'digitalized-utility-help-support',baseSha:'790d989d666e64f3beabb507cd4140b832696367'});
const screens=['welcome','guest','game','result','duel','portal','module'];
const modes=['quiz','practice','review','duel','classroom'];
const questions=new Set(QUESTIONS.map(q=>q.id));
const dimension=n=>Number.isInteger(n)&&n>0&&n<=30000?n:null;

/** Explicit projection only: never serialize a Game, URL, error, session or store. */
export function createReportContext(input={}){
  const screen=screens.includes(input.screen)?input.screen:'unknown',inGame=screen==='game';
  return {
    appVersion:VERSION,build:{...SUPPORT_BUILD},screen,
    mode:['game','result','guest','duel'].includes(screen)&&modes.includes(input.mode)?input.mode:'none',
    language:input.language==='en'?'en':'ms',
    questionId:inGame&&questions.has(input.questionId)?input.questionId:null,
    stage:inGame&&['R1','R2'].includes(input.stage)?input.stage:null,
    phase:inGame&&['running','review','feedback'].includes(input.phase)?input.phase:null,
    viewport:{width:dimension(input.width),height:dimension(input.height)},
    connection:{browser:input.browserOnline===false?'offline':input.browserOnline===true?'online-unverified':'unknown',service:['last-response-ok','retry-needed'].includes(input.service)?input.service:'not-checked'}
  };
}
export function validateReport(value){
  const errors={};
  if(!REPORT_CATEGORIES.includes(value?.category))errors.category='required';
  for(const [field,max] of Object.entries(REPORT_LIMITS)){
    if(typeof value?.[field]!=='string'||!value[field].trim())errors[field]='required';
    else if(value[field].length>max)errors[field]='long';
  }
  return errors;
}
export function redactReportText(value,hidden='hidden'){
  const replacement='['+hidden+']';
  return String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,replacement)
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g,replacement)
    .replace(/\bBearer\s+[^\s<>"']+/gi,'Bearer '+replacement)
    .replace(/\b((?:access_token|refresh_token|service[_-]?role(?:[_-]?key)?|api[_-]?key|token|password|kata\s+laluan|pin|otp)\s*[:=]\s*)(?:"[^"\n]*"|'[^'\n]*'|[^\s&<>]+)/gi,(_,label)=>label+replacement)
    .replace(/\b\d{6}\b/g,replacement).trim();
}
export function formatReport(draft,context,language='ms'){
  if(Object.keys(validateReport(draft)).length)throw new Error('Invalid support report');
  const t=(key)=>translate(language,'help.'+key);
  // Re-project at the export boundary, including callers outside the UI.
  const c=createReportContext({screen:context?.screen,mode:context?.mode,language:context?.language,questionId:context?.questionId,stage:context?.stage,phase:context?.phase,width:context?.viewport?.width,height:context?.viewport?.height,browserOnline:context?.connection?.browser==='offline'?false:context?.connection?.browser==='online-unverified'?true:undefined,service:context?.connection?.service});
  const value=key=>redactReportText(draft[key],t('hidden'));
  const absent=t('notApplicable');
  return ['GeoDecoder Digital · '+t('report')+' · schema 1',t('local'),'',
    t('category')+': '+t('category.'+draft.category),
    ...['description','steps','expected','actual'].flatMap(key=>['',t(key)+':',value(key)]),
    '',t('context')+':',
    t('version')+': v'+c.appVersion,t('build')+': '+c.build.channel+' / '+c.build.baseSha,
    t('screen')+': '+t('screen.'+c.screen),t('mode')+': '+t('mode.'+c.mode),
    t('language')+': '+(c.language==='en'?'English':'Bahasa Melayu'),
    t('question')+': '+(c.questionId||absent),t('stage')+': '+(c.stage?t('stage.'+c.stage):absent),
    t('phase')+': '+(c.phase?t('phase.'+c.phase):absent),
    t('viewport')+': '+(c.viewport.width&&c.viewport.height?c.viewport.width+' × '+c.viewport.height:absent),
    t('connection')+': '+t('network.'+c.connection.browser)+' / '+t('service.'+c.connection.service)
  ].join('\n');
}
