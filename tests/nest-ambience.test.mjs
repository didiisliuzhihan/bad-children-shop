import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';import {transformWithOxc} from 'vite';
import {createHash} from 'node:crypto';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
function cooking(loader=async()=>({duration:11.34})){
 let now=0,id=0;const timers=new Map(),sources=[],gains=[];
 const param=()=>({value:0,cancelScheduledValues(){},setTargetAtTime(v){this.value=v},setValueAtTime(v){this.value=v}});
 const audio={state:'running',get currentTime(){return now/1000},
  createGain(){const n={gain:param(),connect(){},disconnect(){}};gains.push(n);return n},
  createBufferSource(){const source={loop:false,started:false,stopped:false,connect(){},disconnect(){},start(){this.started=true},stop(){this.stopped=true}};sources.push(source);return source},
 };
 const context={setTimeout(fn,ms){timers.set(++id,{fn,at:now+ms});return id},clearTimeout(key){timers.delete(key)}};
 vm.runInNewContext(stripTypeScriptTypes(read('src/lib/nestAmbience.ts')).replace('export function','function')+'\nglobalThis.create=createNestAmbience;',context);
 const states=[];const engine=context.create(audio,{},loader,state=>states.push(state));
 const advance=ms=>{now+=ms;for(const [key,t] of timers)if(t.at<=now){timers.delete(key);t.fn()}};
 const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
 return {engine,audio,timers,sources,gains,advance,flush,states};
}
test('real recording starts on decode and loops continuously without random gaps or restarts',async()=>{
 const h=cooking();try{
  h.engine.set(true,.55);await h.flush();assert.equal(h.sources.length,1);assert(h.sources[0].started&&h.sources[0].loop);
  assert.equal(h.timers.size,0);h.advance(60000);h.engine.set(true,.55);assert.equal(h.sources.length,1);assert(!h.sources[0].stopped);
  h.engine.set(true,.14);assert.equal(h.gains[0].gain.value,.14);assert.equal(h.sources.length,1);
  h.engine.set(false,.55);assert.equal(h.gains[0].gain.value,0);h.advance(1200);assert(h.sources[0].stopped);
 }finally{h.engine.dispose();assert.equal(h.timers.size,0)}
});
test('recording honours blocked/muted audio and never starts after close or from a stale decode',async()=>{
 let decode;const h=cooking(()=>new Promise(resolve=>{decode=resolve}));try{
  h.audio.state='suspended';h.engine.set(true,.55);await h.flush();assert.equal(h.sources.length,0);
  h.audio.state='running';h.engine.set(true,.55);await h.flush();h.engine.set(false,.55);decode({duration:12});await h.flush();assert.equal(h.sources.length,0);
  h.engine.set(true,.55);assert.equal(h.sources.length,1);h.audio.state='suspended';h.engine.set(true,.55);assert(h.sources[0].stopped);
 }finally{h.engine.dispose()}
 let late;const closed=cooking(()=>new Promise(resolve=>{late=resolve}));closed.engine.set(true,.55);await closed.flush();closed.engine.dispose();late({duration:12});await closed.flush();assert.equal(closed.sources.length,0);
});
test('failed field recording can retry but never falls back to synthesized noises',async()=>{
 let attempts=0;const h=cooking(async()=>{if(!attempts++)throw Error('temporary');return {duration:12}});try{
  h.engine.set(true,.55);await h.flush();assert.equal(h.sources.length,0);assert.equal(h.states.at(-1),'error');h.engine.set(true,.55);await h.flush();assert.equal(h.sources.length,1);assert.equal(h.states.at(-1),'playing');
  assert(!read('src/lib/nestAmbience.ts').includes('createOscillator'));assert(!read('src/lib/nestAmbience.ts').includes('Math.random'));
 }finally{h.engine.dispose()}
});
test('active fireplace asset is the user recording, byte-for-byte, not the earlier simmer substitute',()=>{
 const mp3=fs.readFileSync(new URL('../assets/delivery/nest-fireplace-asmr.mp3',import.meta.url));
 assert.equal(mp3.toString('ascii',0,3),'ID3');assert.equal(mp3.length,946100);
 assert.equal(createHash('sha256').update(mp3).digest('hex'),'23393c468ecedda4c0cbb080bc5b44a79b65648b9b19946a4c9d83328881cf90');
 const audio=read('src/lib/audio.ts');assert(audio.includes("'nest-fireplace-asmr.mp3'"));assert(!audio.includes('nest-simmer-loop.wav'));
});

test('actual room opens ambience with zero unlocked toys and no saved room revision',async()=>{
 const calls=[],slots=[],listeners=new Map();let cursor=0,pending=[];
 const context={NEST_ROOM_ID:'test-room',useAccount:()=>({profile:{user_id:'owner'},documents:{}}),homeResidents:()=>[],readLayout:()=>({placements:[]}),localStorage:{getItem:()=>null},
  setNestAmbience:(...args)=>calls.push(args),observeNestAudioStatus:()=>()=>{},document:{hidden:false,addEventListener:(k,fn)=>listeners.set(k,fn),removeEventListener:k=>listeners.delete(k)},
  Icon:()=>null,NestScene:'NestScene',NestPhotoDialog:()=>null,_jsx:(_type,props)=>props,_jsxs:(_type,props)=>props,_Fragment:'Fragment',
  useMemo:fn=>fn(),useCallback:fn=>fn,
  useState(initial){const i=cursor++;slots[i]??={value:typeof initial==='function'?initial():initial};return [slots[i].value,value=>{slots[i].value=typeof value==='function'?value(slots[i].value):value}]},
  useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>v!==old.deps[j]))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()}})},
 };
 const compiled=await transformWithOxc(read('src/components/NestRoom.tsx'),'NestRoom.tsx',{jsx:{runtime:'automatic'}});
 vm.runInNewContext(compiled.code.replace(/^import[^\n]*\n/gm,'').replace(/^export function /gm,'function ')+'\nglobalThis.Room=NestRoom;',context);
 const render=soundActive=>{cursor=0;pending=[];const tree=context.Room({items:[],toys:[],active:true,soundActive});pending.forEach(fn=>fn());return tree};
 try{
  const tree=render(true);assert(calls.some(([active,source])=>active&&source==='room'));
  assert.equal(tree.children[1].lifeReady,false,'Story rewards remain gated while room sound is not');
  const find=(node,label)=>{if(!node||typeof node!=='object')return null;if(node.children===label)return node;for(const child of [node.children].flat()){const found=find(child,label);if(found)return found}return null};
  const count=calls.length;find(tree,'布置小窝').onClick();let editing=render(true);assert.equal(editing.children[1].editing,true);assert.equal(calls.length,count,'Arrangement cannot release room audio or resume BGM');
  find(editing,'取消').onClick();editing=render(true);assert.equal(editing.children[1].editing,false);assert.equal(calls.length,count);
  editing.children[1].onCapture({blob:{},createdAt:'test',timeOfDay:'day',residentIds:[]});render(true);assert.equal(calls.length,count,'Photo composition keeps the same ambience');
  context.document.hidden=true;listeners.get('visibilitychange')();assert.deepEqual(calls.at(-1),[false,'room']);
  context.document.hidden=false;listeners.get('visibilitychange')();assert.deepEqual(calls.at(-1),[true,'room']);
  render(false);assert.deepEqual(calls.at(-1),[false,'room']);
 }finally{slots.forEach(s=>s?.cleanup?.())}
});
