type Sound='click'|'roll'|'lock'|'drop'|'open'|'keep'|'reject';
let ctx:AudioContext|undefined;let gain:GainNode|undefined;let muted=false;let background:HTMLAudioElement|undefined;let activeVoice:HTMLAudioElement|undefined;
const EFFECT_LEVEL=.55;
const BACKGROUND_LEVEL=.08,VOICE_BACKGROUND_LEVEL=.025;
export async function unlockAudio():Promise<boolean>{
  try{
    if(!ctx||ctx.state==='closed'){
      const Context=globalThis.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
      if(!Context)return false;ctx=new Context();gain=ctx.createGain();gain.gain.value=muted?0:EFFECT_LEVEL;gain.connect(ctx.destination);
      // Prime the output from the actual user gesture, including older iOS WebKit.
      const prime=ctx.createBufferSource();prime.buffer=ctx.createBuffer(1,1,ctx.sampleRate);prime.connect(ctx.destination);prime.onended=()=>prime.disconnect();prime.start(0);
    }
    if(ctx.state!=='running')await ctx.resume();
    return ctx.state==='running';
  }catch{return false /* A later pointer-up/keyboard gesture can retry. */}
}
export function setMuted(m:boolean){muted=m;if(gain)gain.gain.setTargetAtTime(m?0:EFFECT_LEVEL,ctx!.currentTime,.1);if(background)background.muted=m;if(activeVoice)activeVoice.muted=m}
export async function startBackground(url:string){void unlockAudio();background??=new Audio(url);background.loop=true;background.volume=activeVoice?VOICE_BACKGROUND_LEVEL:BACKGROUND_LEVEL;background.muted=muted;if(!background.paused)return;try{await background.play()}catch{/* Retry on the next trusted user gesture. */}}
export function stopVoice(){activeVoice?.pause();activeVoice=undefined;if(background)background.volume=BACKGROUND_LEVEL}
export async function playVoice(url:string,onEnd:()=>void){stopVoice();const a=new Audio(url);activeVoice=a;a.volume=.75;a.muted=muted;if(background)background.volume=VOICE_BACKGROUND_LEVEL;a.onended=()=>{stopVoice();onEnd()};a.onerror=()=>{stopVoice();onEnd()};await a.play();return a}
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
