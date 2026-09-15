import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import * as THREE from 'three';import {transformWithOxc} from 'vite';
const source=fs.readFileSync(new URL('../src/lib/capsuleSeam.ts',import.meta.url),'utf8');
const transformed=(await transformWithOxc(source,'capsuleSeam.ts')).code.replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'').replace(/^\{[^}]*\};?\s*$/gm,'');
const ctx={THREE};vm.runInNewContext(transformed+'\nglobalThis.api={seamThreshold,moveSeamGesture,canOpenSeam,projectCapsuleSeam}',ctx);
const {seamThreshold,moveSeamGesture,canOpenSeam,projectCapsuleSeam}=ctx.api;
const start=()=>({id:1,x:100,y:100,axis:'pending',progress:0});
test('seam threshold scales with capsule, stays reachable on small touch screens',()=>{
 assert.equal(seamThreshold(100),46);assert.equal(seamThreshold(200),60);assert.equal(seamThreshold(900),100);
});
test('either horizontal direction opens, taps and short swipes do not',()=>{
 for(const dir of [-1,1]){assert(canOpenSeam(moveSeamGesture(start(),100+dir*65,104,200)));assert(!canOpenSeam(moveSeamGesture(start(),100+dir*35,103,200)))}
 assert(!canOpenSeam(moveSeamGesture(start(),101,101,200)));assert(!canOpenSeam(null));
});
test('vertical or ambiguous diagonal motion does not open and vertical intent stays locked',()=>{
 for(const xy of [[103,220],[220,220],[103,-20]])assert(!canOpenSeam(moveSeamGesture(start(),...xy,200)));
 const vertical=moveSeamGesture(start(),104,120,200);assert.equal(vertical.axis,'vertical');assert(!canOpenSeam(moveSeamGesture(vertical,250,130,200)));
});
test('reversing a drag back under threshold cancels, rather than remembering a past peak',()=>{
 const full=moveSeamGesture(start(),180,100,200);assert(canOpenSeam(full));assert(!canOpenSeam(moveSeamGesture(full,110,100,200)));
});
test('projected seam is curved, centered on the real shell, and resizes with the camera',()=>{
 for(const [width,height] of [[276,320],[346,397],[600,500]]){
  const camera=new THREE.PerspectiveCamera(32,width/height,.1,100);camera.position.set(.1,1.1,5.7);camera.lookAt(0,.45,0);camera.updateMatrixWorld();
  const layout=projectCapsuleSeam(camera,width,height),points=[...layout.path.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)].map(m=>[+m[1],+m[2]]);
  assert.equal(points.length,49);assert(layout.span>100&&layout.span<width);assert(points[24][1]>points[0][1]+5);assert(points.every(p=>p[0]>0&&p[0]<width&&p[1]>0&&p[1]<height));
 }
});
test('hit target stays confined to seam, glow and SVG surroundings never intercept input',()=>{
 const css=fs.readFileSync(new URL('../src/capsule-seam.css',import.meta.url),'utf8'),component=fs.readFileSync(new URL('../src/components/CapsuleSeam.tsx',import.meta.url),'utf8');
 assert.match(css,/\.capsule-seam\{[^}]*pointer-events:none/);assert.match(css,/\.seam-hit\{[^}]*stroke-width:44;pointer-events:stroke;touch-action:pan-y pinch-zoom/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(component,/onPointerCancel=\{event=>end\(event,true\)\}/);assert.match(component,/event.detail===0/);
});
test('stronger glow has layered local spill and disables both pulses for reduced motion',()=>{
 const css=fs.readFileSync(new URL('../src/capsule-seam.css',import.meta.url),'utf8'),component=fs.readFileSync(new URL('../src/components/CapsuleSeam.tsx',import.meta.url),'utf8');
 for(const layer of ['seam-aura','seam-halo','seam-bloom','seam-core'])assert(component.includes(`className="${layer}"`));
 assert.match(css,/\.seam-aura\{[^}]*stroke-width:22;filter:blur\(9px\)/);
 const reduced=css.slice(css.indexOf('@media(prefers-reduced-motion:reduce)'));
 assert.match(reduced,/\.seam-light\{animation:none/);assert.match(reduced,/\.seam-aura\{animation:none/);
});
test('directional guide shares the projected curve, moves at paced speed, and never owns gestures',()=>{
 const css=fs.readFileSync(new URL('../src/capsule-seam.css',import.meta.url),'utf8'),component=fs.readFileSync(new URL('../src/components/CapsuleSeam.tsx',import.meta.url),'utf8');
 assert.match(component,/<animateMotion path=\{layout.path\} dur="2.8s" repeatCount="indefinite" calcMode="paced"/);
 assert.match(component,/<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.88;1"/);
 assert.match(component,/<g className="seam-guide" aria-hidden="true">/);assert.match(css,/\.seam-guide\{pointer-events:none/);
 assert.match(css,/\.capsule-seam.is-dragging \.seam-guide\{opacity:0\}/);
 assert.match(css.slice(css.indexOf('@media(prefers-reduced-motion:reduce)')),/\.seam-guide\{display:none/);
});
