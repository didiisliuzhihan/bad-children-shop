import test from 'node:test';import assert from 'node:assert/strict';
const started=[],contexts=[],media=[];let resumeAllowed=false,denyPending=false;
const parameter=()=>({value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v},exponentialRampToValueAtTime(v){this.value=v},setTargetAtTime(v){this.value=v}});
class FakeContext{
 constructor(){this.state='suspended';this.currentTime=0;this.destination={};this.sampleRate=44100;this.gains=[];this.sources=[];contexts.push(this)}
 createGain(){const g={gain:parameter(),connect(to){this.to=to},disconnect(){}};this.gains.push(g);return g}
 createMediaElementSource(a){assert.equal(a.crossOriginAtSrc,'anonymous');assert(!this.sources.some(s=>s.media===a),'Never reconnect the same element twice');const s={media:a,connect(to){this.to=to},disconnect(){this.disconnected=true}};this.sources.push(s);return s}
 createOscillator(){const c=this;return {frequency:parameter(),connect(){},disconnect(){},start(){started.push(c.state)},stop(){},onended:null}}
 createBuffer(){return {}}
 createBufferSource(){return {connect(){},disconnect(){},start(){},buffer:null,onended:null}}
 async resume(){if(!resumeAllowed){if(denyPending)return new Promise(()=>{});throw Error('Gesture rejected')}await new Promise(r=>setTimeout(r,5));this.state='running'}
}
globalThis.AudioContext=FakeContext;globalThis.window={AudioContext:FakeContext};
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
 resumeAllowed=true;await audio.unlockAudio();audio.sound('roll');await tick();
 assert.equal(started.length,28);assert(started.every(s=>s==='running'));assert.equal(navigator.audioSession.type,'playback');
 const before=started.length;audio.setMuted(true);audio.sound('open');await tick();assert.equal(started.length,before);
 audio.setMuted(false);audio.sound('lock');await tick();assert(started.length>before);
 contexts.at(-1).state='suspended';audio.sound('drop');await tick();assert(started.every(s=>s==='running'));
});
test('iOS ignores media volume: shared GainNodes still attenuate BGM and voice',async()=>{
 await audio.startBackground('test-bgm.wav');const bgm=media.at(-1),c=contexts.at(-1);
 const [master,effects,music,voice]=c.gains;assert.equal(master.gain.value,1);assert.equal(effects.gain.value,.55);assert.equal(music.gain.value,.08);
 assert.equal(bgm.volume,1);assert.equal(c.sources[0].to,music);assert.equal(music.to,master);assert.equal(effects.to,master);
 await audio.playVoice('test-story.mp3',()=>{});assert.equal(music.gain.value,.025);assert.equal(voice.gain.value,.75);assert.equal(c.sources.at(-1).to,voice);
 await audio.startBackground('test-bgm.wav');assert.equal(music.gain.value,.025);assert.equal(c.sources.length,2);
 audio.stopVoice();assert.equal(music.gain.value,.08);assert(c.sources.at(-1).disconnected);
 audio.setMuted(true);assert.equal(master.gain.value,0);assert(bgm.muted);audio.setMuted(false);assert.equal(master.gain.value,1);assert(!bgm.muted);
});
test('failed story restores music and stale voice events do not stop a newer story',async()=>{
 let ended=0;await assert.rejects(audio.playVoice('fail.mp3',()=>ended++));assert.equal(ended,1);assert.equal(contexts.at(-1).gains[2].gain.value,.08);
 const first=await audio.playVoice('first.mp3',()=>ended++);const second=await audio.playVoice('second.mp3',()=>ended++);
 first.onended();assert.equal(second.paused,false);assert.equal(ended,1);second.onended();assert.equal(ended,2);assert.equal(contexts.at(-1).gains[2].gain.value,.08);
});
test('a pending WebKit resume does not block the next gesture or hang forever',async()=>{
 contexts.at(-1).state='suspended';resumeAllowed=false;denyPending=true;const pending=audio.unlockAudio();
 resumeAllowed=true;assert.equal(await audio.unlockAudio(),true);assert.equal(await pending,false);denyPending=false;
});
test('closed audio context rebuilds media routing without duplicate or full-volume playback',async()=>{
 contexts.at(-1).state='closed';const old=media.find(a=>a.src==='test-bgm.wav');await audio.startBackground('test-bgm.wav');await tick();
 assert(old.paused);const c=contexts.at(-1);assert.equal(c.sources.length,1);assert.equal(c.sources[0].to,c.gains[2]);assert.equal(c.gains[2].gain.value,.08);
});
test('unsupported playback session override cannot break audio',async()=>{
 Object.defineProperty(navigator,'audioSession',{configurable:true,get(){throw Error('Not supported')}});
 assert.equal(await audio.unlockAudio(),true);
});
