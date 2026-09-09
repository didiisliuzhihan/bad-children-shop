import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';
const owner='11111111-1111-4111-8111-111111111111',drawId='22222222-2222-4222-8222-222222222222',photo=owner+'/33333333-3333-4333-8333-333333333333.png';
const source=fs.readFileSync(new URL('../supabase/functions/bc-account-preview/index.ts',import.meta.url),'utf8');
const code=(await transformWithOxc(source,'edge.ts')).code.replace(/^import[^\n]*\n/gm,'');
function harness(draw={resolved:true,kept:true,result:{type:'toy'}}){
 const tables=[],signed=[];let handler;
 const capsule={id:drawId,toy_id:'tired_crow',obtained_at:'2026-09-08T12:00:00Z'};
 const story={id:'story',text:'今天歇一会儿。',created_at:capsule.obtained_at,media:{id:'photo',storagePath:photo,kind:'photo',origin:'account-file'}};
 const data={bc_account_security:{session_epoch:'epoch'},bc_account_revoked_sessions:null,bc_account_sessions:{session_epoch:'epoch'},bc_account_draws:draw,bc_account_capsules:capsule,bc_nest_stories:story};
 const admin={auth:{getUser:async()=>({data:{user:{id:owner,is_anonymous:false}}})},rpc:async()=>({data:{ok:true},error:null}),
  storage:{from(){return {createSignedUrls:async paths=>{signed.push(paths);return {data:paths.map(path=>({path,signedUrl:'https://test.invalid/'+path,error:null})),error:null}}}}},
  from(name){assert(name in data,'unexpected full collection query: '+name);const row={name,filters:[]};tables.push(row);
   const query=new Proxy({then:resolve=>Promise.resolve({data:structuredClone(data[name]),error:null}).then(resolve)},{get:(target,key)=>key==='then'?target.then:(...args)=>{if(key==='eq')row.filters.push(args);return query}});return query;
  }};
 const env={SUPABASE_URL:'https://test.invalid',SUPABASE_SERVICE_ROLE_KEY:'test-secret',SUPABASE_ANON_KEY:'test-public'};
 vm.runInNewContext(code,{Deno:{env:{get:key=>env[key]},serve:value=>handler=value},createClient:()=>admin,Response,Request,TextEncoder,TextDecoder,File,atob,crypto,Uint8Array});
 const token='header.'+Buffer.from(JSON.stringify({session_id:'test-session',app_metadata:{bc_epoch:'epoch'}})).toString('base64url')+'.signature';
 return {tables,signed,capsule,call:async body=>{const response=await handler(new Request('https://test.invalid/functions/v1/bc-account-preview',{method:'POST',headers:{origin:'http://127.0.0.1:4177',apikey:'test-public',authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body)}));return {status:response.status,body:await response.json()}}};
}
test('actual keep handler returns only the verified committed capsule, without collection or photo queries',async()=>{
 const h=harness(),result=await h.call({action:'life',operation:'keep',requestId:drawId,responseMode:'patch'});
 assert.equal(result.status,200);assert.deepEqual(result.body.patch,{ownerId:owner,capsules:[h.capsule]});assert.equal(h.signed.length,0);
 for(const row of h.tables.filter(row=>['bc_account_draws','bc_account_capsules'].includes(row.name)))assert(row.filters.some(([key,value])=>key==='user_id'&&value===owner));
 assert(!h.tables.some(row=>row.name==='bc_account_profiles'));
});
test('story keep handler returns private photo metadata and never waits for Storage',async()=>{
 const h=harness({resolved:true,kept:true,result:{type:'story',story:{id:'story'}}});
 const result=await h.call({action:'life',operation:'keep',requestId:drawId,responseMode:'patch'});
 assert.equal(result.status,200);assert.equal(result.body.patch.stories[0].source,'nest');assert.equal(result.body.patch.stories[0].media.url,'');assert.equal(result.body.patch.stories[0].media.storagePath,photo);assert.equal(h.signed.length,0);
});
test('opposite decisions cannot be acknowledged as successful after the draw is already resolved',async()=>{
 const returned=harness({resolved:true,kept:false,result:{type:'toy'}});
 assert.equal((await returned.call({action:'life',operation:'keep',requestId:drawId,responseMode:'patch'})).status,409);
 const kept=harness();assert.equal((await kept.call({action:'life',operation:'reject',requestId:drawId,responseMode:'patch'})).status,409);
 assert.equal((await returned.call({action:'life',operation:'reject',requestId:drawId,responseMode:'patch'})).status,200);
});
test('media handler signs one deduplicated owner batch and rejects foreign or oversized requests',async()=>{
 const h=harness(),result=await h.call({action:'media',paths:[photo,photo]});
 assert.equal(result.status,200);assert.equal(h.signed.length,1);assert.equal(h.signed[0].length,1);assert.equal(result.body.urls[0].path,photo);assert(result.body.expiresAt>Date.now());
 assert.equal((await h.call({action:'media',paths:[photo.replace(owner,drawId)]})).status,403);
 assert.equal((await h.call({action:'media',paths:Array(25).fill(photo)})).status,403);assert.equal(h.signed.length,1);
});
