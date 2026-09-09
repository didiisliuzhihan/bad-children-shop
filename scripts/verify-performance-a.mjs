import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadEnv} from 'vite';
import {NEST_ROOM_ID} from '../supabase/functions/bc-account-preview/nestPlacement.mjs';

// Creates one isolated QA account. Never reads/modifies an existing player account.
// Credentials, tokens, recovery codes and signed URLs are never printed or persisted.
if(!process.argv.includes('--live'))throw Error('Live QA requires explicit --live approval.');
const env=loadEnv('production',process.cwd(),'VITE_');
const endpoint=env.VITE_SUPABASE_URL+'/functions/v1/bc-account-preview';
const key=env.VITE_SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_ANON_KEY;
assert.equal(new URL(endpoint).hostname,'kbyobdydythovyagrfgv.supabase.co');
const name='A验收_'+randomUUID().slice(0,8),password=randomUUID().replaceAll('-','');
let token;const results=[];
async function call(label,data,expected=200){
 const start=performance.now(),form=data instanceof FormData;
 const response=await fetch(endpoint,{method:'POST',signal:AbortSignal.timeout(45000),headers:{apikey:key,origin:'http://localhost:4177',...(token?{authorization:'Bearer '+token}:{}),...(!form?{'content-type':'application/json'}:{})},body:form?data:JSON.stringify(data)});
 const body=await response.json();
 assert.equal(response.status,expected,label+': '+(body.error||'unexpected status'));
 results.push({check:label,status:response.status,ms:Math.round(performance.now()-start)});
 console.log(JSON.stringify(results.at(-1)));return body;
}
const patch={responseMode:'patch',deferMedia:true};
try{
 const created=await call('register-isolated-account',{action:'register',name,password});
 token=created.session?.access_token;assert(token);
 const empty=await call('deferred-empty-load',{action:'load',deferMedia:true});
 const owner=empty.profile.user_id;assert.equal(empty.capsules.length,0);
 const requestId=randomUUID();
 const draw=await call('draw',{action:'life',operation:'draw',requestId,...patch});
 assert.equal(draw.type,'toy');
 const kept=await call('keep-small-confirmed-patch',{action:'life',operation:'keep',requestId,...patch});
 assert.equal(kept.patch.ownerId,owner);assert.equal(kept.patch.capsules[0].id,requestId);assert(!kept.profile);
 const again=await call('keep-identical-retry',{action:'life',operation:'keep',requestId,...patch});
 assert.deepEqual(again.patch,kept.patch);
 await call('reject-kept-conflict',{action:'life',operation:'reject',requestId,...patch},409);
 const nextId=randomUUID();await call('second-draw',{action:'life',operation:'draw',requestId:nextId,...patch});
 await call('reject',{action:'life',operation:'reject',requestId:nextId,...patch});
 await call('keep-rejected-conflict',{action:'life',operation:'keep',requestId:nextId,...patch},409);
 const quest=await call('quest-small-patch',{action:'quest',operation:'save',toyId:kept.patch.capsules[0].toy_id,...patch});
 assert.equal(quest.patch.document.key,'quests');assert(!quest.profile);
 const nest={action:'save',key:'nest',revision:0,value:{version:1,roomId:NEST_ROOM_ID,placements:[]},...patch};
 const saved=await call('save-nest-small-patch',nest);assert.equal(saved.patch.document.revision,1);
 const retried=await call('save-exact-retry',nest);assert.equal(retried.patch.document.revision,1);
 await call('save-next-revision',{...nest,revision:1});
 await call('stale-save-conflict',nest,409);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6WQAAAABJRU5ErkJggg==','base64');
 const form=new FormData();form.set('file',new Blob([png],{type:'image/png'}),'qa.png');form.set('width','1');form.set('height','1');
 const uploaded=await call('upload-private-qa-pixel',form);
 assert(uploaded.media.storagePath.startsWith(owner+'/'));
 const draft={id:randomUUID(),source:'player',text:'隔离验收，不投放公共池。',signature:'发布验收',stampId:'shop-default',createdAt:new Date().toISOString(),media:uploaded.media};
 const postcard=await call('save-private-draft',{action:'save',key:'postcards',revision:0,value:{drafts:[draft]},...patch});
 assert.equal(postcard.patch.document.value.drafts[0].media.url,'');
 const loaded=await call('deferred-load-after-keep',{action:'load',deferMedia:true});
 assert.equal(loaded.capsules.length,1);assert.equal(loaded.documents.postcards.value.drafts[0].media.url,'');
 const path=uploaded.media.storagePath;
 const media=await call('batched-private-photo',{action:'media',paths:[path,path]});
 assert.equal(media.urls.length,1);assert.equal(media.urls[0].path,path);assert(media.urls[0].url);
 const photo=await fetch(media.urls[0].url,{signal:AbortSignal.timeout(45000)});assert.equal(photo.status,200);assert.deepEqual(Buffer.from(await photo.arrayBuffer()),png);
 await call('foreign-photo-rejected',{action:'media',paths:[randomUUID()+'/'+randomUUID()+'.png']},403);
 await call('oversized-batch-rejected',{action:'media',paths:Array(25).fill(path)},403);
 const legacy=await call('legacy-client-compatible',{action:'load'});
 assert.equal(legacy.capsules.length,1);assert(legacy.documents.postcards.value.drafts[0].media.url.startsWith('https://'));
 console.log(JSON.stringify({passed:true,checks:results.length,scope:'One new QA account; no player data changed. Private QA pixel is not shared.'}));
}finally{
 if(token){await call('sign-out-QA-session',{action:'logout'});await call('signed-out-session-rejected',{action:'load'},401);}
}
