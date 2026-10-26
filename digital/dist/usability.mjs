import {MESSAGES,translate} from './i18n.mjs';
import {PUBLIC_ERROR_KEYS} from './usability-copy.mjs';
// Device preferences contain no profile, credential or answer data.
export const PREFERENCES_KEY='geodecoder.digital.preferences.v1';
const defaults=()=>({sound:false,motionPaused:false,textSize:100,tutorialSeen:false});
function clean(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return defaults();
  return {sound:value.sound===true,motionPaused:value.motionPaused===true,
    textSize:[100,125,150].includes(value.textSize)?value.textSize:100,
    tutorialSeen:value.tutorialSeen===true};
}
export function loadPreferences(storage){
  try{return clean(JSON.parse(storage?.getItem(PREFERENCES_KEY)||'null'));}catch{return defaults();}
}
export function savePreferences(storage,value){
  try{if(!storage?.setItem)return false;storage.setItem(PREFERENCES_KEY,JSON.stringify(clean(value)));return true;}catch{return false;}
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
