import {useEffect,useRef,useState} from 'react';
import {useAccount} from './AccountContext';
import {eligibleMoments,lifeDirection} from './nestLifeRules.mjs';
import type {HomePlacement} from './communityTypes';
import type {NestMoment,NestTrace} from './nestLifeTypes';

export function useNestLife(ready:boolean,placements:HomePlacement[],capture:(event:NestMoment)=>Promise<Blob>){
 const account=useAccount(),latest=useRef({account,placements,capture});latest.current={account,placements,capture};
 const [moment,setMoment]=useState<NestMoment|null>(null),[trace,setTrace]=useState<NestTrace|null>(null),[error,setError]=useState('');
 const revision=account?.documents.nest?.revision||0,owner=account?.profile?.user_id;
 const layout=JSON.stringify(placements);
 useEffect(()=>{
  let live=true,visible=!document.hidden,busy=false,eventActive=false;const lease=crypto.randomUUID(),timers=new Set<ReturnType<typeof setTimeout>>();
  setMoment(null);setTrace(null);setError('');
  const later=(fn:()=>void,ms:number)=>{const id=setTimeout(()=>{timers.delete(id);if(live&&visible)fn()},ms);timers.add(id);};
  const call=(operation:string,requestId?:string)=>latest.current.account?.homeLife?.(operation,{lease,revision,requestId});
  const play=(event:NestMoment)=>{
   eventActive=true;setMoment(event);let photo:Promise<Blob|null>=Promise.resolve(null);
   later(()=>{photo=latest.current.capture(event).catch(()=>null)},8000);
   later(()=>{void (async()=>{
    try{
     if(owner){const result=await call('complete',event.id);if(!live||!visible)return;
      if(result?.ok){setTrace(result.trace||null);const blob=await photo;if(result.capture&&blob&&live&&visible)await latest.current.account?.captureLife?.(event.id,blob);}
     }else{const d=lifeDirection(event.kind);if(d)setTrace({kind:d.prop,toyId:d.speaker,until:new Date(Date.now()+600000).toISOString()});}
    }catch{if(live)setError('小片段暂时没能留住，下一次再试。');}
    finally{if(live){eventActive=false;later(()=>setMoment(null),10000);}}
   })()},13500);
  };
  const poll=async()=>{
   if(!live||!visible||!ready||busy)return;busy=true;
   try{if(owner){const result=await call('visit');if(live&&visible&&result?.trace)setTrace(result.trace);}}
   catch{if(live)setError('小窝生活暂未同步；声音和布置仍可查看。');}finally{busy=false;}
  };
  const tryEvent=async()=>{
   if(!live||!visible||!ready||eventActive)return;
   try{
    if(owner){const result=await call('start');if(live&&visible&&result?.event){setError('');play(result.event);}}
    else{const choices=eligibleMoments(latest.current.placements),pairs=choices.filter(e=>e.actors.length===2),pool=pairs.length?pairs:choices;
     const e=pool[Math.floor(Math.random()*pool.length)];if(e)play({id:crypto.randomUUID(),kind:e.id});}
   }catch{if(live)setError('小住客正在安静待着，稍后再同步。');}
  };
  const begin=()=>{if(ready&&visible){void poll();later(()=>void tryEvent(),owner?35000+Math.random()*15000:18000+Math.random()*9000);}};
  const visibility=()=>{visible=!document.hidden;if(!visible){timers.forEach(clearTimeout);timers.clear();setMoment(null);eventActive=false;if(owner&&ready)void call('leave')?.catch(()=>{});}else begin();};
  const heartbeat=setInterval(()=>void poll(),20000),events=setInterval(()=>void tryEvent(),185000+Math.random()*35000);
  document.addEventListener('visibilitychange',visibility);begin();
  return()=>{live=false;timers.forEach(clearTimeout);clearInterval(heartbeat);clearInterval(events);document.removeEventListener('visibilitychange',visibility);if(owner&&ready)void call('leave')?.catch(()=>{});};
 },[ready,owner,revision,layout]);
 return {moment,trace,error};
}
