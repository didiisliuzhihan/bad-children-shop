import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createNestTapInput} from '../src/lib/nestTapInput.ts';
import {createNestTapPlayer} from '../src/lib/nestTapPlayer.ts';
import {NEST_TAP_CLIPS,NEST_TAP_FILES,roomTapTarget} from '../src/lib/nestTapCatalog.mjs';
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve()};
function player(options={}){
 const sources=[],gains=[],loads=[],clock={ms:1000};
 const context={state:'running',currentTime:0,createGain(){const node={gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){}},connect(to){this.to=to},disconnect(){this.disconnected=true}};gains.push(node);return node},
 createBufferSource(){const source={connect(to){this.to=to},disconnect(){this.disconnected=true},start(){this.started=true},stop(){this.stopped=true}};sources.push(source);return source}};
 const destination={name:'master'},engine=createNestTapPlayer(context,destination,{load:async file=>{loads.push(file);return {duration:.2,file}},now:()=>clock.ms,...options});
 return {context,sources,gains,loads,clock,engine,destination};
}
test('14 supplied short recordings map to exactly 9 scene objects and use distinct release assets',()=>{
 assert.equal(Object.keys(NEST_TAP_CLIPS).length,9);assert.equal(NEST_TAP_FILES.length,14);assert.equal(new Set(NEST_TAP_FILES).size,14);
 assert.equal(NEST_TAP_CLIPS.tired_crow.length,2);assert.equal(NEST_TAP_CLIPS.miss_popcorn.length,3);
 assert.equal(NEST_TAP_CLIPS.stock_gourd.length,1);assert.equal(NEST_TAP_CLIPS.matcha_clown.length,3);
 for(const file of NEST_TAP_FILES){const bytes=fs.readFileSync(new URL('../assets/delivery/'+file,import.meta.url));assert(bytes.length>1000&&bytes.length<100000);}
 const assets=fs.readFileSync(new URL('../src/assets.ts',import.meta.url),'utf8'),pages=fs.readFileSync(new URL('../scripts/prepare-pages.mjs',import.meta.url),'utf8');
 assert(assets.includes('...NEST_TAP_FILES'));assert(pages.includes('...NEST_TAP_FILES'));
});
test('room names match pots/stove/window only, never sofa, roof, walls, rails or floor',()=>{
 const bytes=fs.readFileSync(new URL('../assets/delivery/room_furnished_nest.glb',import.meta.url));
 const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
 const matched=gltf.nodes.filter(n=>roomTapTarget(n.name));assert(matched.length>10);
 assert.equal(roomTapTarget('Luminous_arched_window_pane'),'window');assert.equal(roomTapTarget('Hollow_lavender_pan_0'),'stove');
 assert.equal(matched.filter(n=>roomTapTarget(n.name)==='window').length,3);
 for(const name of ['Planar mitered rose roof','Honey floor plank 06-0','Storage cube handle','Woven wall hanging','Lilac sofa','Cream wall'])assert.equal(roomTapTarget(name),null);
});
test('warm only enabled residents; playback is one-shot on its own bus, with cached decode',async()=>{
 const h=player();try{h.engine.setTargets(['tired_crow']);await flush();assert.equal(h.loads.length,2);assert.equal(h.sources.length,0);
 assert.equal(await h.engine.play('kuku_sunflower'),'cancelled');assert.equal(await h.engine.play('tired_crow'),'played');
 assert.equal(h.sources[0].loop,false);assert.equal(h.gains[0].to,h.destination);assert.equal(h.sources[0].to.to,h.gains[0]);
 h.sources[0].onended();h.clock.ms+=1000;assert.equal(await h.engine.play('tired_crow'),'played');assert.equal(h.loads.length,2);
 }finally{h.engine.dispose()}
});
test('all crow, popcorn, matcha and gourd clips are reachable by independent random draws',async()=>{
 for(const [target,count] of [['tired_crow',2],['miss_popcorn',3],['matcha_clown',3],['stock_gourd',1]])for(let i=0;i<count;i++){
  const h=player({random:()=>i/count+.001});try{h.engine.setTargets([target]);await flush();assert.equal(await h.engine.play(target),'played');assert.equal(h.sources[0].buffer.file,NEST_TAP_CLIPS[target][i].file);}finally{h.engine.dispose()}
 }
});
test('rapid taps cannot layer the same object, restart clips, or exceed two simultaneous voices',async()=>{
 const h=player();try{h.engine.setTargets(['stove','window','jimao']);await flush();
 assert.equal(await h.engine.play('stove'),'played');assert.equal(await h.engine.play('stove'),'busy');assert.equal(await h.engine.play('window'),'played');assert.equal(await h.engine.play('jimao'),'busy');assert.equal(h.sources.length,2);
 h.sources[0].onended();assert.equal(await h.engine.play('stove'),'busy');h.clock.ms+=1000;assert.equal(await h.engine.play('stove'),'played');
 }finally{h.engine.dispose();assert(h.sources.every(s=>s.disconnected))}
});
test('a cold click expires instead of making a late surprise sound; next click uses warmed audio',async()=>{
 let resolve;const h=player({waitMs:5,load:file=>new Promise(done=>{resolve=()=>done({duration:.2,file})})});
 try{h.engine.setTargets(['stove']);await flush();assert.equal(await h.engine.play('stove'),'loading');resolve();await flush();assert.equal(h.sources.length,0);assert.equal(await h.engine.play('stove'),'played');}finally{h.engine.dispose()}
});
test('mute/arrange/leave cancellation stops one-shots and prevents late pending playback',async()=>{
 let resolve;const h=player({load:file=>new Promise(done=>{resolve=()=>done({duration:.2,file})})});
 try{h.engine.setTargets(['stove']);await flush();const pending=h.engine.play('stove');h.engine.setTargets([]);resolve();assert.equal(await pending,'cancelled');assert.equal(h.sources.length,0);
 h.engine.setTargets(['stove']);await flush();assert.equal(await h.engine.play('stove'),'played');h.engine.setTargets([]);assert(h.sources[0].stopped);
 h.engine.setTargets(['stove']);h.context.state='suspended';assert.equal(await h.engine.play('stove'),'cancelled');
 }finally{h.engine.dispose()}
});
test('short audio failure is retryable without touching the rest of the soundscape',async()=>{
 let fail=true;const h=player({load:async file=>{if(fail)throw Error('offline');return {duration:.2,file}}});
 try{h.engine.setTargets(['stove']);await flush();assert.equal(await h.engine.play('stove'),'unavailable');fail=false;assert.equal(await h.engine.play('stove'),'played');}finally{h.engine.dispose()}
});
test('only a brief same-object release plays; no capture/preventDefault is required',()=>{
 let now=0,enabled=true,hit='stove';const played=[];
 const input=createNestTapInput({now:()=>now,enabled:()=>enabled,hit:()=>hit,play:id=>played.push(id)});
 const e={pointerId:1,isPrimary:true,button:0,clientX:10,clientY:10};
 input.down(e);assert.deepEqual(played,[]);input.up(e);assert.deepEqual(played,['stove']);input.up(e);assert.equal(played.length,1);
 input.down(e);input.move({...e,clientY:30});input.move(e);input.up(e);assert.equal(played.length,1);
 input.down(e);now+=601;input.up(e);assert.equal(played.length,1);
 input.down(e);hit='window';input.up(e);assert.equal(played.length,1);
 input.down(e);enabled=false;input.up(e);assert.equal(played.length,1);
 enabled=true;input.down(e);input.down({...e,pointerId:2,isPrimary:false});input.up(e);assert.equal(played.length,1);
 input.down(e);input.cancel();input.up(e);assert.equal(played.length,1);
 hit=null;input.down(e);hit='stove';input.up(e);assert.equal(played.length,1);
});
test('scene uses frontmost mesh and passive sound contact listeners, never a fullscreen hit overlay',()=>{
 const source=fs.readFileSync(new URL('../src/components/NestScene.tsx',import.meta.url),'utf8');
 assert(source.includes('raycaster.intersectObjects([room,...actors.values()],true)[0]'));
 assert(source.includes("canvas.addEventListener('pointerup',tapUp,{passive:true})"));
 assert(source.includes("document.addEventListener('scroll',cancelTap,true)"));
 assert(source.includes('!latest.current.editing&&!document.hidden'));assert(source.includes('roomTapTarget(hit.object.name)'));
 assert(!source.includes('onOpen'));assert(source.includes('setNestTapTargets([],asset)'));
});
