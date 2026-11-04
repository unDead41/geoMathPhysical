import {normalizeModuleRecord} from './module-progress.mjs';
import {RULESET} from './core.mjs';

export const isAccount=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const isEventId=value=>typeof value==='string'&&/^[A-Za-z0-9:_.-]{1,160}$/.test(value);
const integer=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;

export function soloPracticePayload(result){
 if(!result)return null;
 return normalizeSoloPayload({attempt_id:result.id,mode:result.mode,ruleset:result.ruleset,
  score:result.score,total:result.total,mistakes:result.mistakes,
  hints:result.hints,skipped:result.skipped,elapsed_ms:result.elapsed});
}
export function normalizeSoloPayload(value){
 if(!value||!isEventId(value.attempt_id)||!['quiz','practice','review'].includes(value.mode)||value.ruleset!==RULESET||
  !integer(value.total,1,15)||value.mode==='quiz'&&value.total!==10||value.mode==='practice'&&value.total!==15||
  !['score','mistakes','hints','skipped'].every(k=>integer(value[k],0,value.total))||
  value.score+value.mistakes+value.skipped!==value.total||!integer(value.elapsed_ms,0,604800000))return null;
 return Object.fromEntries(['attempt_id','mode','ruleset','score','total','mistakes','hints','skipped','elapsed_ms'].map(k=>[k,value[k]]));
}
export function normalizeOfflineEvent(value){
 if(!value||!isAccount(value.owner)||!isEventId(value.id)||value.content_version!==1)return null;
 const payload=value.kind==='module'?normalizeModuleRecord(value.payload):value.kind==='solo'?normalizeSoloPayload(value.payload):null;
 if(!payload)return null;
 return {owner:value.owner,id:value.id,kind:value.kind,content_version:1,payload};
}
