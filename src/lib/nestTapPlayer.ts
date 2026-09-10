import {NEST_TAP_CLIPS,isNestTapTarget} from './nestTapCatalog.mjs';
type Clip={file:string;gain:number};
export type NestTapResult='played'|'busy'|'loading'|'unavailable'|'cancelled';
type Options={load:(file:string)=>Promise<AudioBuffer>;random?:()=>number;now?:()=>number;waitMs?:number};

/** Independent one-shot bus: never pauses, restarts or ducks ambience/music/voice. */
export function createNestTapPlayer(context:AudioContext,destination:AudioNode,options:Options){
 const bus=context.createGain();bus.gain.value=.38;bus.connect(destination);
 const random=options.random||Math.random,now=options.now||(()=>performance.now());
 const cache=new Map<string,AudioBuffer>(),pending=new Map<string,Promise<AudioBuffer>>();
 const cooldown=new Map<string,number>(),playing=new Map<string,()=>void>();
 let enabled=new Set<string>(),revision=0,disposed=false,waiting:string|null=null;
 const prepare=(file:string)=>{
  if(cache.has(file))return Promise.resolve(cache.get(file)!);
  if(!pending.has(file)){
   const request=Promise.resolve().then(()=>options.load(file)).then(buffer=>{if(!disposed)cache.set(file,buffer);return buffer}).finally(()=>pending.delete(file));
   pending.set(file,request);
  }return pending.get(file)!;
 };
 const clips=(target:string):Clip[]=>(NEST_TAP_CLIPS as Record<string,Clip[]>)[target]||[];
 const setTargets=(targets:string[])=>{
  const next=new Set(targets.filter(isNestTapTarget));
  if([...next].join('|')===[...enabled].join('|'))return;
  revision++;waiting=null;enabled=next;
  for(const [target,stop] of playing)if(!enabled.has(target))stop();
  // A small sequential warm-up, only for objects actually present; no cold-page fan-out.
  const version=revision;
  void (async()=>{for(const target of enabled)for(const clip of clips(target)){
   if(disposed||version!==revision)return;
   await prepare(clip.file).catch(()=>{});
  }})();
 };
 const play=async(target:string):Promise<NestTapResult>=>{
  if(disposed||context.state!=='running'||!enabled.has(target))return 'cancelled';
  if(waiting||playing.has(target)||playing.size>=2||now()<(cooldown.get(target)||0))return 'busy';
  const pool=clips(target);
  const clip=pool[Math.min(pool.length-1,Math.floor(Math.max(0,random())*pool.length))];if(!clip)return 'unavailable';
  const version=revision;waiting=target;let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   const buffer=cache.get(clip.file)||await Promise.race([prepare(clip.file),new Promise<null>(resolve=>{timer=setTimeout(()=>resolve(null),options.waitMs??650)})]);
   if(disposed||version!==revision||!enabled.has(target)||context.state!=='running')return 'cancelled';
   if(!buffer)return 'loading';
   const source=context.createBufferSource(),envelope=context.createGain(),start=context.currentTime,duration=buffer.duration;
   if(!Number.isFinite(duration)||duration<=0||duration>15)return 'unavailable';
   source.buffer=buffer;source.loop=false;source.connect(envelope);envelope.connect(bus);
   envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(clip.gain,start+Math.min(.008,duration/4));
   envelope.gain.setValueAtTime(clip.gain,start+Math.max(duration-.025,duration/2));envelope.gain.linearRampToValueAtTime(0,start+duration);
   let finished=false;const clean=()=>{if(finished)return;finished=true;source.disconnect();envelope.disconnect();playing.delete(target);};
   playing.set(target,()=>{try{source.stop()}catch{}clean()});source.onended=clean;
   try{source.start();}catch(error){clean();throw error;}
   cooldown.set(target,now()+Math.max(450,duration*1000+120));return 'played';
  }catch{return disposed||version!==revision?'cancelled':'unavailable';}
  finally{clearTimeout(timer);if(version===revision)waiting=null;}
 };
 return {setTargets,play,dispose(){disposed=true;revision++;enabled.clear();waiting=null;for(const stop of playing.values())stop();bus.disconnect();cache.clear();}};
}
