import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {stripTypeScriptTypes} from 'node:module';
import {eligibleMoments,lifeDirection} from '../src/lib/nestLifeRules.mjs';
function harness(accountMode=true){
 const slots=[],timers=new Map(),listeners=new Map(),requests=[],ambience=[],photos=[],shots=[];let cursor=0,pending=[],now=0,seq=0;
 const account=accountMode?{profile:{user_id:'owner'},documents:{nest:{revision:1}},homeLife:async(op,options)=>{requests.push({op,...options});return op==='start'?{event:{id:'moment',kind:'soup'}}:op==='complete'?{ok:true,capture:true}:{};},captureLife:async(id,blob)=>photos.push({id,blob})}:null;
 const context={eligibleMoments,lifeDirection,crypto:{randomUUID:()=>String(++seq)},Math:Object.assign(Object.create(Math),{random:()=>0}),Date,Promise,document:{hidden:false,addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k)},
  useAccount:()=>account,useRef(initial){const i=cursor++;slots[i]??={current:initial};return slots[i]},
  useState(initial){const i=cursor++;slots[i]??={value:initial};return [slots[i].value,v=>{slots[i].value=typeof v==='function'?v(slots[i].value):v}]},
  useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j])))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()}})},
  setTimeout:(fn,ms)=>{const id=++seq;timers.set(id,{fn,at:now+ms});return id},clearTimeout:id=>timers.delete(id),
  setInterval:(fn,ms)=>{const id=++seq;timers.set(id,{fn,at:now+ms,ms});return id},clearInterval:id=>timers.delete(id),
  setNestAmbience:value=>ambience.push(value),cookingCue(){},
 };
 const source=stripTypeScriptTypes(fs.readFileSync(new URL('../src/lib/useNestLife.ts',import.meta.url),'utf8')).replace(/^import .*;\s*$/gm,'').replace('export function useNestLife','function useNestLife')+'\nglobalThis.hook=useNestLife;';vm.runInNewContext(source,context);
 const placements=[{toyId:'miss_popcorn',x:0,z:1},{toyId:'tired_crow',x:2,z:1}];
 const render=(ready=true)=>{cursor=0;pending=[];const result=context.hook(ready,placements,async(event)=>{shots.push({event,at:now});return {type:'image/png'}});pending.forEach(f=>f());return result};
 const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
 const advance=async(ms)=>{const end=now+ms;while(true){const entries=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at);if(!entries.length)break;const [id,t]=entries[0];now=t.at;if(t.ms)t.at+=t.ms;else timers.delete(id);t.fn();await flush();}now=end;await flush();};
 return {render,advance,requests,photos,shots,ambience,timers,hide(){context.document.hidden=true;listeners.get('visibilitychange')?.()},show(){context.document.hidden=false;listeners.get('visibilitychange')?.()},unmount(){slots.forEach(s=>s?.cleanup?.())}};
}
test('actual home hook visits, plays, captures, completes once and cleans timers',async()=>{
 const h=harness();h.render();await h.advance(35000);assert(h.requests.some(r=>r.op==='start'));assert.equal(h.render().moment.kind,'soup');
 await h.advance(7999);assert.equal(h.shots.length,0);await h.advance(1);assert.equal(h.shots.length,1);assert.equal(h.shots[0].event.id,'moment');assert.equal(h.shots[0].event.kind,'soup');assert.equal(h.shots[0].at,43000);assert.equal(h.photos.length,0,'Capture is not uploaded until server-authorized completion');
 await h.advance(5500);assert.equal(h.requests.filter(r=>r.op==='complete').length,1);assert.equal(h.photos.length,1);assert.equal(h.photos[0].id,h.shots[0].event.id);
 h.unmount();assert.equal(h.timers.size,0);assert.equal(h.ambience.length,0,'Story lifecycle must never mute the room');assert(h.requests.some(r=>r.op==='leave'));
});
test('hiding or entering arrangement cancels incomplete performances and cannot mint an offline completion',async()=>{
 for(const arrange of [false,true]){const h=harness();h.render();await h.advance(35000);if(arrange)h.render(false);else h.hide();await h.advance(20000);assert.equal(h.requests.filter(r=>r.op==='complete').length,0);assert.equal(h.photos.length,0);assert.equal(h.ambience.length,0,'Story lifecycle must never mute the room');h.unmount();}
});
test('guest scene has performances but no account rewards or uploads',async()=>{
 const h=harness(false);h.render();await h.advance(18000);assert.equal(h.render().moment.kind,'soup');await h.advance(13500);assert(h.render().trace);assert.equal(h.requests.length,0);assert.equal(h.photos.length,0);h.unmount();
});
