import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {cloneNestRoom,createNestLighting,nestLightPresets} from '../src/lib/nestLighting.ts';

test('day and night have independent ambient, window and practical light ratios',()=>{
 const scene=new THREE.Scene(),rig=createNestLighting(scene),windowSun=rig.lights.windowSun;
 assert.deepEqual(windowSun.position.toArray(),[2.48,17,-10.83]);assert.deepEqual(windowSun.target.position.toArray(),[1.1,0,-.2]);assert(windowSun.castShadow);
 assert(rig.lights.lampSpot.castShadow);assert.equal(rig.lights.lampSpot.shadow.mapSize.x,512);
 const resident=new THREE.Group();resident.position.set(.4,0,-.8);resident.rotation.y=.32;scene.add(resident);
 const transform=resident.matrix.clone(),position=resident.position.clone(),rotation=resident.rotation.clone();
 rig.setMode('night');assert.equal(scene.environmentIntensity,nestLightPresets.night.environment);assert(rig.lights.lampGlow.intensity>nestLightPresets.day.lamp);assert(windowSun.intensity<nestLightPresets.day.sun);assert(windowSun.color.b>windowSun.color.r);
 rig.setMode('day');assert.equal(scene.environmentIntensity,nestLightPresets.day.environment);assert.equal(rig.lights.windowSun,windowSun);assert(windowSun.color.r>windowSun.color.b);
 assert(resident.position.equals(position));assert(resident.rotation.equals(rotation));assert(resident.matrix.equals(transform));
 rig.dispose();assert.deepEqual(scene.children,[resident]);
});

test('room emissive changes use owned material copies and keep pane non-shadowing',()=>{
 const source=new THREE.Group(),material=new THREE.MeshStandardMaterial({color:'#ffe4a0',emissive:'#ffe4a0',emissiveIntensity:.85});material.name='Window_warm_sky';
 const texture=new THREE.Texture();material.map=texture;
 const geometry=new THREE.PlaneGeometry(1,2),pane=new THREE.Mesh(geometry,material);pane.userData.noShadow=true;source.add(pane,new THREE.Mesh(geometry,material));
 const before=material.color.clone(),{model,materials}=cloneNestRoom(source);assert.equal(materials.length,1);assert.notEqual(materials[0],material);assert.equal(materials[0].map,texture);assert.equal(model.children[0].geometry,geometry);
 assert.equal(model.children[0].castShadow,false);assert.equal(model.children[1].castShadow,true);
 const rig=createNestLighting(new THREE.Scene());rig.setMode('night');rig.bindMaterials(materials);assert.equal(materials[0].emissiveIntensity,nestLightPresets.night.window);assert(materials[0].color.b>materials[0].color.r);
 assert(material.color.equals(before));assert.equal(material.emissiveIntensity,.85);
 rig.setMode('day');assert.equal(materials[0].emissiveIntensity,.85);assert(materials[0].color.equals(before));rig.dispose();materials.forEach(m=>m.dispose());geometry.dispose();material.dispose();texture.dispose();
});

test('GLB removes only requested pillow and stair rail; lamp and window can visibly emit',()=>{
 const bytes=fs.readFileSync(new URL('../assets/delivery/room_furnished_nest.glb',import.meta.url)),data=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
 assert(!data.nodes.some(n=>n.name?.startsWith('Yellow tilted pillow')||n.name?.startsWith('Stair baluster')||n.name?.startsWith('Stair sloping handrail')));
 for(const name of ['Landing handrail','Lilac tilted pillow','Flower pillow centre'])assert(data.nodes.some(n=>n.name===name));
 assert(data.nodes.find(n=>n.name==='Warm tapered lamp shade').extras.hollow_shade);
 assert.equal(data.nodes.find(n=>n.name==='Luminous arched window pane').extras.noShadow,true);
 for(const name of ['Window warm sky','Lamp diffuser glow','Warm lamp shade']){
  const material=data.materials.find(m=>m.name===name);assert(material);assert(material.emissiveFactor.some(c=>c>0));
 }
});

test('mode control is labeled, updates in place and stays separate from saving a layout',()=>{
 const room=fs.readFileSync(new URL('../src/components/NestRoom.tsx',import.meta.url),'utf8'),scene=fs.readFileSync(new URL('../src/components/NestScene.tsx',import.meta.url),'utf8');
 assert(room.includes('aria-label="小窝昼夜"'));for(const mode of ['day','night'])assert(room.includes(`aria-pressed={timeOfDay==='${mode}'}`));
 assert(room.includes('timeOfDay={timeOfDay}'));assert(room.includes('data-nest-active={active}'));assert(!room.includes('key={timeOfDay}'));
 assert(scene.includes('},[retry])'));assert(scene.includes('props.selected,props.timeOfDay,props.active]'));assert(scene.includes('lighting.setMode(state.timeOfDay)'));
 assert(!fs.readFileSync(new URL('../src/lib/nestLighting.ts',import.meta.url),'utf8').includes('localStorage'));
});
