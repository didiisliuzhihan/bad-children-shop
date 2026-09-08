import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import fs from 'node:fs';
import {placeResident,moveResident,rotateResident,constrainPosition,placementFits,readLayout,saveLayout,NEST_LAYOUT_KEY,NEST_ROOM_ID,NEST_BOUNDS,NEST_OBSTACLES,RESIDENT_RADIUS,RESIDENT_BASE_RADIUS,RESIDENT_SCALE} from '../src/lib/nestPlacement.mjs';
import {normalizeResident,frameNestCamera,floorPoint,roomBounds} from '../src/lib/nestSceneGeometry.ts';
const eligible=['jimao','kuku_sunflower','stressed_jimao','miss_popcorn','tired_crow'];
const initial={toyId:'tired_crow',x:0,z:0,rotation:0};
function storage(){const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),map};}
test('each owned type can enter; furniture-limited capacity never overlaps or duplicates residents',()=>{
 for(const id of eligible)assert.equal(placeResident([],id,eligible).length,1);
 let placements=[];for(const id of eligible)placements=placeResident(placements,id,eligible);
 assert(placements.length>=2);assert(placements.every(p=>placementFits(p,placements)));
 assert.equal(placeResident(placements,placements[0].toyId,eligible),placements);assert.equal(placeResident(placements,'stamp-sheep',eligible),placements);assert.equal(placeResident([],eligible[0],[]).length,0);
});
test('drag keeps fractional world coordinates, has no fixed slots, and clamps edges',()=>{
 const moved=moveResident([initial],initial.toyId,1.234,-.876);assert.equal(moved[0].x,1.234);assert.equal(moved[0].z,-.876);
 const edge=moveResident(moved,initial.toyId,999,0)[0];assert.deepEqual({x:edge.x,z:edge.z},constrainPosition(999,0));assert(placementFits(edge,[edge]));
});
test('overlap is rejected and last legal position remains intact',()=>{
 const placements=[initial,{toyId:'jimao',x:2.2,z:0,rotation:0}];assert.equal(moveResident(placements,initial.toyId,2,0),placements);assert.equal(moveResident(placements,initial.toyId,NaN,0),placements);
});
test('rotation changes heading without moving the resident',()=>{
 const next=rotateResident([initial],initial.toyId,-Math.PI/12)[0];assert(Math.abs(next.rotation-Math.PI*23/12)<1e-10);assert.equal(next.x,0);assert.equal(next.z,0);assert.equal(initial.rotation,0);
});

test('square room protects furniture and stair footprints, including after boundary clamping',()=>{
 assert.equal(NEST_BOUNDS.maxX-NEST_BOUNDS.minX,NEST_BOUNDS.maxZ-NEST_BOUNDS.minZ);
 for(const obstacle of NEST_OBSTACLES){
  assert(!placementFits({...initial,x:obstacle.x,z:obstacle.z},[]));
  const moved=moveResident([initial],initial.toyId,obstacle.x,obstacle.z)[0];assert(placementFits(moved,[moved]));
 }
 const store=storage();store.setItem('bc-shop:nest-layout:preview:v1','old temporary room draft');
 assert(saveLayout(store,[initial],eligible));assert.equal(store.getItem('bc-shop:nest-layout:preview:v1'),'old temporary room draft');
});

test('delivered Blender room has embedded PBR maps, matching obstacle metadata and no studio backdrop',()=>{
 const bytes=fs.readFileSync(new URL('../assets/delivery/room_furnished_nest.glb',import.meta.url));
 assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const data=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
 const root=data.nodes.find(n=>n.name==='FURNISHED_NEST_ROOM');assert.equal(root.extras.room_id,NEST_ROOM_ID);assert.equal(root.extras.floor_y_web,0);
 assert.deepEqual(JSON.parse(root.extras.obstacles_web),NEST_OBSTACLES);
 assert(!data.nodes.some(n=>n.name?.includes('PREVIEW_ONLY')||n.camera!==undefined));
 assert(data.images.length>=6);assert(data.images.every(i=>Number.isInteger(i.bufferView)&&!i.uri));
 assert(data.materials.some(m=>m.normalTexture));assert(data.materials.some(m=>m.extensions?.KHR_materials_clearcoat));
 const roof=data.nodes.find(n=>n.name==='Planar mitered rose roof');assert(roof.extras.planar_miter);assert(roof.extras.window_aperture);
 for(let i=0;i<2;i++){assert(data.nodes.find(n=>n.name==='Hollow lavender pan '+i).extras.handle_height_fraction>=.7);assert(data.nodes.some(n=>n.name==='Upper pan handle '+i));}
 const wallIndex=data.materials.findIndex(m=>m.name==='Milky ivory soft clay');assert(wallIndex>=0);
 const wallMaterial=data.materials[wallIndex],expected=new THREE.Color('#f7f1df');
 const base=wallMaterial.pbrMetallicRoughness.baseColorFactor;
 for(const [i,value] of [expected.r,expected.g,expected.b].entries())assert(Math.abs(base[i]-value)<1e-6);
 for(const name of ['Left soft clay wall','Rear soft clay wall']){
  const node=data.nodes.find(n=>n.name===name);assert(node);assert(data.meshes[node.mesh].primitives.every(p=>p.material===wallIndex));
 }
 assert(Math.abs(wallMaterial.pbrMetallicRoughness.roughnessFactor-.52)<1e-6);
 const code=fs.readFileSync(new URL('../src/components/NestScene.tsx',import.meta.url),'utf8');assert(code.includes("loadModel(asset('room_furnished_nest.glb'))"));assert(!code.includes('RoundedBoxGeometry'));assert(code.includes('createNestLighting(scene)'));assert(code.includes('lighting.dispose()'));
 assert.deepEqual(JSON.parse(root.extras.window_light_web),{position:[2.48,17,-10.83],target:[1.1,0,-.2]});
 const css=fs.readFileSync(new URL('../src/community.css',import.meta.url),'utf8');assert.match(css,/\.nest-world\{[^}]*border:0;border-radius:0;background:transparent/);
});
test('saving and reading restore exact positions in isolated preview storage',()=>{
 const store=storage(),p={...initial,x:.23,z:-1.4,rotation:.9};assert(saveLayout(store,[p],eligible));assert.deepEqual(readLayout(store,eligible).placements,[p]);assert.deepEqual([...store.map.keys()],[NEST_LAYOUT_KEY]);
});
test('save failure does not report success; unknown/locked and duplicate entries cannot save',()=>{
 assert.equal(saveLayout({setItem(){throw Error('quota')}},[initial],eligible),false);assert.equal(saveLayout(storage(),[initial],[]),false);assert.equal(saveLayout(storage(),[initial,initial],eligible),false);
});
test('corrupt and incompatible saved rooms are not overwritten on read',()=>{
 const store=storage();store.setItem(NEST_LAYOUT_KEY,'{bad');assert(readLayout(store,eligible).error);assert.equal(store.getItem(NEST_LAYOUT_KEY),'{bad');store.setItem(NEST_LAYOUT_KEY,JSON.stringify({version:1,roomId:'future-house',placements:[]}));assert(readLayout(store,eligible).error);
});
test('restore ignores unknown ownership, non-finite and duplicate transforms',()=>{
 const store=storage();store.setItem(NEST_LAYOUT_KEY,JSON.stringify({version:1,roomId:NEST_ROOM_ID,placements:[initial,initial,{toyId:'jimao',x:'oops',z:2,rotation:0},{toyId:'stamp',x:3,z:2,rotation:0}]}));assert.deepEqual(readLayout(store,eligible).placements,[initial]);
});
test('normalization grounds entire crow-chair group and preserves material/geometry',()=>{
 const source=new THREE.Group(),material=new THREE.MeshStandardMaterial({color:'#c03832',roughness:.41});const chair=new THREE.Mesh(new THREE.BoxGeometry(4,4,3),material);chair.position.set(1,6,-.5);const bird=new THREE.Mesh(new THREE.SphereGeometry(1.5,16,12),material);bird.position.set(1,8,0);source.add(chair,bird);source.position.set(2,4,3);source.rotation.y=.2;
 const before=source.matrixWorld.clone(),normalized=normalizeResident(source,'tired_crow'),box=new THREE.Box3().setFromObject(normalized),size=box.getSize(new THREE.Vector3());assert(Math.abs(box.min.y)<1e-6);assert(Math.abs(box.getCenter(new THREE.Vector3()).x)<1e-6);assert(Math.abs(box.getCenter(new THREE.Vector3()).z)<1e-6);assert(Math.hypot(size.x,size.z)/2<RESIDENT_RADIUS);assert(size.y<=1.90001*RESIDENT_SCALE);assert.equal(normalized.children[0].children.length,2);assert.equal(normalized.children[0].children[0].material,material);assert.equal(normalized.children[0].children[0].geometry,chair.geometry);assert(source.matrixWorld.equals(before));assert.equal(chair.position.y,6);
});

test('every resident grows exactly 1.5 times on all axes, including footprint-limited models',()=>{
 assert.equal(RESIDENT_SCALE,1.5);assert.equal(RESIDENT_RADIUS,RESIDENT_BASE_RADIUS*1.5);
 const heights={jimao:1.6,kuku_sunflower:1.95,stressed_jimao:2.1,miss_popcorn:2,tired_crow:1.9};
 for(const [id,height] of Object.entries(heights))for(const dimensions of [[1,4,1],[4,1,3]]){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...dimensions));const source=new THREE.Group();source.add(mesh);
  const size=new THREE.Box3().setFromObject(normalizeResident(source,id)).getSize(new THREE.Vector3());
  const oldFit=Math.min(height/dimensions[1],(RESIDENT_BASE_RADIUS*2-.08)/Math.hypot(dimensions[0],dimensions[2]));
  for(let axis=0;axis<3;axis++)assert(Math.abs(size.getComponent(axis)/(dimensions[axis]*oldFit)-1.5)<1e-7);
 }
});

test('saved small-scale arrangements reflow nearby without losing residents or overwriting storage',()=>{
 const store=storage(),original=[initial,{toyId:'miss_popcorn',x:2,z:0,rotation:.9},{toyId:'jimao',x:-3.5,z:3.5,rotation:1.2}];
 const raw=JSON.stringify({version:1,roomId:NEST_ROOM_ID,placements:original});store.setItem(NEST_LAYOUT_KEY,raw);
 const restored=readLayout(store,eligible);assert(restored.adjusted);assert.equal(restored.placements.length,original.length);assert.deepEqual(restored.placements.map(p=>p.toyId),original.map(p=>p.toyId));assert(restored.placements.every(p=>placementFits(p,restored.placements)));assert.equal(restored.placements[1].rotation,.9);assert.equal(store.getItem(NEST_LAYOUT_KEY),raw);
 assert.deepEqual(readLayout(store,eligible),restored);assert(saveLayout(store,restored.placements,eligible));assert.equal(readLayout(store,eligible).adjusted,false);
});

test('moving into furnished room preserves the old draft and reports residents with no free floor space',()=>{
 const store=storage(),previousKey='bc-shop:nest-layout:preview:initial-v1';
 const raw=JSON.stringify({version:1,roomId:'initial-nest-v1',placements:eligible.map((toyId,i)=>({toyId,x:0,z:i*.4,rotation:0}))});store.setItem(previousKey,raw);
 const restored=readLayout(store,eligible);assert(restored.adjusted);assert(!restored.error);assert.equal(restored.placements.length+restored.unplaced,5);assert(restored.placements.every(p=>placementFits(p,restored.placements)));assert.equal(store.getItem(previousKey),raw);assert.equal(store.getItem(NEST_LAYOUT_KEY),null);
 assert(saveLayout(store,restored.placements,eligible));assert.equal(store.getItem(previousKey),raw);
});
test('orthographic camera contains all room corners at desktop, tablet and phone sizes',()=>{
 for(const [w,h] of [[1200,620],[768,440],[390,410],[320,410]]){
  const camera=new THREE.OrthographicCamera();frameNestCamera(camera,w,h);
  for(const x of [roomBounds.min.x,roomBounds.max.x])for(const y of [roomBounds.min.y,roomBounds.max.y])for(const z of [roomBounds.min.z,roomBounds.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);assert(Math.abs(p.x)<1&&Math.abs(p.y)<1,`${w}x${h} clipped room corner`);}
 }
});
test('screen ray returns the correct floor point at mobile and desktop sizes',()=>{
 for(const [w,h] of [[1200,620],[390,410]]){
  const camera=new THREE.OrthographicCamera();frameNestCamera(camera,w,h);const original=new THREE.Vector3(1.28,0,-.94),p=original.clone().project(camera),rect={left:24,top:150,width:w,height:h};const found=floorPoint(new THREE.Raycaster(),camera,rect,rect.left+(p.x+1)*w/2,rect.top+(1-p.y)*h/2);assert(found.distanceTo(original)<1e-8);
 }
});
test('3D scene keeps source GLBs, pointer cancel, lazy lifetime, and visit/arrange separation',()=>{
 const code=fs.readFileSync(new URL('../src/components/NestScene.tsx',import.meta.url),'utf8');assert(code.includes('loadModel(toy.model_url)'));assert(code.includes("canvas.setPointerCapture(event.pointerId)"));assert(code.includes("pointercancel"));assert(code.includes("pan-y pinch-zoom"));assert(code.includes('THREE.SRGBColorSpace'));assert(code.includes('THREE.NeutralToneMapping'));assert(!code.includes('setAnimationLoop('));
 const collection=fs.readFileSync(new URL('../src/components/CollectionGallery.tsx',import.meta.url),'utf8');assert(collection.includes("active={tab==='nest'&&!selected&&!story}"));
});
