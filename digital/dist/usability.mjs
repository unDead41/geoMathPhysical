import {MESSAGES,translate} from './i18n.mjs';
import {PUBLIC_ERROR_KEYS} from './usability-copy.mjs';
import {createPreferences,textSize,PREFERENCES_KEY} from './preferences.mjs';
// Device preferences contain no profile, credential or answer data.
export {PREFERENCES_KEY};
const defaults=()=>({sound:false,motionPaused:false,textSize:100,tutorialSeen:false});
function clean(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return defaults();
  return {sound:value.sound===true,motionPaused:value.motionPaused===true,
    textSize:[100,125,150].includes(value.textSize)?value.textSize:100,
    tutorialSeen:value.tutorialSeen===true};
}
export function loadPreferences(storage){
  const value=createPreferences(storage).value;
  return {sound:value.effects,motionPaused:value.motion==='reduce',textSize:textSize(value.text),tutorialSeen:value.tutorialSeen};
}
export function savePreferences(storage,value){
  const next=clean(value),owner=createPreferences(storage);
  owner.set({effects:next.sound,motion:next.motionPaused?'reduce':'system',text:({100:'normal',125:'large',150:'largest'})[next.textSize],tutorialSeen:next.tutorialSeen});
  return !owner.failed;
}

export function reviewQuestionIds(result,bank){
  const valid=new Set(bank.map(question=>question.id));
  return [...new Set((Array.isArray(result?.answers)?result.answers:[])
    .filter(answer=>answer&&['wrong','skipped'].includes(answer.outcome)&&valid.has(answer.id))
    .map(answer=>answer.id))];
}

export function friendlyError(error,language='ms'){
  const message=typeof error==='string'?error:String(error?.message||'');
  const code=String(error?.code||'')+' '+message;
  let key;
  if(Object.hasOwn(PUBLIC_ERROR_KEYS,message))key=PUBLIC_ERROR_KEYS[message];
  else if(/jwt.*expir|session.*expir|sesi.*tamat/i.test(code))key='ease.sessionExpired';
  else if(/rate.?limit|too many|terlalu banyak/i.test(code))key='ease.waitError';
  else if(/email.*not.*confirm|email.*belum.*sah|sahkan.*email/i.test(code))key='ease.confirmEmail';
  else if(/invalid.*credentials|pengguna.*kata laluan.*(?:salah|tidak sah)/i.test(code))key='ease.invalidLogin';
  else if(/fetch|network|timeout|connection|sambungan.*(?:gagal|terganggu)/i.test(code))key='ease.connectionError';
  else if(/email.*(?:dihantar|delivery|send)/i.test(code))key='ease.emailFailed';
  else key=Object.hasOwn(MESSAGES.ms,message)?message:'ease.genericError';
  return translate(language,key);
}
