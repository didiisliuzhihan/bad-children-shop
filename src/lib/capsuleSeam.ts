import * as THREE from 'three';

export type SeamLayout={path:string;width:number;height:number;span:number;centerX:number;centerY:number};
export type SeamGesture={id:number;x:number;y:number;axis:'pending'|'horizontal'|'vertical';progress:number};

export function seamThreshold(span:number){return Math.max(46,Math.min(100,span*.3))}
export function moveSeamGesture(start:SeamGesture,x:number,y:number,span:number):SeamGesture{
 const dx=x-start.x,dy=y-start.y;let axis=start.axis;
 if(axis==='pending'&&Math.max(Math.abs(dx),Math.abs(dy))>=8){
  if(Math.abs(dy)>Math.abs(dx)*1.15)axis='vertical';
  else if(Math.abs(dx)>Math.abs(dy)*1.15)axis='horizontal';
 }
 return {...start,axis,progress:axis==='horizontal'?Math.max(-1,Math.min(1,dx/seamThreshold(span))):0};
}
export function canOpenSeam(gesture:SeamGesture|null){return !!gesture&&gesture.axis==='horizontal'&&Math.abs(gesture.progress)>=1}

/** The shell GLB has an equatorial lip at radius .825, translated up .3.
 * Project the front half of that ring through the SAME camera as the shell.
 * No guessed percentage positioning, and no per-frame React state updates. */
export function projectCapsuleSeam(camera:THREE.PerspectiveCamera,width:number,height:number):SeamLayout{
 const angle=Math.atan2(camera.position.x,camera.position.z),points:THREE.Vector3[]=[];
 for(let i=0;i<=48;i++){
  const a=angle-Math.PI/2+i*Math.PI/48;
  const point=new THREE.Vector3(Math.sin(a)*.825,.3,Math.cos(a)*.825).project(camera);
  points.push(new THREE.Vector3((point.x+1)*width/2,(1-point.y)*height/2,0));
 }
 return {path:points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '),width,height,
  span:Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)),centerX:points[24].x,centerY:points[24].y};
}
