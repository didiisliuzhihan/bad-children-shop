import {useLayoutEffect,useRef} from 'react';
import gsap from 'gsap';
import type {Phase} from '../types';

/** Carry the capsule into the existing toy layout with one compositor transform,
 * rather than snapping when the portrait changes size/position on opening. */
export function useCapsuleOpeningMotion(phase:Phase,reduced:boolean){
 const portraitRef=useRef<HTMLDivElement>(null),origin=useRef<DOMRect|null>(null);
 const rememberPose=()=>{origin.current=portraitRef.current?.getBoundingClientRect()||null};
 useLayoutEffect(()=>{
  const before=origin.current,node=portraitRef.current;if(phase!=='REVEALED'||!before||!node)return;
  origin.current=null;if(reduced)return;
  const after=node.getBoundingClientRect();if(!after.height)return;
  const animation=gsap.fromTo(node,{x:before.x+before.width/2-after.x-after.width/2,y:before.y+before.height/2-after.y-after.height/2,scale:before.height/after.height,transformOrigin:'50% 50%'},
   {x:0,y:0,scale:1,duration:1.05,ease:'power2.inOut',clearProps:'transform,transformOrigin'});
  return()=>{animation.kill();gsap.set(node,{clearProps:'transform,transformOrigin'})};
 },[phase,reduced]);
 return {portraitRef,rememberPose};
}
