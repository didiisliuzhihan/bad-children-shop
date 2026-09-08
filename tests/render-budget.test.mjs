import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createNestShadowSchedule} from '../src/lib/nestRenderBudget.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('idle shadow rendering is bounded while explicit layout/lighting changes update immediately',()=>{
 const budget=createNestShadowSchedule();let count=0;for(let t=0;t<1000;t+=1000/30)if(budget.update(t))count++;
 assert(count<=9,'Keep full maps but not three shadow renders every single frame');assert.equal(budget.update(1001),false);budget.invalidate();assert.equal(budget.update(1002),true);assert.equal(budget.update(1003),false);
});
test('hidden home pauses rather than tearing down/recreating the scene and cannot reward hidden time',()=>{
 const room=read('src/components/NestRoom.tsx'),scene=read('src/components/NestScene.tsx');assert(room.includes('sceneVisited?<NestScene active={active}'));assert(room.includes('lifeReady={active&&!dirty'));
 assert(scene.includes("state.active===false){cancelGesture();cancelAnimationFrame(raf);raf=0;return;}"));assert(scene.includes('latest.current.active!==false'));assert(scene.includes('renderer.shadowMap.autoUpdate=false'));
 assert(read('src/lib/nestCapture.ts').includes('renderer.shadowMap.needsUpdate=true'));
});
test('shared reveal assets are not destroyed on close, and static toy viewers do not render continuously',()=>{
 const reveal=read('src/components/Scene.tsx'),viewer=read('src/components/ToyViewer.tsx');assert(!reveal.includes('releaseModel'));assert(reveal.includes('class RevealBoundary'));
 assert(viewer.includes('if(controls.autoRotate||changed)invalidate()'));assert(viewer.includes("controls.addEventListener('change',invalidate)"));assert(!viewer.includes('setAnimationLoop'));assert(viewer.includes('cancelAnimationFrame(raf)'));
});

