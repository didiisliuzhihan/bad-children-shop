import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

async function handlers(editing){
 const source=read('src/components/NestScene.tsx');
 const down=source.slice(source.indexOf('  const down='),source.indexOf('  const move='));
 const up=source.slice(source.indexOf('  const up='),source.indexOf('  // Touch owns'));
 const result=await transformWithOxc('let gesture:any=null;'+down+up+'\nglobalThis.input={down,up};','input.ts');
 const calls=[],context={roomReady:true,latest:{current:{editing,active:true,placements:[{toyId:'tired_crow',x:0,z:0}],onSelect:id=>calls.push(['select',id])}},
  scene:{updateMatrixWorld(){calls.push(['raycast'])}},raycaster:{intersectObjects:()=>[{object:{userData:{toyId:'tired_crow'}}}]},camera:{},actors:new Map(),
  floorPoint:()=>({sub(){return this}}),THREE:{Vector3:class{}},
  canvas:{getBoundingClientRect:()=>({}),style:{},setPointerCapture:id=>calls.push(['capture',id]),hasPointerCapture:()=>true,releasePointerCapture:id=>calls.push(['release',id])}};
 vm.runInNewContext(result.code,context);return {...context,calls};
}
test('visiting residents never captures a tap, raycasts or opens a card',async()=>{
 const h=await handlers(false);
 for(const pointerType of ['mouse','touch','pen']){
  const e={pointerType,pointerId:1,button:0,isPrimary:true,clientX:50,clientY:50,preventDefault(){h.calls.push(['prevent'])}};
  assert.equal(h.input.down(e),false);h.input.up(e);
 }
 assert.deepEqual(h.calls,[]);
 const scene=read('src/components/NestScene.tsx'),room=read('src/components/NestRoom.tsx');
 assert(!scene.includes('onOpen'));assert(!room.includes('onOpen={openId}'));
 assert(!room.includes('点击玩具查看详情'));assert(scene.includes('<NestDialogueBubble key={bubble.id}'));
});
test('arrangement still selects real residents and releases its own drag stream',async()=>{
 for(const pointerType of ['mouse','touch']){
  const h=await handlers(true),e={pointerType,pointerId:2,button:0,isPrimary:true,clientX:50,clientY:50,preventDefault(){h.calls.push(['prevent'])}};
  assert.equal(h.input.down(e),true);assert(h.calls.some(c=>c[0]==='select'&&c[1]==='tired_crow'));
  h.input.up(e);assert.equal(h.canvas.style.cursor,'grab');
  assert.equal(h.calls.some(c=>c[0]==='capture'),pointerType==='mouse');
  assert.equal(h.calls.some(c=>c[0]==='release'),pointerType==='mouse');
 }
});
