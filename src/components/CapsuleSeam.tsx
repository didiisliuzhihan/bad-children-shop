import {useRef,useState,type PointerEvent,type RefObject} from 'react';
import {tx,useLanguage} from '../lib/i18n';
import {canOpenSeam,moveSeamGesture,type SeamGesture,type SeamLayout} from '../lib/capsuleSeam';
import '../capsule-seam.css';

export function CapsuleSeam({layout,drag,onOpen}:{layout:SeamLayout|null;drag:RefObject<number>;onOpen:()=>void}){
 useLanguage();
 const gesture=useRef<SeamGesture|null>(null),committed=useRef(false);
 const [progress,setProgress]=useState(0),[holding,setHolding]=useState(false);
 const update=(value:number)=>{drag.current=value;setProgress(value)};
 const releaseCapture=(event:PointerEvent<SVGPathElement>)=>{try{event.currentTarget.releasePointerCapture(event.pointerId)}catch{}};
 const commit=()=>{if(committed.current)return;committed.current=true;gesture.current=null;onOpen()};
 const end=(event:PointerEvent<SVGPathElement>,cancel=false)=>{
  const current=gesture.current;if(!current||current.id!==event.pointerId)return;
  // Only a completed pointer-up commits. OS cancellation never opens a capsule.
  const final=layout?moveSeamGesture(current,event.clientX,event.clientY,layout.span):current;
  gesture.current=null;setHolding(false);releaseCapture(event);
  if(!cancel&&canOpenSeam(final)){update(final.progress);commit()}else update(0);
 };
 if(!layout)return null;
 return <svg className={'capsule-seam'+(holding?' is-dragging':'')} viewBox={`0 0 ${layout.width} ${layout.height}`} data-progress={Math.abs(progress).toFixed(2)}>
  <g className="seam-light" aria-hidden="true">
   <path className="seam-aura" d={layout.path}/><path className="seam-halo" d={layout.path}/><path className="seam-bloom" d={layout.path}/><path className="seam-core" d={layout.path}/>
   <g className="seam-arrows" transform={`translate(${layout.centerX},${layout.centerY})`}><path d="M-19 -3 l-4 3 4 3 M19 -3 l4 3 -4 3"/></g>
  </g>
  <path className="seam-charge" aria-hidden="true" d={layout.path} pathLength={1} strokeDasharray={`${Math.abs(progress)} 1`} strokeDashoffset={progress<0?Math.abs(progress)-1:0}/>
  <g className="seam-guide" aria-hidden="true">
   <g className="seam-guide-spot">
    {/* Paced motion follows arc length, not the unevenly spaced projected
        vertices. The browser animates it without a React frame loop. */}
    <animateMotion path={layout.path} dur="2.8s" repeatCount="indefinite" calcMode="paced" rotate="auto"/>
    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.88;1" dur="2.8s" repeatCount="indefinite"/>
    <ellipse className="seam-guide-tail" cx={-9} rx={14} ry={3}/>
    <circle className="seam-guide-halo" r={10}/>
    <circle className="seam-guide-core" r={4.5}/>
   </g>
  </g>
  <path className="seam-hit" d={layout.path} role="button" tabIndex={0} aria-label={tx('左右滑动发光接缝打开扭蛋，或按回车')} aria-describedby="capsule-seam-hint"
   onPointerDown={event=>{
    if(committed.current||gesture.current||!event.isPrimary||event.button!==0)return;
    gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY,axis:'pending',progress:0};setHolding(true);update(0);
    event.currentTarget.setPointerCapture(event.pointerId);
   }}
   onPointerMove={event=>{
    if(!gesture.current||gesture.current.id!==event.pointerId)return;
    const next=moveSeamGesture(gesture.current,event.clientX,event.clientY,layout.span);gesture.current=next;
    if(next.axis==='vertical'){gesture.current=null;setHolding(false);update(0);releaseCapture(event);return}
    if(next.axis==='horizontal')event.preventDefault();update(next.progress);
   }}
   onPointerUp={event=>end(event)} onPointerCancel={event=>end(event,true)}
   onLostPointerCapture={event=>{if(event.target===event.currentTarget)end(event,true)}}
   onKeyDown={event=>{if(['Enter',' ','ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();commit()}}}
   onClick={event=>{if(event.detail===0)commit()}}/>
 </svg>;
}
