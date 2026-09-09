import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {transformWithOxc} from 'vite';
import {createPrivateMediaCache} from '../src/lib/privateMediaCache.ts';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const media={id:'photo',storagePath:'owner/photo.png',url:'',kind:'photo',origin:'account-file',label:'当时的小窝'};
async function harness(){
 const slots=[],calls=[],observers=[];let cursor=0,pending=[],owner='owner';
 const account={profile:{user_id:owner},mediaUrls:async paths=>{calls.push(paths);return {expiresAt:Date.now()+3600000,urls:paths.map(path=>({path,url:'https://private.invalid/'+path+'?attempt='+calls.length}))}}};
 const context={privateMediaCache:createPrivateMediaCache(),useAccount:()=>account,
  IntersectionObserver:class{constructor(callback){this.callback=callback;observers.push(this)}observe(){}disconnect(){}},
  useState(initial){const i=cursor++;slots[i]??={value:initial};return [slots[i].value,v=>slots[i].value=typeof v==='function'?v(slots[i].value):v]},
  useRef(initial){const i=cursor++;slots[i]??={current:initial};return slots[i]},
  useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j])))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()}})},
 };
 const result=await transformWithOxc(read('src/lib/usePostcardMedia.ts'),'hook.ts');
 vm.runInNewContext(result.code.replace(/^import[^\n]*\n/gm,'').replace(/^export function /gm,'function ')+'\nglobalThis.hook=usePostcardMedia;',context);
 const render=(input=media,active=true,thumbnail=false)=>{cursor=0;pending=[];const value=context.hook(input,active,thumbnail);value.ref.current={};pending.forEach(fn=>fn());return value};
 const flush=async()=>{for(let n=0;n<24;n++)await Promise.resolve()};
 return {render,flush,calls,account,near:()=>observers.at(-1).callback([{isIntersecting:true}]),close(){slots.forEach(s=>s?.cleanup?.());context.privateMediaCache.clear()}};
}
test('private photo descriptors do not request links until visible; hidden tabs stay idle',async()=>{
 const h=await harness();try{
  h.render(media,false);await h.flush();assert.equal(h.calls.length,0);
  let state=h.render();await h.flush();assert.equal(h.calls.length,0);assert.equal(state.media.url,'');
  h.near();h.render();await h.flush();state=h.render();assert.equal(h.calls.length,1);assert.match(state.media.url,/private.invalid/);
  h.render({...media,id:'another',storagePath:'owner/another.png'},false);await h.flush();assert.equal(h.calls.length,1);
 }finally{h.close()}
});
test('expired/broken images retry once automatically and then expose an explicit retry',async()=>{
 const h=await harness();try{
  h.render();h.near();h.render();await h.flush();let state=h.render();state.imageFailed();h.render();await h.flush();state=h.render();
  assert.equal(h.calls.length,2);assert(state.media.url.endsWith('attempt=2'));
  state.imageFailed();state=h.render();assert(state.error);assert.equal(h.calls.length,2);
  state.retry();h.render();await h.flush();assert.equal(h.calls.length,3);
 }finally{h.close()}
});
test('a previous account media URL never appears after account switch',async()=>{
 const h=await harness();try{
  h.render();h.near();h.render();await h.flush();assert(h.render().media.url);
  h.account.profile={user_id:'different'};const state=h.render({...media,url:'https://old-private.invalid/photo'});
  assert.equal(state.media,null);assert.match(state.error,/其他账户/);await h.flush();assert.equal(h.calls.length,1);
 }finally{h.close()}
});
test('thumbnails sign only the still poster, not a video payload',async()=>{
 const h=await harness(),clip={...media,kind:'video',storagePath:'owner/clip.mp4',posterStoragePath:'owner/still.png'};try{
  h.render(clip,true,true);h.near();h.render(clip,true,true);await h.flush();const state=h.render(clip,true,true);
  assert.deepEqual(h.calls,[['owner/still.png']]);assert.equal(state.media.url,'');assert(state.media.posterUrl);
 }finally{h.close()}
});
test('deferred account load returns ownership-checked descriptors without contacting image storage',async()=>{
 const edge=read('supabase/functions/bc-account-preview/index.ts'),chunk=edge.slice(edge.indexOf('function describeMedia('),edge.indexOf('async function signStoryMedia('));
 const queries=[];const context={readAllCapsules:async()=>[{id:'capsule',obtained_at:'2026-09-08',toy_id:'crow'}],check:error=>{if(error)throw error},ownMediaPath:(path,uid)=>path.startsWith(uid+'/'),ApiError:Error,
  admin:{storage:{from(){throw Error('metadata must not contact Storage')}},from(table){queries.push(table);const result=table==='bc_account_profiles'?{user_id:'owner'}:table==='bc_account_documents'?[{key:'postcards',value:{drafts:[{media}]}}]:[{id:'story',text:'hello',created_at:'2026-09-08',media}];const builder=new Proxy({then:yes=>Promise.resolve({data:structuredClone(result),error:null}).then(yes)},{get:(target,key)=>key==='then'?target.then:()=>builder});return builder}},
 };
 vm.runInNewContext((await transformWithOxc(chunk,'load.ts')).code+'\nglobalThis.load=load;',context);const state=await context.load('owner',true);
 assert.equal(state.stories[0].media.url,'');assert.equal(state.stories[0].media.storagePath,media.storagePath);assert.equal(state.documents.postcards.value.drafts[0].media.url,'');assert.equal(state.capsules.length,1);
});
