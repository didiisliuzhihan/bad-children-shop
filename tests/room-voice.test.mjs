import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';import {stripTypeScriptTypes} from 'node:module';
// Execute the real hook with a tiny deterministic effect/state harness.
// A pane change is a parent rerender; only changed effect dependencies clean up.
function harness(){
 const slots=[];let cursor=0,pending=[],api,stops=0,errors=0;const requests=[];
 const context={
  useState(initial){const i=cursor++;slots[i]??={value:initial};return [slots[i].value,v=>{slots[i].value=v}]},
  useRef(initial){const i=cursor++;slots[i]??={current:initial};return slots[i]},
  useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j])))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()}})},
  stopVoice(){stops++;for(const r of requests)r.paused=true},
  playVoice(url,onEnd){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});requests.push({url,onEnd,resolve,reject,paused:false});return promise}
 };
 const source=stripTypeScriptTypes(fs.readFileSync(new URL('../src/lib/useToyVoice.ts',import.meta.url),'utf8')).replace(/^import .*;\s*$/gm,'').replace('export function useToyVoice','function useToyVoice')+'\nglobalThis.hook=useToyVoice;';
 vm.runInNewContext(source,context);
 const render=(id='crow',url='crow.mp3')=>{cursor=0;pending=[];api=context.hook({id,audio_url:url},()=>errors++);for(const run of pending)run();return api};
 const unmount=()=>{for(const s of slots)s?.cleanup?.()};
 return {render,unmount,requests,get stops(){return stops},get errors(){return errors}};
}
test('same toy survives card/model/story rerenders without restart or stop',async()=>{
 const h=harness();h.render();const p=h.render().listen();h.requests[0].resolve();await p;
 const stops=h.stops;for(const pane of ['card','model','story','model','card'])assert.equal(h.render().playing,true,pane);
 assert.equal(h.stops,stops);assert.equal(h.requests.length,1);assert.equal(h.requests[0].paused,false);
 h.requests[0].onEnd();assert.equal(h.render().playing,false);
});
test('a manual pause works away from the story pane',async()=>{
 const h=harness();h.render();const p=h.render().listen();h.requests[0].resolve();await p;
 await h.render().listen();assert.equal(h.requests[0].paused,true);assert.equal(h.render().playing,false);
});
test('changing toy or audio stops the old story and suppresses its late failure',async()=>{
 const h=harness();h.render();const p=h.render().listen();h.render('popcorn','popcorn.mp3');
 h.requests[0].reject(Error('late'));await p;assert.equal(h.errors,0);assert(h.requests[0].paused);assert.equal(h.render('popcorn','popcorn.mp3').playing,false);
 const next=h.render('popcorn','popcorn.mp3').listen();h.requests[1].resolve();await next;
 h.render('popcorn','replacement.mp3');assert(h.requests[1].paused);
});
test('closing room stops pending playback and does not toast after unmount',async()=>{
 const h=harness();h.render();const p=h.render().listen();h.unmount();h.requests[0].reject(Error('late'));await p;
 assert(h.requests[0].paused);assert.equal(h.errors,0);
});
test('current playback failure is reported once; older completion cannot reset new playback',async()=>{
 const h=harness();h.render();const a=h.render().listen();h.requests[0].reject(Error('failed'));await a;assert.equal(h.errors,1);assert.equal(h.render().playing,false);
 const b=h.render().listen();h.requests[1].resolve();await b;h.requests[0].onEnd();assert.equal(h.render().playing,true);
});
test('production ToyRoom uses room-scoped playback and exposes an off-story pause',()=>{
 const source=fs.readFileSync(new URL('../src/components/ToyRoom.tsx',import.meta.url),'utf8');
 assert(source.includes('useToyVoice(toy,'));assert(!source.includes('stopVoice('));assert(source.includes("playing&&pane!=='story'"));assert(source.includes('暂停当前玩具故事'));
});
