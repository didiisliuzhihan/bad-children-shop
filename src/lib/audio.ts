type Sound='click'|'roll'|'lock'|'drop'|'open'|'keep'|'reject';
let ctx:AudioContext|undefined;let gain:GainNode|undefined;let master:GainNode|undefined;let musicGain:GainNode|undefined;let voiceGain:GainNode|undefined;
let muted=false;let background:HTMLAudioElement|undefined;let activeVoice:HTMLAudioElement|undefined;
let backgroundSource:MediaElementAudioSourceNode|undefined;let voiceSource:MediaElementAudioSourceNode|undefined;
const EFFECT_LEVEL=.55;
const BACKGROUND_LEVEL=.08,VOICE_BACKGROUND_LEVEL=.025;
function setLevel(node:GainNode|undefined,level:number){if(node&&ctx){node.gain.cancelScheduledValues(ctx.currentTime);node.gain.setTargetAtTime(level,ctx.currentTime,.04)}}
export async function unlockAudio():Promise<boolean>{
  try{
    // iOS otherwise treats synthesized effects as ambient/ringer audio while
    // HTML media uses playback audio. Feature-detect; no microphone permission.
    try{const session=(navigator as Navigator&{audioSession?:{type:string}}).audioSession;
      if(session&&session.type!=='playback')session.type='playback';
    }catch{/* Optional API: older browsers still use the shared mixer. */}
    if(!ctx||ctx.state==='closed'){
      const Context=globalThis.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
      if(!Context)return false;
      background?.pause();backgroundSource?.disconnect();background=undefined;backgroundSource=undefined;stopVoice();
      ctx=new Context();master=ctx.createGain();master.gain.value=muted?0:1;master.connect(ctx.destination);
      gain=ctx.createGain();gain.gain.value=EFFECT_LEVEL;gain.connect(master);
      musicGain=ctx.createGain();musicGain.gain.value=BACKGROUND_LEVEL;musicGain.connect(master);
      voiceGain=ctx.createGain();voiceGain.gain.value=.75;voiceGain.connect(master);
    }
    const context=ctx;
    if(context.state==='running')return true;
    // Retry priming on the *release* gesture, not just an earlier touch-down.
    const prime=ctx.createBufferSource();prime.buffer=ctx.createBuffer(1,1,ctx.sampleRate);prime.connect(ctx.destination);prime.onended=()=>prime.disconnect();prime.start(0);
    // Some WebKit resume promises stay pending when activation was denied.
    // Bound each attempt and allow the next trusted gesture to retry independently.
    return await new Promise<boolean>(resolve=>{
      const timer=setTimeout(()=>resolve(false),1200);
      context.resume().then(()=>{clearTimeout(timer);resolve(context.state==='running')},()=>{clearTimeout(timer);resolve(false)});
    });
  }catch{return false /* A later pointer-up/keyboard gesture can retry. */}
}
function media(url:string){
  const a=new Audio();a.crossOrigin='anonymous';a.preload='none';a.setAttribute('playsinline','');a.src=url;a.muted=muted;
  // Leave element.volume at 1: iOS may ignore its setter. GainNodes do all mixing.
  return a;
}
export function setMuted(m:boolean){muted=m;setLevel(master,m?0:1);if(background)background.muted=m;if(activeVoice)activeVoice.muted=m}
export async function startBackground(url:string){
  void unlockAudio();
  if(!ctx||!musicGain||muted)return;
  try{
    if(!background){const a=media(url);backgroundSource=ctx.createMediaElementSource(a);backgroundSource.connect(musicGain);background=a;background.loop=true;}
    setLevel(musicGain,activeVoice?VOICE_BACKGROUND_LEVEL:BACKGROUND_LEVEL);
    if(background.paused)await background.play(); // Called synchronously in the gesture, before awaiting.
  }catch{/* Never fall back to an unattenuated HTML player; retry next gesture. */}
}
export function stopVoice(){activeVoice?.pause();activeVoice=undefined;voiceSource?.disconnect();voiceSource=undefined;setLevel(musicGain,BACKGROUND_LEVEL)}
export async function playVoice(url:string,onEnd:()=>void){
  const ready=unlockAudio();stopVoice();if(!ctx||!voiceGain)throw Error('Audio unavailable');
  const a=media(url);activeVoice=a;
  const finish=()=>{if(activeVoice===a){stopVoice();onEnd()}};
  try{
    voiceSource=ctx.createMediaElementSource(a);voiceSource.connect(voiceGain);setLevel(musicGain,VOICE_BACKGROUND_LEVEL);
    a.onended=finish;a.onerror=finish;
    const play=a.play(); // Preserve trusted gesture for Safari's media policy.
    const [unlocked]=await Promise.all([ready,play]);if(!unlocked)throw Error('Audio locked');return a;
  }catch(error){finish();throw error}
}
export function sound(kind:Sound){
  if(muted)return;const requestedAt=performance.now();
  void unlockAudio().then(ready=>{if(ready&&!muted&&performance.now()-requestedAt<600)scheduleSound(kind)});
}
function scheduleSound(kind:Sound){
  if(!ctx||!gain||muted||ctx.state!=='running')return;const now=ctx.currentTime+.012;
  const note=(hz:number,t:number,duration:number,level:number,type:OscillatorType='sine')=>{const o=ctx!.createOscillator(),g=ctx!.createGain();o.type=type;o.frequency.setValueAtTime(hz,now+t);o.frequency.exponentialRampToValueAtTime(Math.max(45,hz*.55),now+t+duration);g.gain.setValueAtTime(.001,now+t);g.gain.exponentialRampToValueAtTime(level,now+t+.004);g.gain.exponentialRampToValueAtTime(.001,now+t+duration);o.connect(g);g.connect(gain!);o.onended=()=>{o.disconnect();g.disconnect()};o.start(now+t);o.stop(now+t+duration+.02)};
  if(kind==='click')note(750,0,.05,.07,'triangle');
  if(kind==='lock'){note(310,0,.1,.45,'triangle');note(110,.045,.12,.3)}
  if(kind==='drop'){note(90,0,.2,.65);note(150,.23,.12,.25)}
  if(kind==='open'){[520,780,1040].forEach((f,i)=>note(f,i*.09,.38,.18))}
  if(kind==='keep'){[523,659,784,1047].forEach((f,i)=>note(f,i*.10,.55,.2))}
  if(kind==='reject'){[360,240,120].forEach((f,i)=>note(f,i*.09,.2,.2,'triangle'))}
  if(kind==='roll'){for(let i=0;i<28;i++)note(230+((i*71)%370),i*.06,.07,.18,'triangle')}
}
