export function stagingTarget(value,allowedHost,enabled){
  if(enabled!=='yes')throw Error('Set ALLOW_STAGING_LOAD=yes for an isolated staging target.');
  const match=/^(https?):\/\/([a-z0-9.-]+)(?::([0-9]{1,5}))?\/?$/i.exec(value||'');
  if(!match)throw Error('TARGET_ORIGIN must be an origin without credentials, path or query.');
  const host=match[2].toLowerCase(),local=['localhost','127.0.0.1'].includes(host);
  if(host.endsWith('.')||host.includes('..'))throw Error('Use a canonical staging hostname without a trailing dot.');
  if(host==='fkrlwzxvyufndavlpzbp.supabase.co'||host==='undead41.github.io')throw Error('Production GeoMath is never a load-test target.');
  if(!local&&(match[1]!=='https'||host!==allowedHost))throw Error('An HTTPS staging host must exactly match STAGING_HOST.');
  return value.replace(/\/$/,'');
}
export function workloadCounts(users=100,workload='mixed'){
  if(!Number.isInteger(users)||users<2||users>5000||!['mixed','duel'].includes(workload))throw Error('LOAD_USERS must be 2..5000; WORKLOAD is mixed or duel.');
  const duelUsers=workload==='duel'?users:Math.max(2,Math.floor(users*0.1/2)*2);
  if(duelUsers%2)throw Error('All-Duel LOAD_USERS must be even.');
  const classroom=workload==='duel'?0:Math.floor(users*0.2);
  return {module:users-duelUsers-classroom,classroom,duelPairs:duelUsers/2,users};
}
// Called only inside SharedArray's once-per-test callback. Decode locally for
// early diagnostics; setup still verifies each identity with the staging API.
export function validateClassroomFixtures(users,minimumUsers,decodeBase64Url,nowSeconds=Date.now()/1000){
  if(!Array.isArray(users))throw Error('Classroom fixtures must be a JSON array.');
  if(users.length<minimumUsers)throw Error('Provide a unique disposable classroom account per possible VU.');
  const identities=new Set(),tokens=new Set();
  for(const user of users){
    if(!user||typeof user.userId!=='string'||!user.userId.trim()||typeof user.accessToken!=='string'||!user.accessToken.trim())throw Error('Each classroom fixture needs a userId and accessToken.');
    if(identities.has(user.userId)||tokens.has(user.accessToken))throw Error('Classroom fixtures must use distinct account identities and access tokens.');
    identities.add(user.userId);tokens.add(user.accessToken);
    let claims;
    try{
      const parts=user.accessToken.split('.');
      if(parts.length!==3||parts.some(part=>!part||!/^[a-zA-Z0-9_-]+$/.test(part)))throw Error();
      claims=JSON.parse(decodeBase64Url(parts[1]));
    }catch{throw Error('Classroom fixtures need valid JWT access tokens.');}
    if(!claims||claims.sub!==user.userId)throw Error('Classroom fixture userId must match the JWT subject.');
    if(!Number.isFinite(claims.exp)||claims.exp<=nowSeconds)throw Error('Classroom fixture access tokens must be unexpired; regenerate staging sessions.');
  }
  return users;
}
