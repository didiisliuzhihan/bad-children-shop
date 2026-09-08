// User-supplied continuous fireplace recording, looped as one audio source.
// No oscillators, random noise, surprise stingers or periodic silence.
export function createNestAmbience(context:AudioContext,destination:AudioNode,load:()=>Promise<AudioBuffer>){
 const bus=context.createGain();bus.gain.value=0;bus.connect(destination);
 let buffer:AudioBuffer|undefined,source:AudioBufferSourceNode|undefined,loading:Promise<void>|undefined;
 let stopTimer:ReturnType<typeof setTimeout>|undefined,active=false,disposed=false,targetLevel=0;
 const stop=()=>{if(source){const old=source;source=undefined;try{old.stop()}catch{}old.disconnect();}};
 const start=()=>{
  if(disposed||!active||source||!buffer||context.state!=='running')return;
  bus.gain.cancelScheduledValues(context.currentTime);bus.gain.setValueAtTime(0,context.currentTime);bus.gain.setTargetAtTime(targetLevel,context.currentTime,.35);
  source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(bus);source.start();
 };
 const prepare=()=>{
  if(buffer){start();return;}if(loading||disposed)return;
  loading=Promise.resolve().then(load).then(decoded=>{if(!disposed){buffer=decoded;start();}}).catch(()=>{/* Retry next gesture; never substitute noise. */}).finally(()=>{loading=undefined;});
 };
 return {set(next:boolean,level:number){
  if(disposed)return;active=next&&context.state==='running';targetLevel=level;
  bus.gain.cancelScheduledValues(context.currentTime);bus.gain.setTargetAtTime(active?level:0,context.currentTime,.25);
  clearTimeout(stopTimer);if(active)prepare();
  else if(context.state!=='running')stop();
  else if(source)stopTimer=setTimeout(()=>{if(!active)stop()},1000);
 },dispose(){disposed=true;active=false;clearTimeout(stopTimer);stop();bus.disconnect();}};
}
