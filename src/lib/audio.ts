import {createNestAmbience,type RecordingState} from './nestAmbience.ts';
import {createNestTapPlayer,type NestTapResult} from './nestTapPlayer.ts';
import {isNestTapTarget} from './nestTapCatalog.mjs';
let nestTaps:ReturnType<typeof createNestTapPlayer>|undefined,tapTargets:string[]=[];
let tapAsset:((file:string)=>string)|undefined;
function reconcileNestTaps(){
 if(ctx&&master&&tapAsset&&tapTargets.length&&!nestTaps){
  const owner=ctx,resolve=tapAsset;
  nestTaps=createNestTapPlayer(owner,master,{load:async file=>{
   const response=await fetch(resolve(file),{signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('Short sound unavailable');const bytes=await response.arrayBuffer();
   if(bytes.byteLength>512000)throw Error('Short sound too large');
   let timer:ReturnType<typeof setTimeout>|undefined;
   try{return await Promise.race([owner.decodeAudioData(bytes),new Promise<AudioBuffer>((_,reject)=>{timer=setTimeout(()=>reject(Error('Sound decode timed out')),10000)})]);}finally{clearTimeout(timer);}
  }});
 }
 nestTaps?.setTargets(nestActive&&!muted&&isAudioReady()&&(typeof document==='undefined'||!document.hidden)?tapTargets:[]);
}
export function setNestTapTargets(targets:string[],resolve:(file:string)=>string){
 tapAsset=resolve;tapTargets=targets.filter(isNestTapTarget);reconcileNestTaps();
}
export async function playNestTap(target:string):Promise<NestTapResult>{
 if(muted||!nestActive||!tapTargets.includes(target)||(typeof document!=='undefined'&&document.hidden))return 'cancelled';
 if(!isAudioReady()&&!await unlockAudio())return 'unavailable';
 reconcileNestTaps();return nestTaps?.play(target)||'cancelled';
}
type Sound='click'|'roll'|'lock'|'drop'|'open'|'keep'|'reject'|'wipe'|'unlock';
let nestActive=false,nestAmbience:ReturnType<typeof createNestAmbience>|undefined;
const nestListeners=new Set<string>();
let nestRecordingUrl='',nestRecordingBytes:Promise<ArrayBuffer>|undefined;
export type NestAudioStatus='inactive'|'muted'|'blocked'|'loading'|'playing'|'error';
let recordingState:RecordingState='idle';
const nestAudioObservers=new Set<(status:NestAudioStatus)=>void>();
function nestAudioStatus():NestAudioStatus{
 if(!nestActive||(typeof document!=='undefined'&&document.hidden))return 'inactive';
 if(muted)return 'muted';if(!isAudioReady())return 'blocked';
 return recordingState==='idle'?'loading':recordingState;
}
function publishNestAudioStatus(){const status=nestAudioStatus();for(const listener of nestAudioObservers)listener(status)}
export function observeNestAudioStatus(listener:(status:NestAudioStatus)=>void){nestAudioObservers.add(listener);listener(nestAudioStatus());return()=>{nestAudioObservers.delete(listener)}}
function loadNestRecording(context:AudioContext){
 if(!nestRecordingUrl)return Promise.reject(Error('Room recording is not configured'));
 nestRecordingBytes??=fetch(nestRecordingUrl,{signal:AbortSignal.timeout(15000)}).then(r=>{if(!r.ok)throw Error('Room recording unavailable');return r.arrayBuffer()}).catch(e=>{nestRecordingBytes=undefined;throw e});
 return nestRecordingBytes.then(bytes=>context.decodeAudioData(bytes.slice(0)));
}
function reconcileMix(){
 setLevel(musicGain,nestActive?0:activeVoice?VOICE_BACKGROUND_LEVEL:BACKGROUND_LEVEL);
 if(nestActive)background?.pause();
 if(ctx&&master&&nestActive&&!nestAmbience){const owner=ctx;nestAmbience=createNestAmbience(owner,master,()=>loadNestRecording(owner),state=>{recordingState=state;publishNestAudioStatus()});}
 nestAmbience?.set(nestActive&&!muted&&(typeof document==='undefined'||!document.hidden),activeVoice?.14:EFFECT_LEVEL);
 reconcileNestTaps();
 publishNestAudioStatus();
}
export function setNestAmbience(active:boolean,source='scene'){
 const wasActive=nestActive;if(active)nestListeners.add(source);else nestListeners.delete(source);nestActive=nestListeners.size>0;reconcileMix();
 if(wasActive&&!nestActive&&background&&!muted&&isAudioReady()&&(typeof document==='undefined'||!document.hidden))void background.play().catch(()=>{});
}
let ctx:AudioContext|undefined;let gain:GainNode|undefined;let master:GainNode|undefined;let musicGain:GainNode|undefined;let voiceGain:GainNode|undefined;
let muted=false;let background:HTMLAudioElement|undefined;let activeVoice:HTMLAudioElement|undefined;
let backgroundSource:MediaElementAudioSourceNode|undefined;let voiceSource:MediaElementAudioSourceNode|undefined;
const EFFECT_LEVEL=.55;
// The music asset is already quiet (about .031 RMS); do not attenuate it twice
// into near-silence. Cooking still mutes it completely, speech ducks it.
const BACKGROUND_LEVEL=.24,VOICE_BACKGROUND_LEVEL=.05;
const readyListeners=new Set<(ready:boolean)=>void>();
let queuedSounds:{kind:Sound;at:number}[]=[];
export function isAudioReady(){return ctx?.state==='running'}
function publishAudioState(){const ready=isAudioReady();for(const listener of readyListeners)listener(ready);if(ready)flushSounds();reconcileMix()}
export function observeAudioReady(listener:(ready:boolean)=>void){readyListeners.add(listener);listener(isAudioReady());return()=>{readyListeners.delete(listener)}}
// Native touchstart matters in embedded WebKit; a swipe's touchend may NOT
// unlock audio. Also keep real click/keyboard paths, rather than a mute toggle.
export function installAudioStart(url:string,recordingUrl?:string){
  const start=(event?:Event)=>{if(event&&!event.isTrusted)return;
    // Let the sound button resolve its own intent before activating audio.
    // Otherwise capture-phase unlock changes "enable" into "mute" mid-click.
    if(event?.target instanceof Element&&event.target.closest('[data-audio-toggle]'))return;
    if(event?.type==='pointerdown'&&(event as PointerEvent).pointerType!=='mouse')return;if(!muted)void startBackground(url,recordingUrl)};
  const visible=()=>{if(document.visibilityState==='visible')start()};
  const events=['touchstart','touchend','pointerdown','pointerup','click','keydown'];
  for(const event of events)document.addEventListener(event,start,{capture:true,passive:true});
  document.addEventListener('visibilitychange',visible);window.addEventListener('pageshow',start);
  start(); // Best-effort autoplay only. Policy rejection must never gate gameplay.
  return()=>{for(const event of events)document.removeEventListener(event,start,true);document.removeEventListener('visibilitychange',visible);window.removeEventListener('pageshow',start)};
}
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
      nestAmbience?.dispose();nestAmbience=undefined;nestTaps?.dispose();nestTaps=undefined;ctx=new Context();master=ctx.createGain();master.gain.value=muted?0:1;master.connect(ctx.destination);
      gain=ctx.createGain();gain.gain.value=EFFECT_LEVEL;gain.connect(master);
      musicGain=ctx.createGain();musicGain.gain.value=BACKGROUND_LEVEL;musicGain.connect(master);
      voiceGain=ctx.createGain();voiceGain.gain.value=.75;voiceGain.connect(master);
      ctx.onstatechange=publishAudioState;
    }
    const context=ctx;
    if(context.state==='running'){publishAudioState();return true}
    // Retry priming on the *release* gesture, not just an earlier touch-down.
    const prime=ctx.createBufferSource();prime.buffer=ctx.createBuffer(1,1,ctx.sampleRate);prime.connect(ctx.destination);prime.onended=()=>prime.disconnect();prime.start(0);
    // Some WebKit resume promises stay pending when activation was denied.
    // Bound each attempt and allow the next trusted gesture to retry independently.
    return await new Promise<boolean>(resolve=>{
      let finished=false;
      const finish=()=>{if(finished)return;finished=true;clearTimeout(timer);context.removeEventListener('statechange',changed);publishAudioState();resolve(context.state==='running')};
      const changed=()=>{if(context.state==='running')finish()};
      const timer=setTimeout(finish,1200);
      context.addEventListener('statechange',changed);
      // State may become running even when an older WebView leaves resume()
      // pending. Observe both, and never discard success at a fixed timeout.
      try{context.resume().then(finish,finish)}catch{finish()}
    });
  }catch{return false /* A later pointer-up/keyboard gesture can retry. */}
}
function media(url:string){
  const a=new Audio();a.crossOrigin='anonymous';a.preload='none';a.setAttribute('playsinline','');a.src=url;a.muted=muted;
  // Leave element.volume at 1: iOS may ignore its setter. GainNodes do all mixing.
  return a;
}
export function setMuted(m:boolean){muted=m;if(m)queuedSounds=[];setLevel(master,m?0:1);if(background)background.muted=m;if(activeVoice)activeVoice.muted=m;reconcileMix()}
export async function startBackground(url:string,recordingUrl?:string){
  // Production BGM and the room recording may be hosted on different origins.
  // Ordinary gestures/mute recovery must preserve the explicitly configured URL.
  const nextRecordingUrl=recordingUrl||nestRecordingUrl||url.replace(/[^/]+$/,'nest-fireplace-asmr.mp3');
  if(nextRecordingUrl!==nestRecordingUrl){nestRecordingUrl=nextRecordingUrl;nestRecordingBytes=undefined;nestAmbience?.dispose();nestAmbience=undefined;recordingState='idle';}
  void unlockAudio();
  if(!ctx||!musicGain||muted)return;
  try{
    if(!background){const a=media(url);backgroundSource=ctx.createMediaElementSource(a);backgroundSource.connect(musicGain);background=a;background.loop=true;}
    reconcileMix();
    if(!nestActive&&background.paused)await background.play(); // Called synchronously in the gesture, before awaiting.
  }catch{/* Never fall back to an unattenuated HTML player; retry next gesture. */}
}
export function stopVoice(){activeVoice?.pause();activeVoice=undefined;voiceSource?.disconnect();voiceSource=undefined;reconcileMix()}
export async function playVoice(url:string,onEnd:()=>void){
  const ready=unlockAudio();stopVoice();if(!ctx||!voiceGain)throw Error('Audio unavailable');
  const a=media(url);activeVoice=a;
  const finish=()=>{if(activeVoice===a){stopVoice();onEnd()}};
  try{
    voiceSource=ctx.createMediaElementSource(a);voiceSource.connect(voiceGain);reconcileMix();
    a.onended=finish;a.onerror=finish;
    const play=a.play(); // Preserve trusted gesture for Safari's media policy.
    const [unlocked]=await Promise.all([ready,play]);if(!unlocked)throw Error('Audio locked');return a;
  }catch(error){finish();throw error}
}
export function sound(kind:Sound){
  if(muted)return;if(isAudioReady()){scheduleSound(kind);return}
  queuedSounds=queuedSounds.filter(item=>performance.now()-item.at<2000).slice(-7);
  queuedSounds.push({kind,at:performance.now()});void unlockAudio().then(flushSounds);
}
function flushSounds(){
  if(!isAudioReady()||muted)return;const queue=queuedSounds;queuedSounds=[];
  for(const item of queue){const elapsed=(performance.now()-item.at)/1000;if(elapsed<2)scheduleSound(item.kind,elapsed)}
}
function scheduleSound(kind:Sound,elapsed=0){
  if(!ctx||!gain||muted||ctx.state!=='running')return;const now=ctx.currentTime+.012;
  const note=(hz:number,t:number,duration:number,level:number,type:OscillatorType='sine')=>{if(t+duration<=elapsed)return;duration-=Math.max(0,elapsed-t);t=Math.max(0,t-elapsed);const o=ctx!.createOscillator(),g=ctx!.createGain();o.type=type;o.frequency.setValueAtTime(hz,now+t);o.frequency.exponentialRampToValueAtTime(Math.max(45,hz*.55),now+t+duration);g.gain.setValueAtTime(.001,now+t);g.gain.exponentialRampToValueAtTime(level,now+t+Math.min(.004,duration/3));g.gain.exponentialRampToValueAtTime(.001,now+t+duration);o.connect(g);g.connect(gain!);o.onended=()=>{o.disconnect();g.disconnect()};o.start(now+t);o.stop(now+t+duration+.02)};
  if(kind==='click')note(750,0,.05,.07,'triangle');
  if(kind==='wipe'){
    // A short airy brush, through the existing effects mixer (never a new player).
    if(typeof ctx.createBiquadFilter==='function'){
      const duration=.16,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.sin(Math.PI*i/data.length)*.10;
      const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter();source.buffer=buffer;filter.type='bandpass';filter.frequency.value=1600;filter.Q.value=.5;source.connect(filter);filter.connect(gain);source.onended=()=>{source.disconnect();filter.disconnect()};source.start(now);
    }else note(1700,0,.12,.025,'triangle');
  }
  if(kind==='unlock'){[660,990,1320].forEach((f,i)=>note(f,i*.12,.65,.17));}
  if(kind==='lock'){note(310,0,.1,.45,'triangle');note(110,.045,.12,.3)}
  if(kind==='drop'){note(90,0,.2,.65);note(150,.23,.12,.25)}
  if(kind==='open'){[520,780,1040].forEach((f,i)=>note(f,i*.09,.38,.18))}
  if(kind==='keep'){[523,659,784,1047].forEach((f,i)=>note(f,i*.10,.55,.2))}
  if(kind==='reject'){[360,240,120].forEach((f,i)=>note(f,i*.09,.2,.2,'triangle'))}
  if(kind==='roll'){for(let i=0;i<28;i++)note(230+((i*71)%370),i*.06,.07,.18,'triangle')}
}
