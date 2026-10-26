// Auth SDK owns all credentials and tokens. Temporary verification never persists.
class AccountSecurityError extends Error { constructor(code,message,field) { super(message); this.code=code; this.field=field; } }
function failure(code,message,field='') { return new AccountSecurityError(code,message,field); }
let sessionMutation=Promise.resolve();
export async function withAccountSessionLock(task) {
  // Coordinate this application's shared SDK mutations, including across tabs.
  if(globalThis.navigator?.locks?.request){
    let entered=false;
    try{return await navigator.locks.request('geodecoder.cloud.session-mutation',()=>{entered=true;return task();});}
    catch(error){if(entered)throw error; /* Some private/file origins deny Locks before calling the task. */}
  }
  const previous=sessionMutation;
  let release;sessionMutation=new Promise(resolve=>{release=resolve;});
  await previous;
  try{return await task();}finally{release();}
}
export function securitySessionKey(session) {
  if(!session?.user?.id)return '';
  let id=session.access_token;
  try { const part=session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');id=JSON.parse(atob(part.padEnd(Math.ceil(part.length/4)*4,'='))).session_id||id; } catch {}
  return session.user.id+':'+id;
}
function providerFailure(error,phase) {
  const code=error?.code;
  if(code==='invalid_credentials'||code==='invalid_password')return failure('reauth-failed','Kata laluan semasa tidak tepat. Cuba semula.','current_password');
  if(['session_not_found','session_expired','refresh_token_not_found','bad_jwt','user_not_found'].includes(code)||error?.status===401||error?.status===403)return failure('session-expired','Sesi tamat atau tidak lagi sah. Log masuk semula sebelum mencuba lagi.');
  if(code==='same_password')return failure('same-password','Gunakan kata laluan baharu yang berbeza.','password');
  if(code==='weak_password')return failure('weak-password','Kata laluan ini tidak memenuhi syarat penyedia akaun. Pilih kata laluan yang lebih kukuh.','password');
  if(error?.status===429)return failure('rate-limit','Terlalu banyak cubaan. Tunggu sebentar sebelum mencuba lagi.');
  if(['reauthentication_needed','reauthentication_not_valid'].includes(code))return failure('reauth-failed','Pengesahan tambahan diperlukan oleh penyedia akaun. Log masuk semula atau gunakan pautan reset kata laluan.');
  return phase==='update'?failure('outcome-unknown','Keputusan perubahan belum dapat disahkan. Cuba log masuk menggunakan kata laluan baharu atau gunakan pautan reset sebelum mencuba lagi.'):failure('network','Sambungan keselamatan gagal. Semak Internet dan cuba lagi.');
}
export async function runAccountSecurity({config,createClient,getSession,fetcher=globalThis.fetch,signal,expectedIdentity},action,values={}) {
  if(!['change-password','reset-password','logout-all','logout-others','logout-current'].includes(action))throw failure('invalid-input','Tindakan dibatalkan.');
  if(action.startsWith('logout-')&&Object.keys(values).length)throw failure('invalid-input','Tindakan dibatalkan.');
  const logoutScope=action==='logout-others'?'others':action==='logout-current'?'local':'global';
  if(action==='reset-password'&&(typeof values.password!=='string'||values.password.length<10||values.password.length>128))throw failure('invalid-input','Gunakan kata laluan antara 10 hingga 128 aksara.','password');
  if(action==='change-password') {
    if(typeof values.current_password!=='string'||!values.current_password||values.current_password.length>128)throw failure('invalid-input','Masukkan kata laluan semasa, maksimum 128 aksara.','current_password');
    if(typeof values.password!=='string'||values.password.length<10||values.password.length>128)throw failure('invalid-input','Gunakan kata laluan antara 10 hingga 128 aksara.','password');
    if(values.password!==values.password_confirm)throw failure('invalid-input','Pengesahan kata laluan mesti sama dengan kata laluan baharu.','password_confirm');
  }
  const original=getSession(),identity=securitySessionKey(original);
  if(!identity||!original.access_token||!original.refresh_token)throw failure('session-expired','Sesi tamat. Log masuk semula sebelum mencuba lagi.');
  if(expectedIdentity&&identity!==expectedIdentity)throw failure('session-changed','Sesi akaun berubah. Log masuk semula untuk meneruskan.');
  const check=()=>{if(signal?.aborted)throw failure('cancelled','Tindakan dibatalkan.');if(securitySessionKey(getSession())!==identity)throw failure('session-changed','Sesi akaun berubah. Buka semula halaman keselamatan dan cuba lagi.');};
  let phase='verify',reauthenticated=false,logoutAcknowledged=false,cleaningUp=false,passwordChanged=false;
  const requestSignal=signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000);
  const client=createClient(config.url,config.publishableKey,{
    auth:{storageKey:'geodecoder.security.'+crypto.randomUUID(),persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{fetch:async(input,init)=>{
      const response=await fetcher(input,{...init,signal:cleaningUp?AbortSignal.timeout(5000):requestSignal});
      const url=new URL(typeof input==='string'?input:input.url);
      if(url.origin===new URL(config.url).origin&&url.pathname==='/auth/v1/logout'&&url.searchParams.get('scope')===logoutScope&&response.ok)logoutAcknowledged=true;
      return response;
    }}
  });
  try {
    check();
    const verified=await client.auth.getUser(original.access_token);
    check();
    if(verified.error)throw providerFailure(verified.error,phase);
    if(verified.data?.user?.id!==original.user.id)throw failure('session-changed','Identiti akaun tidak dapat disahkan. Log masuk semula.');
    if(action==='change-password') {
      if(!verified.data.user.email)throw failure('unsupported','Akaun ini memerlukan kaedah pengesahan lain. Gunakan pemulihan akaun.');
      phase='reauth';
      const signedIn=await client.auth.signInWithPassword({email:verified.data.user.email,password:values.current_password});
      reauthenticated=!!signedIn.data?.session;
      check();
      if(signedIn.error)throw providerFailure(signedIn.error,phase);
      if(signedIn.data?.user?.id!==original.user.id||signedIn.data?.session?.user?.id!==original.user.id)throw failure('session-changed','Pengesahan tidak sepadan dengan akaun asal. Tiada perubahan dihantar.');
      phase='update';
      const updated=await client.auth.updateUser({password:values.password,current_password:values.current_password});
      check();
      if(updated.error)throw providerFailure(updated.error,phase);
      if(updated.data?.user?.id!==original.user.id)throw failure('outcome-unknown','Keputusan perubahan belum dapat disahkan. Log masuk semula menggunakan kata laluan baharu atau gunakan pautan reset.');
      return {passwordChanged:true,message:'Kata laluan sudah dikemas kini. Gunakan kata laluan baharu apabila diminta log masuk semula.'};
    }
    phase='logout';
    const bound=await client.auth.setSession({access_token:original.access_token,refresh_token:original.refresh_token});
    check();
    if(bound.error)throw providerFailure(bound.error,phase);
    if(bound.data?.user?.id!==original.user.id||securitySessionKey(bound.data?.session)!==identity)throw failure('session-changed','Sesi akaun berubah. Log masuk semula sebelum mencuba lagi.');
    if(action==='reset-password'){
      phase='update';
      const updated=await client.auth.updateUser({password:values.password});
      check();
      if(updated.error)throw providerFailure(updated.error,phase);
      if(updated.data?.user?.id!==original.user.id)throw failure('outcome-unknown','Keputusan perubahan belum dapat disahkan. Log masuk semula menggunakan kata laluan baharu atau gunakan pautan reset.');
      passwordChanged=true;phase='logout';
    }
    const result=await client.auth.signOut({scope:logoutScope});
    check();
    if(result.error)throw providerFailure(result.error,phase);
    if(!logoutAcknowledged)throw failure('unconfirmed-logout',logoutScope==='global'?'Log keluar semua peranti belum dapat disahkan. Log masuk semula dan cuba lagi.':'Pembatalan sesi belum dapat disahkan. Muat semula senarai sebelum mencuba lagi.');
    if(logoutScope==='others')return {otherSessionsSignedOut:true,message:'Pelayan telah membatalkan sesi lain. Peranti ini kekal log masuk. Token akses sedia ada boleh kekal sah sehingga luput.'};
    if(logoutScope==='local')return {localSignedOut:true,message:'Pelayan telah membatalkan sesi peranti ini. Log masuk semula untuk meneruskan.'};
    return action==='reset-password'
      ? {passwordChanged:true,globalSignedOut:true,message:'Kata laluan sudah dikemas kini. Log masuk menggunakan kata laluan baharu.'}
      : {globalSignedOut:true,message:'Pelayan telah membatalkan sesi semua peranti. Token akses yang telah dikeluarkan mungkin kekal sah sehingga tamat tempoh.'};
  } catch(error) {
    if(passwordChanged)throw failure('password-updated-logout-failed','Kata laluan sudah dikemas kini. Log keluar dan log masuk semula menggunakan kata laluan baharu.');
    if(error instanceof AccountSecurityError)throw error;
    throw providerFailure(error,phase);
  } finally {
    cleaningUp=true;
    if(reauthenticated)try{await client.auth.signOut({scope:'local'});}catch{/* Cleanup is best effort; a disconnected provider may retain the temporary session. */}
    client.auth.stopAutoRefresh?.();
  }
}
