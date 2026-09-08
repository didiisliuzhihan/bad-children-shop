import test from 'node:test';import assert from 'node:assert/strict';
const started=[],contexts=[],media=[],recordings=[],fetched=[];let resumeAllowed=false,denyPending=false;
const parameter=()=>({value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v},exponentialRampToValueAtTime(v){this.value=v},setTargetAtTime(v){this.value=v}});
class FakeContext extends EventTarget{
 constructor(){super();this.state='suspended';this.currentTime=0;this.destination={};this.sampleRate=44100;this.gains=[];this.sources=[];contexts.push(this)}
 createGain(){const g={gain:parameter(),connect(to){this.to=to},disconnect(){}};this.gains.push(g);return g}
 createMediaElementSource(a){assert.equal(a.crossOriginAtSrc,'anonymous');assert(!this.sources.some(s=>s.media===a),'Never reconnect the same element twice');const s={media:a,connect(to){this.to=to},disconnect(){this.disconnected=true}};this.sources.push(s);return s}
 createOscillator(){const c=this;return {frequency:parameter(),connect(){},disconnect(){},start(){started.push(c.state)},stop(){},onended:null}}
 createBuffer(_channels=1,length=1){return {getChannelData:()=>new Float32Array(length)}}
 createBufferSource(){return {connect(){},disconnect(){},stop(){this.stopped=true},start(){if(this.loop)recordings.push(this)},buffer:null,onended:null}}
 async decodeAudioData(){return {duration:11.34}}
 async resume(){if(!resumeAllowed){if(denyPending)return new Promise(()=>{});throw Error('Gesture rejected')}await new Promise(r=>setTimeout(r,5));this.run()}
 run(){this.state='running';this.dispatchEvent(new Event('statechange'));this.onstatechange?.()}
}
globalThis.AudioContext=FakeContext;globalThis.window={AudioContext:FakeContext};
globalThis.fetch=async url=>{fetched.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}};
Object.defineProperty(navigator,'audioSession',{configurable:true,value:{type:'auto'}});
globalThis.Audio=class{
 paused=true;muted=false;fail=false;
 constructor(){media.push(this)}setAttribute(){}
 set src(url){this.url=url;this.crossOriginAtSrc=this.crossOrigin}get src(){return this.url}
 get volume(){return 1}set volume(_){throw Error('iOS media volume must not be used')}
 async play(){if(this.fail||this.src.includes('fail'))throw Error('Media failed');this.paused=false}pause(){this.paused=true}
};
const audio=await import('../src/lib/audio.ts');
const tick=()=>new Promise(r=>setTimeout(r,25));
test('first sound waits for unlock; a later release gesture can recover',async()=>{
 await audio.unlockAudio();audio.sound('roll');await tick();assert.equal(started.length,0);
 resumeAllowed=true;await audio.unlockAudio();await tick();
 assert(started.length>=20&&started.length<=28,'Only remaining rolling notes are recovered once');assert(started.every(s=>s==='running'));assert.equal(navigator.audioSession.type,'playback');
 const before=started.length;audio.setMuted(true);audio.sound('open');await tick();assert.equal(started.length,before);
 audio.setMuted(false);audio.sound('lock');await tick();assert(started.length>before);
 contexts.at(-1).state='suspended';audio.sound('drop');await tick();assert(started.every(s=>s==='running'));
});
test('iOS ignores media volume: shared GainNodes still attenuate BGM and voice',async()=>{
 await audio.startBackground('test-bgm.wav');const bgm=media.at(-1),c=contexts.at(-1);
 const [master,effects,music,voice]=c.gains;assert.equal(master.gain.value,1);assert.equal(effects.gain.value,.55);assert.equal(music.gain.value,.24);
 assert.equal(bgm.volume,1);assert.equal(c.sources[0].to,music);assert.equal(music.to,master);assert.equal(effects.to,master);
 await audio.playVoice('test-story.mp3',()=>{});assert.equal(music.gain.value,.05);assert.equal(voice.gain.value,.75);assert.equal(c.sources.at(-1).to,voice);
 await audio.startBackground('test-bgm.wav');assert.equal(music.gain.value,.05);assert.equal(c.sources.length,2);
 audio.stopVoice();assert.equal(music.gain.value,.24);assert(c.sources.at(-1).disconnected);
 audio.setMuted(true);assert.equal(master.gain.value,0);assert(bgm.muted);audio.setMuted(false);assert.equal(master.gain.value,1);assert(!bgm.muted);
});
test('failed story restores music and stale voice events do not stop a newer story',async()=>{
 let ended=0;await assert.rejects(audio.playVoice('fail.mp3',()=>ended++));assert.equal(ended,1);assert.equal(contexts.at(-1).gains[2].gain.value,.24);
 const first=await audio.playVoice('first.mp3',()=>ended++);const second=await audio.playVoice('second.mp3',()=>ended++);
 first.onended();assert.equal(second.paused,false);assert.equal(ended,1);second.onended();assert.equal(ended,2);assert.equal(contexts.at(-1).gains[2].gain.value,.24);
});
test('a pending WebKit resume does not block the next gesture or hang forever',async()=>{
 contexts.at(-1).state='suspended';resumeAllowed=false;denyPending=true;const pending=audio.unlockAudio();
 resumeAllowed=true;assert.equal(await audio.unlockAudio(),true);assert.equal(await pending,true,'A running state beats an older pending promise');denyPending=false;
});
test('closed audio context rebuilds media routing without duplicate or full-volume playback',async()=>{
 contexts.at(-1).state='closed';const old=media.find(a=>a.src==='test-bgm.wav');await audio.startBackground('test-bgm.wav');await tick();
 assert(old.paused);const c=contexts.at(-1);assert.equal(c.sources.length,1);assert.equal(c.sources[0].to,c.gains[2]);assert.equal(c.gains[2].gain.value,.24);
});
test('unsupported playback session override cannot break audio',async()=>{
 Object.defineProperty(navigator,'audioSession',{configurable:true,get(){throw Error('Not supported')}});
 assert.equal(await audio.unlockAudio(),true);
});
test('statechange recovers sound even when resume never resolves; mute discards queued effects',async()=>{
 const c=contexts.at(-1);c.state='suspended';resumeAllowed=false;denyPending=true;const before=started.length;
 audio.sound('roll');audio.setMuted(true);c.run();await tick();assert.equal(started.length,before);
 audio.setMuted(false);c.state='suspended';audio.sound('roll');await tick();c.run();await tick();assert(started.length>before);const after=started.length;c.run();await tick();assert.equal(started.length,after,'No duplicate replay');resumeAllowed=true;denyPending=false;
});
test('permanently blocked audio returns false but has no gameplay decision authority',async()=>{
 const c=contexts.at(-1);c.state='suspended';resumeAllowed=false;denyPending=true;assert.equal(await audio.unlockAudio(),false);resumeAllowed=true;denyPending=false;c.run();
});
test('new unlock and wipe effects use the existing mixer and respect mute',async()=>{
 const before=started.length;audio.sound('unlock');audio.sound('wipe');assert.equal(started.length,before+4);assert.equal(contexts.at(-1).gains[1].gain.value,.55);assert.equal(contexts.at(-1).gains[2].gain.value,.24);
 audio.setMuted(true);audio.sound('unlock');audio.sound('wipe');assert.equal(started.length,before+4);audio.setMuted(false);
});
test('home cooking uses effects volume, pauses BGM, and ducks only under toy speech',async()=>{
 const context=contexts.at(-1);context.createBiquadFilter=()=>({type:'',frequency:parameter(),Q:parameter(),connect(){},disconnect(){}});
 const busIndex=context.gains.length,before=recordings.length;audio.setNestAmbience(true,'room');await tick();const bus=context.gains[busIndex];
 assert.equal(bus.to,context.gains[0]);assert.equal(bus.gain.value,context.gains[1].gain.value);assert.equal(context.gains[2].gain.value,0);assert.equal(recordings.length,before+1,'Recording starts after decode, with no random delay');
 const bgm=media.filter(a=>a.src==='test-bgm.wav').at(-1);assert(bgm.paused);
 await audio.startBackground('test-bgm.wav');assert(bgm.paused,'A room gesture must not restart BGM');
 await audio.playVoice('nest-voice.mp3',()=>{});assert.equal(bus.gain.value,.14);assert.equal(context.gains[2].gain.value,0);
 audio.stopVoice();assert.equal(bus.gain.value,.55);assert.equal(context.gains[2].gain.value,0);
 audio.setNestAmbience(false);assert.equal(bus.gain.value,.55,'Inactive toy scenes cannot silence the room');
 audio.setMuted(true);assert.equal(bus.gain.value,0);assert.equal(context.gains[0].gain.value,0);
 audio.setMuted(false);assert.equal(bus.gain.value,.55);
 context.state='suspended';context.onstatechange();assert.equal(bus.gain.value,0);const suspendedCount=recordings.length;
 context.run();assert(recordings.length>suspendedCount,'Audio resume restores the recording');
 audio.setNestAmbience(false,'room');assert.equal(bus.gain.value,0);assert.equal(context.gains[2].gain.value,.24);assert(!bgm.paused);
});
test('production recording uses its explicit Pages URL, not the separate BGM host, across gestures and mute',async()=>{
 const bgm='https://audio.example/storage/studio-loop.wav',recording='https://site.example/shop/assets/delivery/nest-fireplace-asmr.mp3',states=[];
 const unsubscribe=audio.observeNestAudioStatus(s=>states.push(s));
 try{
  await audio.startBackground(bgm,recording);audio.setNestAmbience(true,'room');await tick();
  assert.equal(fetched.at(-1),recording);assert.equal(states.at(-1),'playing');const count=recordings.length;
  await audio.startBackground(bgm);audio.setMuted(true);assert.equal(states.at(-1),'muted');audio.setMuted(false);await tick();
  assert.equal(states.at(-1),'playing');assert.equal(recordings.length,count);assert.equal(fetched.at(-1),recording);assert(!fetched.includes('https://audio.example/storage/nest-fireplace-asmr.mp3'));
 }finally{audio.setNestAmbience(false,'room');unsubscribe()}
});
test('production entry explicitly resolves both audio URLs through the asset resolver',async()=>{
 const fs=await import('node:fs');const app=fs.readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
 assert(app.includes("installAudioStart(asset('studio-loop.wav'),asset('nest-fireplace-asmr.mp3'))"));
});
