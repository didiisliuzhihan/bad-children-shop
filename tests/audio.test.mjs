import test from 'node:test';import assert from 'node:assert/strict';
const started=[],contexts=[],media=[];let resumeAllowed=false;
const parameter=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
class FakeContext{
 constructor(){this.state='suspended';this.currentTime=0;this.destination={};this.sampleRate=44100;contexts.push(this)}
 createGain(){return {gain:parameter(),connect(){},disconnect(){}}}
 createOscillator(){const c=this;return {frequency:parameter(),connect(){},disconnect(){},start(){started.push(c.state)},stop(){},onended:null}}
 createBuffer(){return {}}
 createBufferSource(){return {connect(){},disconnect(){},start(){},buffer:null,onended:null}}
 async resume(){await new Promise(r=>setTimeout(r,5));if(!resumeAllowed)throw Error('Gesture rejected');this.state='running'}
}
globalThis.AudioContext=FakeContext;globalThis.window={AudioContext:FakeContext};
globalThis.Audio=class{paused=true;muted=false;volume=1;constructor(url){this.src=url;media.push(this)}async play(){this.paused=false}pause(){this.paused=true}};
const audio=await import('../src/lib/audio.ts');
test('first sound waits for successful Web Audio unlock; later gesture can recover',async()=>{
 await audio.unlockAudio();audio.sound('roll');await new Promise(r=>setTimeout(r,25));
 assert.equal(started.length,0,'Do not schedule effects while AudioContext is suspended');
 resumeAllowed=true;await audio.unlockAudio();audio.sound('roll');await new Promise(r=>setTimeout(r,25));
 assert(started.length>=20);assert(started.every(s=>s==='running'));
 const before=started.length;audio.setMuted(true);audio.sound('open');await new Promise(r=>setTimeout(r,20));assert.equal(started.length,before);
 audio.setMuted(false);audio.sound('lock');await new Promise(r=>setTimeout(r,20));assert(started.length>before);
 contexts.at(-1).state='suspended';audio.sound('drop');await new Promise(r=>setTimeout(r,25));assert(started.every(s=>s==='running'));
});
test('quieter BGM ducks for voice and restores after it, without changing voice level',async()=>{
 await audio.startBackground('test-bgm.wav');const bgm=media.at(-1);assert.equal(bgm.volume,.08);
 await audio.playVoice('test-story.mp3',()=>{});assert.equal(bgm.volume,.025);assert.equal(media.at(-1).volume,.75);
 await audio.startBackground('test-bgm.wav');assert.equal(bgm.volume,.025);
 audio.stopVoice();assert.equal(bgm.volume,.08);audio.setMuted(true);assert(bgm.muted);audio.setMuted(false);assert(!bgm.muted);
});
