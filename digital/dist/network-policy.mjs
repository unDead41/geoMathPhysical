// Transport policy only: never owns account data, game scores or server clocks.
const unit=value=>Math.min(1,Math.max(0,Number(value)||0));
export function parseRetryAfter(value,now=Date.now()){
  if(typeof value!=='string'||!value.trim())return 0;
  const seconds=Number(value);
  const delay=Number.isFinite(seconds)?seconds*1000:Date.parse(value)-now;
  return Number.isFinite(delay)?Math.max(0,delay):0;
}
export function retryDelay(attempt,{baseMs=300,maxMs=30000,random=Math.random,retryAfterMs=0}={}){
  const ceiling=Math.min(maxMs,baseMs*2**Math.min(10,Math.max(0,attempt)));
  return Math.max(retryAfterMs,Math.round(ceiling*(0.5+unit(random())*0.5)));
}
export const transientError=code=>['network_error','server_error','rate_limited'].includes(code);
export function duelPollDelay(snapshot,{hidden=false,failures=0,random=Math.random}={}){
  if(['complete','cancelled','expired'].includes(snapshot?.room?.status))return null;
  const base=failures?Math.min(30000,5000*2**Math.min(failures-1,4)):
    hidden?30000:snapshot?.room?.status==='countdown'?1000:
    snapshot?.room?.status==='playing'?4000:5000;
  return Math.round(base*(1+unit(random())*0.25));
}

// Bounded, memory-only cache. The caller must check the actual SDK identity
// before and after every access, including a hit. Never cache a rejected load.
export class ScopedRequestCache {
  constructor({ttlMs=1000,maxEntries=8,now=Date.now}={}){this.ttlMs=ttlMs;this.maxEntries=maxEntries;this.now=now;this.entries=new Map();}
  clear(){this.entries.clear();}
  get(key,load){
    const old=this.entries.get(key);
    if(old&&(old.pending||old.expiresAt>this.now()))return old.promise.then(value=>structuredClone(value));
    this.entries.delete(key);
    while(this.entries.size>=this.maxEntries)this.entries.delete(this.entries.keys().next().value);
    const entry={pending:true,expiresAt:0,promise:null};
    entry.promise=Promise.resolve().then(load).then(value=>{
      entry.pending=false;entry.expiresAt=this.now()+this.ttlMs;return value;
    },error=>{if(this.entries.get(key)===entry)this.entries.delete(key);throw error;});
    this.entries.set(key,entry);return entry.promise.then(value=>structuredClone(value));
  }
}
