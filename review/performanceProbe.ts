// Local opt-in diagnostics; never records message contents, URLs, credentials or account IDs.
export function startPerformanceProbe(){
 if(!['127.0.0.1','localhost'].includes(location.hostname)||!new URLSearchParams(location.search).has('profile'))return;
 let frames:number[]=[],longTasks:number[]=[],events:number[]=[],last=0,raf=0;
 const frame=(now:number)=>{if(last&&!document.hidden)frames.push(now-last);last=document.hidden?0:now;raf=requestAnimationFrame(frame)};raf=requestAnimationFrame(frame);
 const observers:PerformanceObserver[]=[];
 for(const type of ['longtask','event'])try{const observer=new PerformanceObserver(list=>{for(const e of list.getEntries())(type==='longtask'?longTasks:events).push(e.duration)});observer.observe({type,buffered:true,...(type==='event'?{durationThreshold:16}:{})});observers.push(observer)}catch{/* Some engines only support frame intervals. */}
 const timer=setInterval(()=>{if(document.hidden){frames=[];longTasks=[];events=[];return;}const sorted=frames.sort((a,b)=>a-b),percent=(p:number)=>Math.round(sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]||0);
  console.info('[preview-performance]',JSON.stringify({phase:document.querySelector('main')?.getAttribute('data-phase'),room:document.querySelector('[data-nest-mode]')?.getAttribute('data-nest-mode'),samples:frames.length,frameP50:percent(.5),frameP95:percent(.95),longTasks:longTasks.length,longTaskMax:Math.round(Math.max(0,...longTasks)),inputMax:Math.round(Math.max(0,...events))}));frames=[];longTasks=[];events=[];
 },5000);
 return()=>{cancelAnimationFrame(raf);clearInterval(timer);observers.forEach(o=>o.disconnect())};
}
