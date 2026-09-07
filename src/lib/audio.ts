type Sound='click'|'roll'|'lock'|'drop'|'open'|'keep'|'reject';
let ctx:AudioContext|undefined;let gain:GainNode|undefined;let muted=false;let background:HTMLAudioElement|undefined;let activeVoice:HTMLAudioElement|undefined;
export function unlockAudio(){
  try{ctx??=new AudioContext();if(!gain){gain=ctx.createGain();gain.gain.value=.3;gain.connect(ctx.destination)}void ctx.resume()}catch{/* No audio support: the complete experience still works. */}
}
export function setMuted(m:boolean){muted=m;if(gain)gain.gain.setTargetAtTime(m?0:.3,ctx!.currentTime,.1);if(background)background.muted=m;if(activeVoice)activeVoice.muted=m}
export async function startBackground(url:string){unlockAudio();background??=new Audio(url);background.loop=true;background.volume=.16;background.muted=muted;try{await background.play()}catch{/* Audio control can retry after another user gesture. */}}
export function stopVoice(){activeVoice?.pause();activeVoice=undefined;if(background)background.volume=.16}
export async function playVoice(url:string,onEnd:()=>void){stopVoice();const a=new Audio(url);activeVoice=a;a.volume=.75;a.muted=muted;if(background)background.volume=.05;a.onended=()=>{stopVoice();onEnd()};a.onerror=()=>{stopVoice();onEnd()};await a.play();return a}
export function sound(kind:Sound){
  unlockAudio();if(!ctx||!gain||muted)return;const now=ctx.currentTime;
  const note=(hz:number,t:number,duration:number,level:number,type:OscillatorType='sine')=>{const o=ctx!.createOscillator(),g=ctx!.createGain();o.type=type;o.frequency.setValueAtTime(hz,now+t);o.frequency.exponentialRampToValueAtTime(Math.max(30,hz*.55),now+t+duration);g.gain.setValueAtTime(level,now+t);g.gain.exponentialRampToValueAtTime(.001,now+t+duration);o.connect(g);g.connect(gain!);o.start(now+t);o.stop(now+t+duration+.02)};
  if(kind==='click')note(750,0,.05,.07,'triangle');
  if(kind==='lock'){note(310,0,.1,.45,'triangle');note(110,.045,.12,.3)}
  if(kind==='drop'){note(90,0,.2,.65);note(150,.23,.12,.25)}
  if(kind==='open'){[520,780,1040].forEach((f,i)=>note(f,i*.09,.38,.18))}
  if(kind==='keep'){[523,659,784,1047].forEach((f,i)=>note(f,i*.10,.55,.2))}
  if(kind==='reject'){[360,240,120].forEach((f,i)=>note(f,i*.09,.2,.2,'triangle'))}
  if(kind==='roll'){for(let i=0;i<28;i++)note(80+((i*41)%130),i*.06,.075,.1,'triangle')}
}
