import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {gltfRayMeshes} from './helpers/gltf-ray-meshes.mjs';
import {frameNestCamera,normalizeResident} from '../src/lib/nestSceneGeometry.ts';
import {roomTapTarget} from '../src/lib/nestTapCatalog.mjs';
const file=name=>new URL('../assets/delivery/'+name,import.meta.url);
test('actual compressed room geometry exposes stove and arched window at mobile and desktop camera sizes',async()=>{
 const room=await gltfRayMeshes(file('room_furnished_nest.glb')),camera=new THREE.OrthographicCamera(),ray=new THREE.Raycaster();
 const targets=[['Luminous_arched_window_pane','window'],['Stove_enamel_body','stove'],['Golden_soup_0','stove']];
 for(const [width,height] of [[390,560],[1440,980]]){
  frameNestCamera(camera,width,height);
  for(const [name,expected] of targets){
   const mesh=room.getObjectByName(name);assert(mesh,name+' exists');const point=new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()).project(camera);
   ray.setFromCamera(new THREE.Vector2(point.x,point.y),camera);const hit=ray.intersectObject(room,true)[0];assert(hit);assert.equal(roomTapTarget(hit.object.name),expected,'frontmost mesh: '+hit.object.name);
  }
  ray.setFromCamera(new THREE.Vector2(-.99,.99),camera);assert.equal(ray.intersectObject(room,true).length,0,'blue canvas corner has no target');
 }
});
test('each actual toy keeps its sound identity through normalization, and visible room meshes occlude toys',async()=>{
 const room=await gltfRayMeshes(file('room_furnished_nest.glb')),camera=new THREE.OrthographicCamera(),ray=new THREE.Raycaster();frameNestCamera(camera,390,560);
 for(const id of ['jimao','kuku_sunflower','stressed_jimao','miss_popcorn','tired_crow']){
  const source=await gltfRayMeshes(file(id==='miss_popcorn'?'toy_popcorn_maid.glb':'toy_'+id+'.glb')),toy=normalizeResident(source,id);toy.updateMatrixWorld(true);
  const point=new THREE.Box3().setFromObject(toy).getCenter(new THREE.Vector3()).project(camera);ray.setFromCamera(new THREE.Vector2(point.x,point.y),camera);
  const hit=ray.intersectObjects([room,toy],true)[0];assert.equal(hit.object.userData.toyId,id,'visible toy '+id+' is clickable');
  toy.position.set(0,0,-9);toy.updateMatrixWorld(true);const hidden=new THREE.Box3().setFromObject(toy).getCenter(new THREE.Vector3()).project(camera);ray.setFromCamera(new THREE.Vector2(hidden.x,hidden.y),camera);
  assert.equal(ray.intersectObjects([room,toy],true)[0].object.userData.toyId,undefined,'wall blocks clicks through '+id);
 }
});
