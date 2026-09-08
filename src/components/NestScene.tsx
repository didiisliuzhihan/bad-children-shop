import {useCallback,useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {asset,loadModel} from '../assets';
import {viewerLighting} from '../lib/viewerLighting';
import {cloneNestRoom,createNestLighting,type NestTime} from '../lib/nestLighting';
import {floorPoint,frameNestCamera,normalizeResident} from '../lib/nestSceneGeometry';
import {moveResident,RESIDENT_RADIUS} from '../lib/nestPlacement.mjs';
import type {Toy} from '../types';
import type {HomePlacement} from '../lib/communityTypes';
import {captureNestPhoto,type CapturedNestPhoto} from '../lib/nestCapture';
import {nestStoryBounds} from '../lib/nestStoryCamera';
import type {NestMoment} from '../lib/nestLifeTypes';
import {Icon} from './Icon';
import {createNestLifeVisuals} from '../lib/nestLifeVisuals';
import {useNestLife} from '../lib/useNestLife';
import {NestDialogueBubble,type NestBubble} from './NestDialogueBubble';
import {NestStatusBubble,type NestMoodBubble} from './NestStatusBubble';
import {createNestMoodSchedule} from '../lib/nestMood.mjs';
import {createNestShadowSchedule} from '../lib/nestRenderBudget.mjs';
import '../nest-life.css';
let rendererSequence=0;
type SceneProps={toys:Toy[];placements:HomePlacement[];editing:boolean;active?:boolean;lifeReady?:boolean;selected:string|null;timeOfDay:NestTime;onSelect:(id:string|null)=>void;onMove:(id:string,x:number,z:number)=>void;onOpen:(id:string)=>void;onCapture?:(photo:CapturedNestPhoto)=>void};
export function NestScene(props:SceneProps){
 const host=useRef<HTMLDivElement>(null),latest=useRef(props),api=useRef<{sync:()=>void;capture:(moment?:NestMoment)=>Promise<CapturedNestPhoto>}|null>(null);latest.current=props;
 const [capturing,setCapturing]=useState(false),[captureError,setCaptureError]=useState('');
 const takePhoto=async()=>{const current=api.current;if(!current||capturing)return;setCapturing(true);setCaptureError('');try{const photo=await current.capture();if(api.current===current)latest.current.onCapture?.(photo)}catch(error){if(api.current===current)setCaptureError((error as Error).message)}finally{if(api.current===current)setCapturing(false)}};
 const [failure,setFailure]=useState(false),[loading,setLoading]=useState(0),[failedIds,setFailedIds]=useState<string[]>([]),[retry,setRetry]=useState(0);
 const [roomLoading,setRoomLoading]=useState(true),[roomFailure,setRoomFailure]=useState(false);
 const captureMoment=useCallback(async(event:NestMoment)=>{if(!api.current)throw Error('Scene closed');return (await api.current.capture(event)).blob},[]);
 const life=useNestLife(props.active!==false&&props.lifeReady!==false&&!props.editing&&!roomLoading&&!loading&&!failure&&!roomFailure&&!failedIds.length,props.placements,captureMoment),lifeRef=useRef(life);lifeRef.current=life;
 const [bubble,setBubble]=useState<NestBubble|null>(null);
 const [mood,setMood]=useState<NestMoodBubble|null>(null);
 useEffect(()=>setBubble(null),[life.moment?.id,props.editing]);
 useEffect(()=>{
  const el=host.current;if(!el)return;let alive=true,raf=0,roomReady=false;setFailure(false);setLoading(0);setFailedIds([]);setRoomLoading(true);setRoomFailure(false);setCapturing(false);setCaptureError('');
  let renderer:THREE.WebGLRenderer;try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{setFailure(true);return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=viewerLighting.exposure;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;const shadows=createNestShadowSchedule();
  const canvas=renderer.domElement;canvas.dataset.nestRenderer=String(++rendererSequence);canvas.setAttribute('aria-label','小窝三维空间；布置时可以拖动玩具，也可以使用下方位置按钮');el.append(canvas);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-8,8,7,-7,.1,100),raycaster=new THREE.Raycaster(),room=new THREE.Group();scene.add(room);
  const ownedGeometry:THREE.BufferGeometry[]=[],ownedMaterials:THREE.Material[]=[];
  // Blender-built room has the same world scale/floor origin as placement math.
  // No backdrop plane or rectangular presentation frame is part of this scene.
  const pmrem=new THREE.PMREMGenerator(renderer),environmentRoom=new RoomEnvironment(),environment=pmrem.fromScene(environmentRoom,.04);scene.environment=environment.texture;scene.environmentIntensity=viewerLighting.environment;environmentRoom.dispose();pmrem.dispose();
  const lighting=createNestLighting(scene);lighting.setMode(latest.current.timeOfDay);
  const ringGeometry=new THREE.RingGeometry(RESIDENT_RADIUS-.035,RESIDENT_RADIUS,64),ringMaterial=new THREE.MeshBasicMaterial({color:'#527664',side:THREE.DoubleSide,transparent:true,opacity:.8});ownedGeometry.push(ringGeometry);ownedMaterials.push(ringMaterial);
  const selection=new THREE.Mesh(ringGeometry,ringMaterial);selection.rotation.x=-Math.PI/2;selection.position.y=.012;selection.visible=false;scene.add(selection);
  const actors=new Map<string,THREE.Group>(),pending=new Map<string,object>(),failed=new Set<string>();
  const living=createNestLifeVisuals(scene),moods=createNestMoodSchedule();let lastFrame=0,lastBubble=0;
  const render=(now:number)=>{raf=0;if(alive&&latest.current.active!==false&&document.visibilityState!=='hidden'&&el.clientWidth&&el.clientHeight){
   if(latest.current.editing||now-lastFrame>=33){lastFrame=now;const state=latest.current,performance=living.update(now,actors,state.placements,state.editing,lifeRef.current.moment,lifeRef.current.trace);lighting.simmer(performance.pulse);
    if(now-lastBubble>150){lastBubble=now;const speaker=performance.speaker&&actors.get(performance.speaker);
     const anchor=(actor:THREE.Group)=>{const box=new THREE.Box3().setFromObject(actor),point=box.getCenter(new THREE.Vector3());point.y=box.max.y+.12;point.project(camera);const edge=Math.min(45,125/el.clientWidth*100);return {x:Math.max(edge,Math.min(100-edge,(point.x+1)*50)),y:Math.max(18,Math.min(82,(1-point.y)*50))};};
     if(speaker&&lifeRef.current.moment){setBubble({...anchor(speaker),line:performance.line,id:lifeRef.current.moment.id});}else setBubble(previous=>previous?null:previous);
     const feeling=moods.update(now,state.placements.map(p=>p.toyId).filter(id=>actors.has(id)),state.editing||!!lifeRef.current.moment),resident=feeling&&actors.get(feeling.toyId);
     if(feeling&&resident)setMood({...anchor(resident),kind:feeling.kind,id:feeling.id,leaving:feeling.leaving});else setMood(previous=>previous?null:previous);
    }
    if(shadows.update(now))renderer.shadowMap.needsUpdate=true;scene.updateMatrixWorld(true);renderer.render(scene,camera);
   }
   if(roomReady&&!latest.current.editing)invalidate();
  }};
  const invalidate=()=>{if(alive&&latest.current.active!==false&&!raf)raf=requestAnimationFrame(render);};
  void loadModel(asset('room_furnished_nest.glb')).then(g=>{
   if(!alive)return;const {model,materials}=cloneNestRoom(g.scene);ownedMaterials.push(...materials);lighting.bindMaterials(materials);room.add(model);roomReady=true;setRoomLoading(false);sync();
  }).catch(()=>{if(!alive)return;setRoomLoading(false);setRoomFailure(true);});
  const resize=()=>{if(!el.clientWidth||!el.clientHeight)return;renderer.setSize(el.clientWidth,el.clientHeight);frameNestCamera(camera,el.clientWidth,el.clientHeight);invalidate();};
  let gesture:{pointerId:number;toyId:string;startX:number;startY:number;offset:THREE.Vector3;original:HomePlacement;editing:boolean}|null=null;
  const cancelGesture=()=>{const previous=gesture;gesture=null;if(previous?.editing){latest.current.onMove(previous.toyId,previous.original.x,previous.original.z);const model=actors.get(previous.toyId);if(model)model.position.set(previous.original.x,0,previous.original.z);}if(previous&&canvas.hasPointerCapture(previous.pointerId))canvas.releasePointerCapture(previous.pointerId);invalidate();};
  const sync=()=>{
   if(!alive)return;const state=latest.current;shadows.invalidate();if(state.active===false){cancelAnimationFrame(raf);raf=0;return;}lighting.setMode(state.timeOfDay);invalidate();if(!roomReady)return;const wanted=new Set(state.placements.map(p=>p.toyId));
   if(gesture&&(!wanted.has(gesture.toyId)||gesture.editing!==state.editing))cancelGesture();
   canvas.style.touchAction=state.editing?'none':'pan-y pinch-zoom';canvas.style.cursor=state.editing?'grab':'pointer';
   for(const [id,model] of actors)if(!wanted.has(id)){scene.remove(model);actors.delete(id);}for(const id of pending.keys())if(!wanted.has(id))pending.delete(id);
   let removedFailure=false;for(const id of failed)if(!wanted.has(id)){failed.delete(id);removedFailure=true;}if(removedFailure)setFailedIds([...failed]);
   for(const p of state.placements){
    const model=actors.get(p.toyId);if(model){model.position.set(p.x,0,p.z);model.rotation.y=p.rotation;continue;}if(pending.has(p.toyId)||failed.has(p.toyId))continue;
    const toy=state.toys.find(t=>t.id===p.toyId);if(!toy)continue;const token={};pending.set(p.toyId,token);
    void loadModel(toy.model_url).then(g=>{if(!alive||pending.get(p.toyId)!==token)return;const current=latest.current.placements.find(entry=>entry.toyId===p.toyId);if(!current)return;const resident=normalizeResident(g.scene,p.toyId);actors.set(p.toyId,resident);scene.add(resident);pending.delete(p.toyId);sync();}).catch(()=>{if(!alive||pending.get(p.toyId)!==token)return;pending.delete(p.toyId);failed.add(p.toyId);setFailedIds([...failed]);sync();});
   }
   setLoading(pending.size);selection.visible=state.editing&&!!state.selected&&actors.has(state.selected);const chosen=state.placements.find(p=>p.toyId===state.selected);if(chosen)selection.position.set(chosen.x,.012,chosen.z);invalidate();
  };
  const capture=async(moment?:NestMoment)=>{
   if(!alive||latest.current.active===false||!roomReady||pending.size||failed.size||gesture||latest.current.editing||document.hidden)throw Error('等小住客全部到齐、退出布置后，再拍一张吧。');
   if(!moment)sync();const state=latest.current,createdAt=new Date().toISOString(),timeOfDay=state.timeOfDay,residentIds=state.placements.filter(p=>actors.has(p.toyId)).map(p=>p.toyId);
   if(moment&&moment.id!==lifeRef.current.moment?.id)throw Error('这个小片段已经结束，不补拍别的时刻。');
   const options=moment?{focus:nestStoryBounds(moment.kind,actors,living.photoProps()),format:'image/png' as const}:undefined;
   const blob=await captureNestPhoto(renderer,scene,camera,selection,timeOfDay,options);if(!alive)throw Error('小窝已经关闭，这次没有保存照片。');return {blob,createdAt,timeOfDay,residentIds};
  };
  api.current={sync,capture};
  const down=(event:PointerEvent)=>{
   if(!roomReady||!event.isPrimary||event.button!==0||gesture)return;const point=floorPoint(raycaster,camera,canvas.getBoundingClientRect(),event.clientX,event.clientY);if(!point)return;
   scene.updateMatrixWorld(true);const hit=raycaster.intersectObjects([...actors.values()],true)[0],id=hit?.object.userData.toyId as string|undefined;
   if(!id){if(latest.current.editing)latest.current.onSelect(null);return;}const original=latest.current.placements.find(p=>p.toyId===id);if(!original)return;
   gesture={pointerId:event.pointerId,toyId:id,startX:event.clientX,startY:event.clientY,original:{...original},offset:point.sub(new THREE.Vector3(original.x,0,original.z)),editing:latest.current.editing};
   if(latest.current.editing){event.preventDefault();canvas.setPointerCapture(event.pointerId);canvas.style.cursor='grabbing';latest.current.onSelect(id);}
  };
  const move=(event:PointerEvent)=>{
   if(!gesture||event.pointerId!==gesture.pointerId)return;if(!gesture.editing){if(Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY)>7)gesture=null;return;}
   event.preventDefault();const point=floorPoint(raycaster,camera,canvas.getBoundingClientRect(),event.clientX,event.clientY);if(!point)return;point.sub(gesture.offset);
   const moved:HomePlacement[]=moveResident(latest.current.placements,gesture.toyId,point.x,point.z),next=moved.find(p=>p.toyId===gesture?.toyId);if(!next)return;
   latest.current={...latest.current,placements:moved};const model=actors.get(gesture.toyId);if(model)model.position.set(next.x,0,next.z);selection.position.set(next.x,.012,next.z);latest.current.onMove(gesture.toyId,next.x,next.z);invalidate();
  };
  const up=(event:PointerEvent)=>{if(!gesture||event.pointerId!==gesture.pointerId)return;const completed=gesture;gesture=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);canvas.style.cursor=latest.current.editing?'grab':'pointer';if(!completed.editing&&Math.hypot(event.clientX-completed.startX,event.clientY-completed.startY)<7)latest.current.onOpen(completed.toyId);};
  const cancel=(event:PointerEvent)=>{if(gesture?.pointerId===event.pointerId)cancelGesture();};const contextLost=(event:Event)=>{event.preventDefault();setFailure(true);};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);canvas.addEventListener('webglcontextlost',contextLost);
  const observer=new ResizeObserver(resize);observer.observe(el);document.addEventListener('visibilitychange',invalidate);window.addEventListener('blur',cancelGesture);resize();sync();
  return()=>{alive=false;api.current=null;cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',invalidate);window.removeEventListener('blur',cancelGesture);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('lostpointercapture',cancel);canvas.removeEventListener('webglcontextlost',contextLost);pending.clear();actors.clear();living.dispose();ownedGeometry.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());lighting.dispose();environment.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();};
  // Cached GLTF geometry/materials are shared with the reveal/viewer, never disposed here.
 },[retry]);
 useEffect(()=>api.current?.sync(),[props.placements,props.toys,props.editing,props.selected,props.timeOfDay,props.active]);
 return <><div className="nest-world" data-nest-mode={props.editing?'arrange':'visit'}><div ref={host} className="nest-world-canvas"/>{mood&&!props.editing&&!bubble&&<NestStatusBubble key={mood.id} mood={mood}/>}{bubble&&!props.editing&&<NestDialogueBubble key={bubble.id} bubble={bubble}/>}{roomLoading&&!failure&&<div className="nest-world-status" role="status">正在为小窝亮灯…</div>}{loading>0&&!failure&&<div className="nest-world-status" role="status">小住客正在走过来…</div>}{failedIds.length>0&&!failure&&<div className="nest-world-status" role="status">有 {failedIds.length} 只暂时没加载好。<button className="room-pill" onClick={()=>setRetry(n=>n+1)}>重试模型</button></div>}{(failure||roomFailure)&&<div className="nest-world-error" role="alert"><p>三维空间暂时没有打开，布置草稿仍在。</p><button className="room-pill" onClick={()=>setRetry(n=>n+1)}>重新打开</button></div>}</div>{life.error&&<p className="nest-life-status" role="status">{life.error}</p>}{props.onCapture&&<div className="nest-photo-actions"><span role="status">{captureError|| (props.editing?'退出布置后，可以拍下这一刻。':'')}</span><button className="room-pill" disabled={capturing||props.editing||roomLoading||roomFailure||failure||loading>0||failedIds.length>0} onClick={()=>void takePhoto()}><Icon name="camera" size={18}/>{capturing?'正在拍照…':'拍成明信片'}</button></div>}</>;
}
