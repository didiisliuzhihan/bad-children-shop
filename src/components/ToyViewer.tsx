import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {loadModel} from '../assets';
import type {Toy} from '../types';
import {viewerLighting} from '../lib/viewerLighting';
import type {ViewerLighting} from '../lib/viewerLighting';

const directions={front:[0,.065,1],quarter:[.35,.14,1],side:[-1,.065,0],back:[0,.065,-1]} as const;
export function ToyViewer({toy,lighting=viewerLighting}:{toy:Toy;lighting?:ViewerLighting}){
 const host=useRef<HTMLDivElement>(null),api=useRef<{angle:(name:keyof typeof directions)=>void;rotate:(value:boolean)=>void}|null>(null);
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0),[angle,setAngle]=useState('quarter'),[rotating,setRotating]=useState(false);
 useEffect(()=>{
  const el=host.current;if(!el)return;let alive=true;setReady(false);setFailed(false);setRotating(false);setAngle('quarter');
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'})}catch{setFailed(true);return}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=lighting.tone==='neutral'?THREE.NeutralToneMapping:THREE.AgXToneMapping;renderer.toneMappingExposure=lighting.exposure;el.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.01,200);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.maxPolarAngle=Math.PI*.75;controls.autoRotateSpeed=.9;
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=lighting.environment;room.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#fff4dd','#b3c7c8',lighting.hemisphere));
  const key=new THREE.DirectionalLight('#fff1da',lighting.key);key.position.set(-3,6,5);scene.add(key);
  const fill=new THREE.DirectionalLight('#d9ecff',lighting.fill);fill.position.set(5,3,-4);scene.add(fill);
  let radius=1,distance=6,selected:keyof typeof directions='quarter',hasModel=false;
  const bounds=new THREE.Box3();
  const fitDistance=(name:keyof typeof directions)=>{
   const direction=new THREE.Vector3(...directions[name]).normalize(),right=new THREE.Vector3(0,1,0).cross(direction).normalize(),up=direction.clone().cross(right);
   const vertical=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),horizontal=vertical*camera.aspect;let fit=0;
   for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
    const p=new THREE.Vector3(x,y,z).sub(controls.target),depth=p.dot(direction);
    fit=Math.max(fit,depth+Math.abs(p.dot(right))/horizontal,depth+Math.abs(p.dot(up))/vertical);
   }
   return Math.max(radius,fit)*1.12;
  };
  let raf=0;
  const invalidate=()=>{if(alive&&!document.hidden&&!raf)raf=requestAnimationFrame(frame)};
  const frame=()=>{raf=0;if(!alive||document.hidden||!el.clientWidth||!el.clientHeight)return;const changed=controls.update();renderer.render(scene,camera);if(controls.autoRotate||changed)invalidate()};
  controls.addEventListener('change',invalidate);
  const angleTo=(name:keyof typeof directions)=>{selected=name;controls.autoRotate=false;if(hasModel)distance=fitDistance(name);controls.maxDistance=distance*1.8;camera.position.copy(controls.target).add(new THREE.Vector3(...directions[name]).normalize().multiplyScalar(distance));controls.update();invalidate()};
  const resize=()=>{
   const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;
   camera.aspect=w/h;const vertical=THREE.MathUtils.degToRad(camera.fov/2),horizontal=Math.atan(Math.tan(vertical)*camera.aspect);
   distance=radius/Math.sin(Math.min(vertical,horizontal))*1.01;camera.near=radius/100;camera.far=distance*20;camera.updateProjectionMatrix();
   controls.minDistance=radius*1.5;controls.maxDistance=distance*1.8;renderer.setSize(w,h);if(hasModel){const spinning=controls.autoRotate;angleTo(selected);controls.autoRotate=spinning;}
  };
  api.current={angle:angleTo,rotate:value=>{controls.autoRotate=value;invalidate()}};
  const manual=()=>{controls.autoRotate=false;setRotating(false);setAngle('')};controls.addEventListener('start',manual);
  const observer=new ResizeObserver(resize);observer.observe(el);
  const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0}else invalidate()};
  document.addEventListener('visibilitychange',visibility);visibility();
  const contextLost=(e:Event)=>{e.preventDefault();if(alive)setFailed(true)};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  void loadModel(toy.model_url).then(g=>{
   if(!alive)return;
   // Keep the approved GLB's materials and vertex colours verbatim.
   const model=g.scene.clone(true);scene.add(model);
   bounds.setFromObject(model);const sphere=bounds.getBoundingSphere(new THREE.Sphere());radius=Math.max(.1,sphere.radius);controls.target.copy(sphere.center);hasModel=true;resize();setReady(true);
  }).catch(()=>{if(alive)setFailed(true)});
  return()=>{
   alive=false;api.current=null;observer.disconnect();document.removeEventListener('visibilitychange',visibility);
   renderer.domElement.removeEventListener('webglcontextlost',contextLost);cancelAnimationFrame(raf);controls.removeEventListener('change',invalidate);controls.dispose();environment.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
   // CPU GLTF cache is shared with the reveal animation; never dispose it here.
  };
 },[toy.model_url,retry,lighting]);
 return <div className="toy-viewer" data-viewer-ready={ready&&!failed} data-viewer-look={lighting.id}>
  <div ref={host} className="toy-viewer-canvas" aria-label={toy.name_zh+'三维模型，可拖动旋转和双指缩放'}/>
  {!ready&&!failed&&<div className="viewer-status" role="status"><span className="loading-ring"/><span>它正在走过来…</span></div>}
  {failed&&<div className="viewer-status"><p>模型暂时没能加载，解锁进度还在。</p><button className="room-pill" onClick={()=>setRetry(n=>n+1)}>重新加载</button></div>}
  <div className="viewer-angles" aria-label="模型观察角度">
   {([['front','正面'],['quarter','斜侧'],['side','侧面'],['back','背面']] as const).map(([key,label])=><button key={key} disabled={!ready||failed} aria-pressed={angle===key&&!rotating} onClick={()=>{api.current?.angle(key);setAngle(key);setRotating(false)}}>{label}</button>)}
   <button disabled={!ready||failed} aria-pressed={rotating} onClick={()=>{api.current?.rotate(!rotating);setRotating(!rotating)}}>自动旋转</button>
  </div><p className="viewer-hint">拖动旋转 · 双指或滚轮缩放</p>
 </div>;
}
