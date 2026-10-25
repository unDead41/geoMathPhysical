// Username/email authentication. Privileged keys stay in Edge secrets.
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
const USERNAME=/^[a-z0-9_]{3,24}$/;
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUTH_REDIRECT='https://undead41.github.io/geodecoder-digital/';
const usableEmail=value=>typeof value==='string'&&value.length<=254&&EMAIL.test(value)&&!value.endsWith('@accounts.geodecoder.invalid');
const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers:{...CORS,'Content-Type':'application/json','Cache-Control':'no-store'}});
export async function sha256(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');}
export function validateAuthInput(input){
  const username=typeof input.username==='string'?input.username.trim().toLowerCase():'';
  if(!(input.action==='login'&&usableEmail(username))&&!USERNAME.test(username))throw Error('Masukkan email atau nama pengguna yang sah.');
  if(typeof input.password!=='string'||input.password.length<10||input.password.length>128)throw Error('Kata laluan mesti 10–128 aksara.');
  if(!['signup','login','recover'].includes(input.action))throw Error('Tindakan akaun tidak sah.');
  if(input.action==='signup'&&(!['teacher','student'].includes(input.role)||typeof input.display_name!=='string'||input.display_name.trim().length<2||input.display_name.trim().length>60))throw Error('Masukkan nama 2–60 aksara dan pilih Guru atau Pelajar.');
  const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
  if(input.action==='signup'&&!usableEmail(email))throw Error('Masukkan alamat email yang sah untuk pengesahan dan pemulihan akaun.');
  if(input.action==='recover'&&(typeof input.recovery_code!=='string'||!/^[a-f0-9]{32}$/.test(input.recovery_code.trim().toLowerCase())))throw Error('Masukkan kod pemulihan 32 aksara yang diterima semasa daftar.');
  return {...input,username,...(input.action==='signup'?{email}:{})};
}
export function makeAuthHandler({url,serviceKey,publicKey,fetcher=fetch}){
  async function api(path,body,method='POST',token=serviceKey){
    const response=await fetcher(url+path,{method,headers:{apikey:token===serviceKey?serviceKey:publicKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===null?{}:{body:JSON.stringify(body)})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data?.error){const e=Error(data?.error?.message||data?.msg||data?.message||'Perkhidmatan akaun tidak tersedia.');e.status=response.status;e.remoteCode=data?.code||data?.error_code||'remote_error';e.operation=path.split('?')[0];throw e;}
    return data;
  }
  async function rpc(name,body){return api('/rest/v1/rpc/'+name,body);}
  async function token(email,password){
    const session=await api('/auth/v1/token?grant_type=password',{email,password},'POST',publicKey);
    return session;
  }
  return async request=>{
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
    if(request.method!=='POST')return reply(405,{error:'Gunakan permintaan POST.'});
    if(!url||!serviceKey||!publicKey)return reply(503,{error:'Perkhidmatan akaun belum dikonfigurasi.'});
    let input;
    try{const text=await request.text();if(text.length>4096)return reply(413,{error:'Maklumat terlalu panjang.'});input=validateAuthInput(JSON.parse(text));}
    catch(e){return reply(400,{error:e instanceof SyntaxError?'Maklumat akaun tidak sah.':e.message});}
    try{
      const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
      const ipHash=await sha256(serviceKey+'|'+ip),userHash=await sha256(serviceKey+'|'+input.username);
      const allowed=await rpc('geo_rate_guard',{p_key:'auth:'+input.action+':'+ipHash,p_limit:input.action==='signup'?100:180,p_window:600});
      const userAllowed=await rpc('geo_rate_guard',{p_key:'account:'+userHash,p_limit:20,p_window:600});
      if(!allowed||!userAllowed)return reply(429,{error:'Terlalu banyak cubaan. Cuba lagi selepas 10 minit.'});
      const identity=input.username.includes('@')?null:await rpc('geo_identity',{p_username:input.username});
      if(input.action==='signup'){
        if(identity?.user_id)return reply(409,{error:'Username telah digunakan. Pilih username lain.'});
        // GoTrue sends the confirmation email. The database trigger creates the
        // profile in the same transaction, enforcing username uniqueness. Never
        // mark a user-supplied email as verified through the admin API.
        await api('/auth/v1/signup?redirect_to='+encodeURIComponent(AUTH_REDIRECT),{email:input.email,password:input.password,data:{geodecoder:{username:input.username,display_name:input.display_name.trim(),role:input.role}}},'POST',publicKey);
        return reply(200,{confirmation_required:true,email:input.email,message:'Semak email anda untuk mengesahkan akaun sebelum log masuk.'});
      }
      if(input.action==='recover'){
        const digest=await sha256(input.recovery_code.trim().toLowerCase());
        let mismatch=identity?.recovery_hash?.length===64?0:1;
        for(let i=0;i<64;i++)mismatch|=digest.charCodeAt(i)^(identity?.recovery_hash?.charCodeAt(i)||0);
        if(mismatch||!identity?.user_id||!identity.auth_email?.endsWith('@accounts.geodecoder.invalid'))return reply(400,{error:'Username atau kod pemulihan tidak tepat. Akaun beremail menggunakan pautan reset email.'});
        await api('/auth/v1/admin/users/'+identity.user_id,{password:input.password},'PUT');
        const session=await token(identity.auth_email,input.password);
        await api('/auth/v1/logout?scope=global',null,'POST',session.access_token);
        return reply(200,{message:'Kata laluan dikemas kini. Log masuk semula.'});
      }
      try{return reply(200,{session:await token(input.username.includes('@')?input.username:identity?.auth_email||crypto.randomUUID()+'@accounts.geodecoder.invalid',input.password)});}
      catch(e){return reply(e.remoteCode==='email_not_confirmed'?403:401,{error:e.remoteCode==='email_not_confirmed'?'Sahkan akaun melalui pautan email dahulu. Anda boleh meminta email pengesahan baharu.':'Email, nama pengguna atau kata laluan tidak tepat.'});}
    }catch(e){console.error(JSON.stringify({event:'auth_service_error',operation:e.operation||'unknown',status:e.status||0,code:e.remoteCode||'unexpected'}));return reply(e.status===429?429:503,{error:e.status===429?'Terlalu banyak cubaan. Tunggu sebentar sebelum mencuba lagi.':input.action==='signup'?'Pendaftaran email belum dapat diselesaikan. Cuba lagi kemudian.':'Perkhidmatan akaun tidak dapat dihubungi. Cuba lagi sebentar.'});}
  };
}
if(typeof Deno!=='undefined')Deno.serve(makeAuthHandler({url:Deno.env.get('SUPABASE_URL'),serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),publicKey:Deno.env.get('SUPABASE_ANON_KEY')}));
