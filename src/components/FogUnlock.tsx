import {useEffect,useRef,useState} from 'react';
import type {PointerEvent as ReactPointerEvent} from 'react';
import type {Toy} from '../types';
import {WipeCoverage} from '../lib/questProgress.mjs';
import {sound} from '../lib/audio';
import {Icon} from './Icon';

const questions:Record<string,string>={jimao:'奶茶安排上了么？',kuku_sunflower:'摸了葵的脑袋了么？',stressed_jimao:'帮小鸡毛做了那件小事了么？',miss_popcorn:'告诉她“别急，你好漂亮”了么？',tired_crow:'陪鸦理直气壮地歇过一会儿了么？'};
export function FogUnlock({toy,stage,onCard,onUnlock}:{toy:Toy;stage:string;onCard:()=>void;onUnlock:()=>boolean|Promise<boolean>}){
 const [armed,setArmed]=useState(false),[progress,setProgress]=useState(0),[error,setError]=useState(false);
 const canvas=useRef<HTMLCanvasElement>(null),coverage=useRef(new WipeCoverage()),pointer=useRef<number|null>(null),last=useRef<{x:number;y:number}|null>(null),lastSound=useRef(0),finished=useRef(false);
 const ready=stage==='ready';
 useEffect(()=>{setArmed(false);setProgress(0);finished.current=false;coverage.current=new WipeCoverage()},[toy.id,stage]);
 useEffect(()=>{
  const c=canvas.current;if(!c)return;
  const draw=()=>{
   const dpr=Math.min(devicePixelRatio,1.5),w=c.clientWidth,h=c.clientHeight;c.width=w*dpr;c.height=h*dpr;
   const ctx=c.getContext('2d');if(!ctx)return;ctx.scale(dpr,dpr);
   const fog=ctx.createLinearGradient(0,0,w,h);fog.addColorStop(0,'rgba(239,244,233,.54)');fog.addColorStop(.55,'rgba(217,228,219,.32)');fog.addColorStop(1,'rgba(198,216,213,.51)');ctx.fillStyle=fog;ctx.fillRect(0,0,w,h);
   ctx.strokeStyle='rgba(255,255,245,.36)';ctx.lineWidth=1;
   for(let i=0;i<24;i++){const x=((i*137+43)%997)/997*w,y=((i*71+19)%373)/373*h;ctx.beginPath();ctx.ellipse(x,y,2+i%3,5+i%6,0,0,Math.PI*2);ctx.stroke()}
   coverage.current=new WipeCoverage();last.current=null;pointer.current=null;setProgress(0);
  };
  const observer=new ResizeObserver(draw);observer.observe(c);draw();return()=>observer.disconnect();
 },[armed]);
 const unlock=async()=>{if(!ready||finished.current)return;finished.current=true;setError(false);try{if(await onUnlock()){sound('unlock')}else{finished.current=false;setError(true)}}catch{finished.current=false;setError(true)}};
 const wipe=(e:ReactPointerEvent<HTMLDivElement>)=>{
  const c=canvas.current;if(!c||!ready||!armed||finished.current)return;
  const rect=c.getBoundingClientRect(),x=Math.max(0,Math.min(rect.width,e.clientX-rect.left)),y=Math.max(0,Math.min(rect.height,e.clientY-rect.top));
  const ctx=c.getContext('2d');if(!ctx||!rect.width||!rect.height)return;
  const radius=Math.min(rect.width,rect.height)*.10;
  ctx.globalCompositeOperation='destination-out';ctx.lineWidth=radius*2;ctx.lineCap='round';ctx.lineJoin='round';
  const previous=last.current||{x,y};ctx.beginPath();ctx.moveTo(previous.x,previous.y);ctx.lineTo(x+.01,y+.01);ctx.stroke();
  const steps=Math.min(100,Math.max(1,Math.ceil(Math.hypot(x-previous.x,y-previous.y)/10)));
  let fraction=0;for(let i=0;i<=steps;i++)fraction=coverage.current.add((previous.x+(x-previous.x)*i/steps)/rect.width,(previous.y+(y-previous.y)*i/steps)/rect.height,.085);
  last.current={x,y};const p=Math.min(1,fraction/.25);setProgress(p);
  if(performance.now()-lastSound.current>300){lastSound.current=performance.now();sound('wipe')}
  if(p>=1)unlock();
 };
 const release=(e:ReactPointerEvent<HTMLDivElement>)=>{if(pointer.current!==e.pointerId)return;pointer.current=null;last.current=null;try{e.currentTarget.releasePointerCapture(e.pointerId)}catch{}};
 return <div className={'fog-stage'+(armed?' is-armed':'')} data-quest-stage={stage} data-wipe-progress={progress.toFixed(2)}
  onPointerDown={e=>{if(!armed||!ready||(e.target as Element).closest('button')||pointer.current!==null)return;pointer.current=e.pointerId;last.current=null;e.currentTarget.setPointerCapture(e.pointerId);wipe(e)}}
  onPointerMove={e=>{if(pointer.current===e.pointerId)wipe(e)}} onPointerUp={release} onPointerCancel={release}>
  <img className="fog-silhouette" src={toy.icon_url} alt="" aria-hidden="true" style={{filter:`blur(${14-progress*11}px) saturate(.85)`,opacity:.85+progress*.15}}/>
  <canvas ref={canvas} className="fog-glass" aria-hidden="true"/>
  <div className="fog-water" aria-hidden="true"><i/><i/><i/><i/></div>
  <div className="fog-message">
   <span className="fog-seal"><Icon name={armed?'heart':'lock'} size={18}/></span>
   {stage==='unsaved'?<><h3>它在雾里，等你靠近</h3><p>先把卡片带走，<br/>再去完成那件小事吧。</p><button className="room-pill" onClick={onCard}>去保存卡片<Icon name="arrow" size={15}/></button></>:stage==='waiting'?<><h3>去忙那件小事吧</h3><p>它会在这里等你。</p><span className="fog-task-reminder">做完小任务，再来敲敲玻璃吧。</span></>:<><h3>{armed?(questions[toy.id]||'答应它的那件小事，做完了么？'):'它好像听见你回来了'}</h3><p>{armed?'做完了，就擦擦玻璃吧。':'轻敲玻璃，看看它想说什么。'}</p>{!armed?<button className="room-pill" onClick={()=>{setArmed(true);sound('click')}}>敲敲玻璃<Icon name="heart" size={15}/></button>:<><span className="wipe-progress" aria-hidden="true"><i style={{width:progress*100+'%'}}/></span><button className="wipe-alternative" onClick={unlock}>做完啦，直接解锁</button></>}</>}
   {error&&<p className="room-error" role="alert">进度暂时没能保存，请再试一次。</p>}
  </div>
 </div>;
}
