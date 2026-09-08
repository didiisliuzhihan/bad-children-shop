import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {nestStoryBounds,frameNestStoryCamera} from '../src/lib/nestStoryCamera.ts';
import {frameNestCamera} from '../src/lib/nestSceneGeometry.ts';
import {captureNestPhoto} from '../src/lib/nestCapture.ts';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
function actor(x,z,height=2){const mesh=new THREE.Mesh(new THREE.BoxGeometry(1.4,height,1.4),new THREE.MeshBasicMaterial());mesh.position.set(x,height/2,z);return mesh;}
function fixture(){const popcorn=actor(-1,1,2.5),crow=actor(1,1,2),unrelated=actor(4,4,3),cup=actor(.8,1.9,.25);return {actors:new Map([['miss_popcorn',popcorn],['tired_crow',crow],['jimao',unrelated]]),cup,popcorn,crow};}
test('private photo framing contains only participating residents plus their actual visible prop',()=>{
 const f=fixture(),bounds=nestStoryBounds('soup',f.actors,f.cup);
 assert(bounds.containsBox(new THREE.Box3().setFromObject(f.popcorn)));assert(bounds.containsBox(new THREE.Box3().setFromObject(f.crow)));assert(bounds.containsBox(new THREE.Box3().setFromObject(f.cup)));
 assert(!bounds.containsBox(new THREE.Box3().setFromObject(f.actors.get('jimao'))));
 const solo=nestStoryBounds('solo_crow',f.actors);assert(solo.equals(new THREE.Box3().setFromObject(f.crow)));
 assert.throws(()=>nestStoryBounds('unknown',f.actors));f.actors.delete('miss_popcorn');assert.throws(()=>nestStoryBounds('soup',f.actors),'Missing cast must not silently photograph an unrelated room');
});
test('close-up fits all actor corners, is tighter than the full room, and preserves direction',()=>{
 const f=fixture();
 for(const [width,height] of [[390,420],[1200,700],[960,960]])for(const [kind,prop] of [['soup',f.cup],['solo_crow',undefined]]){
  const live=new THREE.OrthographicCamera();frameNestCamera(live,width,height);const before=live.clone(),camera=live.clone(),bounds=nestStoryBounds(kind,f.actors,prop);frameNestStoryCamera(camera,bounds);
  assert(camera.quaternion.equals(before.quaternion));assert(camera.top<before.top*.7);assert.equal(camera.right,camera.top);assert(live.projectionMatrix.equals(before.projectionMatrix));assert(live.position.equals(before.position));
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);assert(Math.abs(p.x)<.86&&Math.abs(p.y)<.86);assert(p.z>-1&&p.z<1);}
 }
});
test('PNG close-up uses an independent camera, preserves pose/lighting, and restores canvas on success',async()=>{
 const previousDocument=globalThis.document,f=fixture(),scene=new THREE.Scene(),selection=new THREE.Object3D();scene.add(...f.actors.values(),f.cup,selection);selection.visible=true;
 const light=new THREE.PointLight('#ffaa66',3);scene.add(light);const camera=new THREE.OrthographicCamera();frameNestCamera(camera,390,420);const saved=camera.clone(),rotation=f.crow.rotation.clone();f.crow.rotation.y=.31;const pose=f.crow.rotation.clone(),focus=nestStoryBounds('soup',f.actors,f.cup),ops=[];
 let size=new THREE.Vector2(390,420),ratio=1.5,requestedFormat;
 globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},drawImage(){ops.push('pixels')}}),toBlob:(callback,format)=>{requestedFormat=format;callback(new Blob([new Uint8Array([137,80,78,71])],{type:format}))}})};
 const renderer={domElement:{},getSize:v=>v.copy(size),getPixelRatio:()=>ratio,setPixelRatio:r=>ratio=r,setSize:(x,y)=>size.set(x,y),render:(_scene,view)=>{if(size.x===960){assert.notEqual(view,camera);assert(view.top<saved.top*.7);assert(!selection.visible);assert.equal(light.intensity,3);assert(f.crow.rotation.equals(pose));ops.push('closeup')}else{assert.equal(view,camera);ops.push('restore')}}};
 try{const blob=await captureNestPhoto(renderer,scene,camera,selection,'night',{focus,format:'image/png'});assert.equal(requestedFormat,'image/png');assert.equal(blob.type,'image/png');assert.deepEqual(ops,['closeup','pixels','restore']);assert(camera.position.equals(saved.position));assert(camera.projectionMatrix.equals(saved.projectionMatrix));assert.deepEqual(size.toArray(),[390,420]);assert.equal(ratio,1.5);assert(selection.visible);assert(f.crow.rotation.equals(pose));}finally{f.crow.rotation.copy(rotation);globalThis.document=previousDocument}
});
test('story upload and capture agree on PNG; completion remains owner-scoped with no historical replacement',()=>{
 const scene=read('src/components/NestScene.tsx'),provider=read('src/components/AccountProvider.tsx'),edge=read('supabase/functions/bc-account-preview/index.ts');
 assert(scene.includes("format:'image/png'"));assert(scene.includes('moment.id!==lifeRef.current.moment?.id'));assert(scene.includes('if(!moment)sync()'));
 assert(provider.includes("blob.type!=='image/png'"));assert(provider.includes("form.set('nestEvent',eventId)"));assert(edge.includes("file.type!=='image/png'"));
 assert(edge.includes(".eq('user_id',uid).eq('event_id',nestEvent).is('media',null)"));assert(edge.includes(".not('collected_at','is',null)"));
});
