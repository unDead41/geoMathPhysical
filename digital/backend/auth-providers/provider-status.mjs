import {CLOUD_CONFIG} from '../../dist/cloud-config.mjs';

// GET only. Never log the response body, request headers, keys or user data.
const flag=value=>typeof value==='boolean'?value:null;

try {
  const endpoint=new URL('/auth/v1/settings',CLOUD_CONFIG.url);
  if(endpoint.protocol!=='https:'||!CLOUD_CONFIG.publishableKey)throw Error('config');
  const response=await fetch(endpoint,{
    method:'GET',
    headers:{apikey:CLOUD_CONFIG.publishableKey},
    redirect:'error',
    signal:AbortSignal.timeout(10000)
  });
  if(!response.ok){
    console.error(`Provider status unavailable (HTTP ${response.status}).`);
    process.exitCode=1;
  }else{
    const settings=await response.json();
    console.log(JSON.stringify({
      checked_at:new Date().toISOString(),
      external:{google:flag(settings.external?.google),phone:flag(settings.external?.phone)},
      disable_signup:flag(settings.disable_signup),
      mailer_autoconfirm:flag(settings.mailer_autoconfirm),
      phone_autoconfirm:flag(settings.phone_autoconfirm)
    },null,2));
  }
}catch{
  console.error('Provider status unavailable. Check the public configuration and connection.');
  process.exitCode=1;
}
