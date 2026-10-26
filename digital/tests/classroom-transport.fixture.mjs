// Intercepted transport only: actual portal UI, no live account or backend write.
export async function classroomFixture(context,role,{finishedState,snapshotFailures=0}={}){
  const id=role==='teacher'?'10000000-0000-4000-8000-000000000001':'10000000-0000-4000-8000-000000000002';
  const profile={id,role,display_name:'Guru',username:role+'_fixture'};
  const session={access_token:'fixture-access-token',refresh_token:'fixture-refresh-token',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user:{id,aud:'authenticated',role:'authenticated',email:'fixture@example.invalid',app_metadata:{provider:'email'},user_metadata:{}}};
  const actions=[];
  await context.addInitScript(value=>{if(window.top===window.self)localStorage.setItem('geodecoder.cloud.auth',JSON.stringify(value));},session);
  await context.route('https://fkrlwzxvyufndavlpzbp.supabase.co/**',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(request.method()==='OPTIONS'){await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});return;}
    if(url.pathname==='/rest/v1/rpc/geo_module_progress'){
      const {action}=request.postDataJSON();
      if(!['mine','class'].includes(action))throw new Error('Fixture prohibits module writes: '+action);
      await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({records:[],students:[]})});return;
    }
    if(url.pathname==='/rest/v1/rpc/geo_action'){
      const {action,payload}=request.postDataJSON();actions.push(action);
      if(!['snapshot','heartbeat'].includes(action))throw new Error('Fixture prohibits writes: '+action);
      if(action==='snapshot'&&snapshotFailures>0){snapshotFailures--;await route.abort('connectionreset');return;}
      const data=action==='snapshot'?{profile,server_now:new Date().toISOString(),classes:[{id:'20000000-0000-4000-8000-000000000001',name:'Bilik',pin:'654321',pin_expires_at:new Date(Date.now()+86400000).toISOString(),members:[{id:'10000000-0000-4000-8000-000000000002',display_name:'Pelajar',username:'student_fixture',last_seen:new Date().toISOString()}]}],invites:[],rooms:[{id:'30000000-0000-4000-8000-000000000001',class_id:'20000000-0000-4000-8000-000000000001',class_name:'Bilik',name:'Kelas',status:'open',members_count:1,is_member:true}]}:{};
      if(action==='snapshot'&&finishedState){
        data.rooms[0].status='closed';
        if(payload?.room_id)data.room={...data.rooms[0],players:[],my_attempt:finishedState};
      }
      await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(data)});return;
    }
    if(url.pathname==='/rest/v1/rpc/geo_module_progress'){
      // v2.6 portal reads formative module progress alongside its room snapshot.
      // This fixture still prohibits saving progress, scores or answers.
      const {action,payload}=request.postDataJSON();
      if(!['mine','class'].includes(action))throw new Error('Fixture prohibits module writes: '+action);
      const data=action==='mine'?{records:[]}:{class_id:payload.class_id,students:[]};
      await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(data)});return;
    }
    throw new Error('Unexpected fixture request: '+request.method()+' '+url.pathname);
  });
  return actions;
}
