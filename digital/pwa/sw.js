/* Public application resources only. Auth, RPCs and user data bypass this cache. */
const VERSION=__GEOMATH_VERSION__;
const ASSETS=__GEOMATH_ASSETS__;
const BASE=new URL(self.registration.scope);
const PREFIX='geodecoder-offline:'+BASE.pathname+':';
const NAME=PREFIX+VERSION;
const urls=ASSETS.map(asset=>new URL(asset,BASE).href);
let preparation=null;
async function ready(){
 if(!await caches.has(NAME))return false;
 const cache=await caches.open(NAME);
 for(const url of urls)if(!await cache.match(url))return false;
 return true;
}
function prepare(){
 if(preparation)return preparation;
 preparation=(async()=>{
  if(await ready())return true;
  const cache=await caches.open(NAME);
  try{
   for(const url of urls){
    const response=await fetch(new Request(url,{cache:'reload',credentials:'omit',redirect:'error'}));
    if(!response.ok||response.redirected||response.type==='opaque')throw Error('Offline asset unavailable');
    await cache.put(url,response);
   }
   return await ready();
  }catch(error){await caches.delete(NAME);throw error;}
 })();
 preparation.finally(()=>{preparation=null;}).catch(()=>{});return preparation;
}
self.addEventListener('install',event=>event.waitUntil(prepare()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==NAME)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{
 if(event.data?.type==='GEOMATH_ACTIVATE'){void self.skipWaiting();return;}
 if(!['GEOMATH_STATUS','GEOMATH_PREPARE'].includes(event.data?.type))return;
 event.waitUntil((async()=>{
  try{const complete=event.data.type==='GEOMATH_PREPARE'?await prepare():await ready();event.ports[0]?.postMessage({ready:complete,version:VERSION});}
  catch{event.ports[0]?.postMessage({ready:false,error:true});}
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==BASE.origin||url.search||request.headers.has('authorization'))return;
 const navigation=request.mode==='navigate'&&(url.pathname===BASE.pathname||url.pathname===new URL('index.html',BASE).pathname);
 const key=navigation?urls[0]:url.href;
 if(!urls.includes(key))return;
 event.respondWith((async()=>{
  const cached=await caches.match(key,{cacheName:NAME});
  return cached||fetch(request);
 })());
});
