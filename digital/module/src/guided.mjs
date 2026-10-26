/** Formative learning gates. Earned records and the current experiment are separate. */
export const GUIDED_KINDS=['net','volume','area','composite'];
const guidedStages=['prediction','experiment','check','explanation'];
function guidedCopy(value){return JSON.parse(JSON.stringify(value));}
export function validGuidedRecord(r){
 if(!r||!GUIDED_KINDS.includes(r.activity)||!guidedStages.includes(r.stage)||typeof r.completed!=='boolean'||!['prediction','result','explanation'].every(k=>typeof r[k]==='string'&&r[k].length<=(k==='prediction'?240:600)))return false;
 if(!r.prediction.trim()||(['experiment','check','explanation'].includes(r.stage)&&!r.result.trim())||(r.stage==='explanation'&&!r.explanation.trim()))return false;
 return !r.completed||r.stage==='explanation';
}
export class GuidedActivity{
 constructor(activity){this.activity=activity;this.record={activity,stage:'prediction',prediction:'',result:'',explanation:'',completed:false};this.retry();}
 retry(){this.draft={activity:this.activity,stage:'prediction',prediction:'',result:'',explanation:'',completed:false};this.observed=false;this.checked=false;}
 predict(text){text=String(text).trim().slice(0,240);if(!text)return false;this.retry();this.draft.prediction=text;this.draft.stage='prediction';this.save();return true;}
 invalidateCheck(){this.checked=false;this.draft.completed=false;this.draft.explanation='';if(this.observed)this.draft.stage='experiment';}
 edit(){this.observed=false;this.invalidateCheck();this.draft.result='';if(this.draft.prediction)this.draft.stage='prediction';}
 observe(result){result=String(result).trim().slice(0,600);if(!this.draft.prediction||!result)return false;this.invalidateCheck();this.observed=true;this.draft.result=result;this.draft.stage='experiment';this.save();return true;}
 check(correct){this.invalidateCheck();this.checked=Boolean(this.observed&&correct);if(this.checked){this.draft.stage='check';this.save();}return this.checked;}
 complete(text){text=String(text).trim().slice(0,600);if(!this.observed||!this.checked||!text)return false;this.draft.explanation=text;this.draft.stage='explanation';this.draft.completed=true;this.save();return true;}
 save(){if(!validGuidedRecord(this.draft))return;if(!this.record.completed||this.draft.completed)this.record=guidedCopy(this.draft);}
 restore(record){if(validGuidedRecord(record)&&record.activity===this.activity){this.record=guidedCopy(record);/* Restored self-report never unlocks the live experimental gate. */}}
}
export class LabHistory{
 constructor(limit=30){this.limit=limit;this.items=[];}
 push(value){const copy=guidedCopy(value);if(JSON.stringify(copy)===JSON.stringify(this.items.at(-1)))return;this.items.push(copy);if(this.items.length>this.limit)this.items.shift();}
 undo(){return this.items.length?guidedCopy(this.items.pop()):null;}
 get size(){return this.items.length;}
}
/** Elapsed active time only: pause/resume and stepping share the same cursor. */
export class LabMotion{
 constructor(get,set,to,duration,done=null,easing=t=>t){Object.assign(this,{get,set,to,duration:Math.max(1,duration),done,easing,from:get(),elapsed:0,finished:false});}
 advance(dt,speed=1){if(this.finished)return;this.elapsed=Math.min(this.duration,this.elapsed+Math.max(0,dt)*speed);const t=this.elapsed/this.duration;this.set(this.from+(this.to-this.from)*this.easing(t));if(t===1){this.set(this.to);this.finished=true;const callback=this.done;this.done=null;if(callback)callback();}}
}
export function acceptModuleContext(event,parentWindow){const d=event.data;if(event.source!==parentWindow||!d||d.type!=='geodecoder:module-context'||d.protocol!==1||typeof d.session!=='string'||!d.session.trim()||d.session.length>256||!['light','dark'].includes(d.theme)||!Array.isArray(d.progress))return null;return {session:d.session,theme:d.theme,progress:d.progress.filter(validGuidedRecord).map(guidedCopy)};}
