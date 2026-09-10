import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createMatchaNightLight} from '../src/lib/matchaNightLight.ts';
import {gltfRayMeshes} from './helpers/gltf-ray-meshes.mjs';
import {normalizeResident} from '../src/lib/nestSceneGeometry.ts';
test('night light changes only a private flame-core material, follows actor and does not capture taps',()=>{
 const actor=new THREE.Group();actor.userData.toyId='matcha_clown';const original=new THREE.MeshStandardMaterial({color:'#ffaa22'});original.name='06 | golden flame core';
 const core=new THREE.Mesh(new THREE.SphereGeometry(.3),original);core.position.set(-.5,2,0);actor.add(core);
 const light=createMatchaNightLight(actor);assert(light);assert.notEqual(core.material,original);assert.equal(original.emissiveIntensity,1);assert.equal(original.emissive.getHex(),0);
 const day=core.material.emissiveIntensity;light.setMode('night');assert(core.material.emissiveIntensity>day);assert(light.light.intensity<=2.1);assert.equal(light.light.castShadow,false);
 const hits=[];light.halo.raycast(new THREE.Raycaster(),hits);assert.equal(hits.length,0);assert.equal(light.halo.userData.nestOverhead,true);
 assert.equal(light.light.parent.parent,actor);const pos=light.light.getWorldPosition(new THREE.Vector3());actor.position.x=3;assert.equal(light.light.getWorldPosition(new THREE.Vector3()).x,pos.x+3);
 let disposed=0;core.material.addEventListener('dispose',()=>disposed++);light.dispose();light.dispose();assert.equal(disposed,1);assert.equal(core.material,original);assert.equal(actor.children.length,1);
 const other=new THREE.Group();other.userData.toyId='stock_gourd';assert.equal(createMatchaNightLight(other),null);
});
test('actual compressed matcha export exposes the fire core and the light stays above its body',async()=>{
 const source=await gltfRayMeshes(new URL('../assets/delivery/toy_matcha_clown.glb',import.meta.url));
 // Geometry helper uses plain materials for ray tests; retain exported material names.
 const actor=normalizeResident(source,'matcha_clown');let count=0;actor.traverse(o=>{if(o.isMesh&&o.name.replaceAll('_',' ').includes('golden flame core')){const m=new THREE.MeshStandardMaterial();m.name='golden flame core';o.material=m;count++;}});
 assert(count>0);const light=createMatchaNightLight(actor);assert(light);assert(light.light.getWorldPosition(new THREE.Vector3()).y>2);light.dispose();
});
