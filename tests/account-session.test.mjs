import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';
import {accountName,accountPassword,recoveryToken,ACCOUNT_PREVIEW_SESSION} from '../src/lib/accountContract.mjs';
import {applyAccountPatch,accountSessionKey} from '../src/lib/accountSnapshot.ts';

const kept={id:'draw-1',toy_id:'tired_crow',obtained_at:'2026-09-08T12:00:00Z'};
test('keep acknowledgement updates collection immediately without any full reload or media request',async()=>{
 const h=await harness();try{
  h.emit('INITIAL_SESSION',token('owner'));await h.flush();
  h.setReply(async data=>{assert.equal(data.action,'life');return response(200,{ok:true,patch:{ownerId:'owner',capsules:[kept]}})});
  await h.render().homeLife('keep',{requestId:kept.id});const state=await h.flush();
  assert.equal(state.capsules.length,1);assert.equal(state.capsules[0].synced,true);
  assert.deepEqual(h.requests.map(r=>r.action),['load','life']);
  for(const entry of ['src/components/CommunityShop.tsx','review/community.tsx'])assert(!read(entry).includes("'keep',{requestId:draw.id});await account.reload()"));
 }finally{h.unmount()}
});
test('same-session token refresh cannot reject a pending save or cause another collection read',async()=>{
 const h=await harness();let finish;try{
  h.emit('INITIAL_SESSION',token('owner'));await h.flush();
  h.setReply(()=>new Promise(resolve=>finish=resolve));
  const job=h.render().homeLife('keep',{requestId:kept.id});await h.flush();
  h.emit('TOKEN_REFRESHED',token('owner'));await h.flush();assert.equal(h.requests.length,2);
  finish(response(200,{ok:true,patch:{ownerId:'owner',capsules:[kept]}}));await job;
  assert.equal((await h.flush()).capsules.length,1);
 }finally{h.unmount()}
});
test('an older full snapshot cannot remove a more recently confirmed capsule',async()=>{
 const h=await harness();let old;try{
  h.emit('INITIAL_SESSION',token('owner'));await h.flush();
  h.setReply(data=>data.action==='load'?new Promise(resolve=>old=resolve):Promise.resolve(response(200,{ok:true,patch:{ownerId:'owner',capsules:[kept]}})));
  const refresh=h.render().reload();await h.flush();
  await h.render().homeLife('keep',{requestId:kept.id});await h.flush();
  old(response(200,snapshot('owner')));await refresh;assert.equal((await h.flush()).capsules[0].id,kept.id);
 }finally{h.unmount()}
});
test('lost keep response retries the identical draw and never duplicates the confirmed collection',async()=>{
 const h=await harness();let calls=0;try{
  h.emit('INITIAL_SESSION',token('owner'));await h.flush();
  h.setReply(async data=>{assert.equal(data.requestId,kept.id);if(!calls++)return response(503,{error:'lost after commit'});return response(200,{ok:true,patch:{ownerId:'owner',capsules:[kept]}})});
  await h.render().homeLife('keep',{requestId:kept.id});await h.flush();
  await h.render().homeLife('keep',{requestId:kept.id});
  const state=await h.flush();assert.equal(state.capsules.length,1);assert.equal(calls,3);assert.equal(state.status,'ready');
 }finally{h.unmount()}
});
test('document acknowledgements update only the saved revision; foreign patches are rejected',async()=>{
 const h=await harness();try{
  h.emit('INITIAL_SESSION',token('owner'));await h.flush();
  h.setReply(async()=>response(200,{patch:{ownerId:'owner',document:{key:'nest',value:{placements:[]},revision:3}}}));
  await h.render().saveDocument('nest',{placements:[]},2);let state=await h.flush();assert.equal(state.documents.nest.revision,3);
  h.setReply(async()=>response(200,{ok:true,patch:{ownerId:'other',capsules:[kept]}}));
  await assert.rejects(state.homeLife('keep',{requestId:kept.id}),/账户不一致/);
  state=await h.flush();assert.equal(state.capsules.length,0);assert.equal(state.profile.user_id,'owner');
 }finally{h.unmount()}
});
test('concurrent refreshes share one request, but a replacement login isolates late responses',async()=>{
 const h=await harness();let finish;try{
  h.emit('INITIAL_SESSION',token('owner'));await h.flush();
  h.setReply(()=>new Promise(resolve=>finish=resolve));
  const a=h.render().reload(),b=h.render().reload();await h.flush();assert.equal(h.requests.length,2);
  finish(response(200,snapshot('owner')));await Promise.all([a,b]);
  const oldSession={user:{id:'same'},access_token:'x.'+btoa(JSON.stringify({session_id:'s1',exp:1}))+'.sig'};
  const refresh={...oldSession,access_token:'x.'+btoa(JSON.stringify({session_id:'s1',exp:2}))+'.sig'};
  const newSession={...oldSession,access_token:'x.'+btoa(JSON.stringify({session_id:'s2',exp:2}))+'.sig'};
  assert.equal(accountSessionKey(oldSession),accountSessionKey(refresh));assert.notEqual(accountSessionKey(oldSession),accountSessionKey(newSession));
 }finally{h.unmount()}
});


const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const response=(status,body)=>({ok:status>=200&&status<300,status,json:async()=>body});
const token=owner=>({user:{id:owner},access_token:owner+'-token',refresh_token:owner+'-refresh'});
const snapshot=owner=>({profile:{user_id:owner,nickname:'小鸦'},capsules:[],documents:{},stories:[]});
async function harness(){
 const slots=[],requests=[];let cursor=0,pending=[],listener,session=null;
 let reply=async data=>response(200,data.action==='login'?{session:token('fresh')}:snapshot(session.user.id));
 const emit=(event,next)=>{session=next;listener(event,next)};
 const context={AbortController,TypeError,setTimeout,clearTimeout,queueMicrotask,accountName,accountPassword,recoveryToken,ACCOUNT_PREVIEW_SESSION,applyAccountPatch,accountSessionKey,privateMediaCache:{clear(){}},
  nestPhotoOutbox:{flush:async()=>true},window:{addEventListener(){},removeEventListener(){}},
  asset:value=>value,AccountContext:{Provider:'Provider'},_jsx:(_type,props)=>props.value,
  setInterval:()=>1,clearInterval(){},document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}},
  createClient:()=>({auth:{
   onAuthStateChange(fn){listener=fn;return {data:{subscription:{unsubscribe(){listener=()=>{}}}}}},
   getSession:async()=>({data:{session},error:null}),
   setSession:async next=>{emit('SIGNED_IN',next);return {error:null}},
   signOut:async()=>{emit('SIGNED_OUT',null);return {error:null}},
  }}),
  fetch:async(_url,options)=>{const data=JSON.parse(options.body);requests.push(data);return reply(data,options)},
  useState(initial){const i=cursor++;slots[i]??={value:initial};return [slots[i].value,value=>{slots[i].value=typeof value==='function'?value(slots[i].value):value}]},
  useRef(initial){const i=cursor++;slots[i]??={current:initial};return slots[i]},
  useCallback(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j])))slots[i]={deps,fn};return slots[i].fn},
  useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j])))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()}})},
 };
 const result=await transformWithOxc(read('src/components/AccountProvider.tsx'),'AccountProvider.tsx',{jsx:{runtime:'automatic'}});
 const source=result.code.replace(/^import[^\n]*\n/gm,'').replace(/^export function /gm,'function ')
  .replace(/import\.meta\.env\.VITE_SUPABASE_\w+/g,JSON.stringify('https://session-test.invalid'))+'\nglobalThis.Provider=AccountProvider;';
 vm.runInNewContext(source,context);
 const render=()=>{cursor=0;pending=[];const state=context.Provider({children:null});pending.forEach(fn=>fn());return state};
 const flush=async()=>{for(let i=0;i<24;i++)await Promise.resolve();return render()};
 render();return {render,flush,emit,requests,setReply(fn){reply=fn},unmount(){slots.forEach(s=>s?.cleanup?.())}};
}

test('revoked restored session exits blocking load and cannot loop through SDK refresh or retry',async()=>{
 const h=await harness();try{
  h.setReply(async()=>response(401,{error:'这把旧钥匙已收回，请重新登录。'}));
  h.emit('INITIAL_SESSION',token('old'));let state=await h.flush();
  assert.equal(state.status,'signed-out');assert.equal(state.profile,null);assert.match(state.error,/重新登录/);
  assert.equal(h.requests.length,1);
  h.emit('TOKEN_REFRESHED',token('old'));await state.reload();state=await h.flush();
  assert.equal(state.status,'signed-out');assert.equal(h.requests.length,1);
  assert(h.requests.every(r=>r.action==='load'));
 }finally{h.unmount()}
});

test('explicit password login leaves quarantine and reloads the correct collection',async()=>{
 const h=await harness();try{
  h.setReply(async()=>response(401,{error:'revoked'}));h.emit('INITIAL_SESSION',token('old'));await h.flush();
  h.setReply(async data=>response(200,data.action==='login'?{session:token('fresh')}:snapshot('fresh')));
  await h.render().authenticate('login','小鸦回家','a-safe-test-password');const state=await h.flush();
  assert.equal(state.status,'ready');assert.equal(state.profile.user_id,'fresh');assert.equal(state.error,'');
 }finally{h.unmount()}
});

test('late rejection from an old load cannot invalidate a newer password login',async()=>{
 const h=await harness();let rejectOld;try{
  h.setReply((data,options)=>options.headers.Authorization==='Bearer old-token'
   ?new Promise(resolve=>{rejectOld=resolve})
   :Promise.resolve(response(200,data.action==='login'?{session:token('fresh')}:snapshot('fresh'))));
  h.emit('INITIAL_SESSION',token('old'));await h.flush();assert.equal(typeof rejectOld,'function');
  await h.render().authenticate('login','小鸦回家','a-safe-test-password');await h.flush();
  rejectOld(response(401,{error:'revoked old key'}));const state=await h.flush();
  assert.equal(state.status,'ready');assert.equal(state.profile.user_id,'fresh');
 }finally{h.unmount()}
});

test('transient service error remains retryable and preserves loaded collection',async()=>{
 const h=await harness();try{
  h.emit('INITIAL_SESSION',token('owner'));await h.flush();
  h.setReply(async()=>response(503,{error:'暂时连接不上'}));await assert.rejects(h.render().reload());
  let state=await h.flush();assert.equal(state.status,'ready');assert.match(state.syncError,/后台同步/);assert.equal(state.profile.user_id,'owner');
  h.setReply(async()=>response(200,snapshot('owner')));await state.reload();state=await h.flush();
  assert.equal(state.status,'ready');assert.equal(state.error,'');assert.equal(state.syncError,'');
 }finally{h.unmount()}
});

test('revoked session during authenticated save also returns to guest without deleting data',async()=>{
 const h=await harness();try{
  h.emit('INITIAL_SESSION',token('owner'));await h.flush();
  h.setReply(async()=>response(401,{error:'revoked'}));await assert.rejects(h.render().saveDocument('nest',{placements:[]}));
  const state=await h.flush();assert.equal(state.status,'signed-out');assert.equal(state.profile,null);
  assert.deepEqual(h.requests.map(r=>r.action),['load','save']);
 }finally{h.unmount()}
});

test('preview offers direct login or dismissible guest notice after invalid session',()=>{
 const source=read('review/community.tsx');
 assert(source.includes('<aside className="preview-reauth-notice" role="status">'));
 assert(source.includes('先看示例小窝'));assert(source.includes('重新登录'));
 assert(source.includes('<AccountMenu loginRequest={loginRequest}/>'));
});
