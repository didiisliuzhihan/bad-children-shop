import {Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import type {ThreeEvent} from '@react-three/fiber';
import {Environment,Lightformer,ContactShadows} from '@react-three/drei';
import * as THREE from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {asset,loadModel,releaseModel} from '../assets';
import {dragProgress,shouldCommitDrag} from '../flow.mjs';
import type {Phase,Toy} from '../types';

export function Studio({reveal=false}:{reveal?:boolean}){
 return <><ambientLight intensity={reveal?.6:.55}/><directionalLight position={[-4,8,6]} intensity={reveal?2.5:2.0} color="#fff0dd"/><directionalLight position={[4,3,-3]} intensity={1.4} color="#c8e0ff"/><Environment resolution={256} frames={1}><Lightformer form="rect" intensity={1.9} position={[-5,4,5]} scale={[5,6,1]} rotation={[0,.65,0]}/><Lightformer form="rect" intensity={1.2} position={[5,1,3]} scale={[3,6,1]} rotation={[0,-.85,0]}/><Lightformer form="rect" intensity={1.6} position={[0,7,-1]} scale={[5,5,1]} rotation={[Math.PI/2,0,0]}/></Environment></>
}
const temp=new THREE.Object3D();
function Capsules({phase,reduced}:{phase:Phase;reduced:boolean}){
 const upper=useRef<THREE.InstancedMesh>(null),lower=useRef<THREE.InstancedMesh>(null),ring=useRef<THREE.InstancedMesh>(null);const angle=useRef(0);
 const count=18;const colors=['#d8d9ba','#a8c2cb','#92b5aa','#dde2e1','#b6c6d2'];
 useEffect(()=>{for(let i=0;i<count;i++){lower.current?.setColorAt(i,new THREE.Color(colors[i%colors.length]));upper.current?.setColorAt(i,new THREE.Color('#e1e9e8'));}if(lower.current?.instanceColor)lower.current.instanceColor.needsUpdate=true;if(upper.current?.instanceColor)upper.current.instanceColor.needsUpdate=true},[]);
 useFrame((_,delta)=>{
  const stirring=phase==='SPINNING';angle.current+=delta*(stirring?(reduced?.8:6):phase==='LOCKING'?.6:reduced?0:.12);
  for(let i=0;i<count;i++){
    const a=i*2.399+angle.current, radius=.64*Math.sqrt((i%6+1)/6);const bump=stirring&&!reduced?Math.sin(angle.current*2+i)*.13:0;
    temp.position.set(Math.cos(a)*radius,(Math.floor(i/6)*.38-.35)+bump,Math.sin(a)*radius*.72);
    temp.rotation.set(Math.sin(i)*.4+angle.current*.2,angle.current+i,Math.cos(i)*.25);temp.scale.setScalar(1);temp.updateMatrix();
    upper.current?.setMatrixAt(i,temp.matrix);lower.current?.setMatrixAt(i,temp.matrix);
    temp.rotateX(Math.PI/2);temp.updateMatrix();ring.current?.setMatrixAt(i,temp.matrix);
  }
  for(const ref of [upper,lower,ring])if(ref.current)ref.current.instanceMatrix.needsUpdate=true;
 });
 return <group position={[0,2.55,0]}>
  <instancedMesh ref={upper} args={[undefined,undefined,count]} frustumCulled={false}><sphereGeometry args={[.231,12,6,0,Math.PI*2,0,Math.PI/2]}/><meshPhysicalMaterial roughness={.23} clearcoat={.55}/></instancedMesh>
  <instancedMesh ref={lower} args={[undefined,undefined,count]} frustumCulled={false}><sphereGeometry args={[.231,12,6,0,Math.PI*2,Math.PI/2,Math.PI/2]}/><meshPhysicalMaterial roughness={.3} clearcoat={.45}/></instancedMesh>
  <instancedMesh ref={ring} args={[undefined,undefined,count]} frustumCulled={false}><torusGeometry args={[.231,.009,4,12,Math.PI*2]}/><meshStandardMaterial color="#e6eded" roughness={.3}/></instancedMesh>
 </group>
}
function usePrepared(gltf:GLTF){return useMemo(()=>{const clone=gltf.scene.clone(true);clone.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){m.castShadow=true;m.receiveShadow=true;if(m.name==='dome_glass'){m.material=(m.material as THREE.MeshPhysicalMaterial).clone();const mat=m.material as THREE.MeshPhysicalMaterial;mat.transmission=.97;mat.roughness=.075;mat.thickness=.08;mat.ior=1.35;mat.envMapIntensity=.7;mat.color.set('#e0f0f8');} }});return clone},[gltf])}

function Machine({model,phase,progress,onProgress,onTurn,reduced}:{model:GLTF;phase:Phase;progress:number;onProgress:(n:number)=>void;onTurn:()=>void;reduced:boolean}){
 const scene=usePrepared(model);const root=useRef<THREE.Group>(null);const mixer=useMemo(()=>new THREE.AnimationMixer(scene),[scene]);
 const actions=useMemo(()=>Object.fromEntries(model.animations.map(c=>[c.name,mixer.clipAction(c)])),[mixer,model]);
 const dragStart=useRef<number|null>(null);const triggered=useRef(false);const {size}=useThree();
 const active=phase==='IDLE';
 useEffect(()=>{const pool=scene.getObjectByName('capsules_pool');if(pool)pool.visible=false;const d=scene.getObjectByName('dispense_capsule');if(d)d.visible=false;const a=actions.knob_drag;if(a){a.play();a.paused=true;a.time=0;}return()=>{mixer.stopAllAction();mixer.uncacheRoot(scene)}},[scene,mixer,actions]);
 useEffect(()=>{const drop=scene.getObjectByName('dispense_capsule');if(drop)drop.visible=['DROPPING','PAUSE'].includes(phase);if(phase==='DROPPING'&&actions.capsule_dispense){const a=actions.capsule_dispense;a.reset().setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();}},[phase,scene,actions]);
 useFrame((s,dt)=>{const dial=actions.knob_drag;if(dial)dial.time=THREE.MathUtils.damp(dial.time,(active?progress:1)*dial.getClip().duration,18,dt);mixer.update(dt);
  if(root.current){root.current.rotation.y=THREE.MathUtils.damp(root.current.rotation.y,-.025+(reduced?0:s.pointer.x*.05),3,dt);root.current.position.x=0;root.current.position.y=0;}
 });
 const release=(e:ThreeEvent<PointerEvent>)=>{const p=dragStart.current===null?0:dragProgress(dragStart.current,e.clientX,size.width);if(e.type==='pointerup'&&active&&!triggered.current&&shouldCommitDrag(p,e.pointerType,true)){triggered.current=true;onTurn()}try{(e.target as Element).releasePointerCapture(e.pointerId)}catch{}dragStart.current=null;document.body.style.cursor='';if(!triggered.current)onProgress(0)};
 return <group ref={root} scale={1}>
  <primitive object={scene}/><Capsules phase={phase} reduced={reduced}/>
  <mesh position={[.66,1.15,1.17]} onPointerOver={()=>{if(active)document.body.style.cursor='grab'}} onPointerOut={()=>{document.body.style.cursor=''}}
   onPointerDown={e=>{if(!active)return;e.stopPropagation();dragStart.current=e.clientX;triggered.current=false;(e.target as Element).setPointerCapture(e.pointerId);document.body.style.cursor='grabbing'}}
   onPointerMove={e=>{if(dragStart.current===null||!active||triggered.current)return;const p=dragProgress(dragStart.current,e.clientX,size.width);onProgress(p);if(shouldCommitDrag(p,e.pointerType)){triggered.current=true;onTurn();document.body.style.cursor=''}}}
   onPointerUp={release} onPointerCancel={release}>
   <sphereGeometry args={[.47,16,12]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/>
  </mesh>
 </group>
}
function CameraRig(){const{camera,size}=useThree();useEffect(()=>{const c=camera as THREE.PerspectiveCamera;const span=Math.max(7.05,3.25/(size.width/size.height));const distance=span/(2*Math.tan(16*Math.PI/180));c.position.set(.16,3.45,distance);c.fov=32;c.lookAt(0,3.25,0);c.updateProjectionMatrix()},[camera,size]);return null}
export function MachineScene(props:{model:GLTF;phase:Phase;progress:number;onProgress:(p:number)=>void;onTurn:()=>void;reduced:boolean}){
 return <Canvas dpr={[1,Math.min(devicePixelRatio,innerWidth<768?1.4:1.75)]} camera={{position:[1.65,3.8,13.5],fov:32}} gl={{alpha:true,antialias:true,powerPreference:'high-performance'}}><CameraRig/><Studio/><Suspense fallback={null}><Machine {...props}/></Suspense><ContactShadows position={[0,.015,0]} opacity={.38} scale={11} blur={2.8} far={8} resolution={256} color="#28495c" frames={1}/></Canvas>
}

function RevealObjects({toy,opened,decision,reduced,onReady,onError}:{toy:Toy;opened:boolean;decision:Phase;reduced:boolean;onReady:()=>void;onError:()=>void}){
 const [model,setModel]=useState<GLTF|null>(null),[shell,setShell]=useState<GLTF|null>(null);const group=useRef<THREE.Group>(null),t=useRef(0);const shellRoot=useRef<THREE.Group>(null);
 useEffect(()=>{let alive=true;loadModel(asset('capsule_shell.glb')).then(s=>{if(alive)setShell(s)}).catch(()=>{});return()=>{alive=false}},[]);
 useEffect(()=>{if(!opened)return;let alive=true;loadModel(toy.model_url).then(s=>{if(alive){setModel(s);onReady()}}).catch(()=>{if(alive)onError()});return()=>{alive=false;releaseModel(toy.model_url)}},[toy.model_url,opened]);
 const modelClone=useMemo(()=>{if(!model)return;const clone=model.scene.clone(true);if(toy.id==='stressed_jimao'){const bounds=new THREE.Box3().setFromObject(clone),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());const scale=2.12/size.y;clone.scale.setScalar(scale);clone.position.set(-center.x*scale,1-center.y*scale,-center.z*scale);}return clone},[model,toy.id]);const shellClone=useMemo(()=>shell?.scene.clone(true),[shell]);
 const mixer=useMemo(()=>shellClone?new THREE.AnimationMixer(shellClone):null,[shellClone]);
 useEffect(()=>{t.current=0;if(opened&&mixer&&shell){const clip=shell.animations.find(c=>c.name==='shell_open');if(clip){const a=mixer.clipAction(clip);a.reset().setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play()}}return()=>{mixer?.stopAllAction()}},[opened,mixer,shell]);
 useFrame((_,dt)=>{t.current+=dt;mixer?.update(dt);if(group.current){const p=opened?Math.min(t.current/1.1,1):0;group.current.scale.setScalar((decision==='REJECTED'?Math.max(0,1-t.current):1)*p);group.current.position.y=-.55+p*.12+(reduced?0:Math.sin(t.current*1.6)*.026);group.current.rotation.y=reduced?-.12:opened?-.12+Math.max(0,1-t.current/2.8)*Math.PI*2:0;}if(shellRoot.current){shellRoot.current.scale.setScalar(opened?Math.max(.01,1-Math.max(0,t.current-.85)*2):1);shellRoot.current.rotation.z=opened?0:Math.sin(t.current)*.035;}});
 useEffect(()=>{if(decision==='REJECTED')t.current=0},[decision]);
 return <><group ref={shellRoot} position={[0,.3,0]}>{shellClone?<primitive object={shellClone}/>:<mesh><sphereGeometry args={[.8,32,24]}/><meshPhysicalMaterial color="#b5cddd" roughness={.3}/></mesh>}{!opened&&<mesh><sphereGeometry args={[.783,32,24]}/><meshPhysicalMaterial color="#9ab9ce" roughness={.32}/></mesh>}</group>
  <group ref={group} visible={opened&&!!modelClone} scale={0}>{modelClone&&<group scale={toy.id==='jimao'?1.25:1}><primitive object={modelClone}/></group>}</group>
 </>
}
export function RevealScene(props:{toy:Toy;opened:boolean;decision:Phase;reduced:boolean;onReady:()=>void;onError:()=>void}){
 return <Canvas dpr={[1,1.6]} camera={{position:[.1,1.1,5.7],fov:32}} gl={{alpha:true,antialias:true}} onCreated={({camera})=>{camera.lookAt(0,.45,0)}}><Studio reveal/><RevealObjects {...props}/></Canvas>
}
