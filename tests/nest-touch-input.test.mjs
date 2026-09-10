import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {installNestTouchInput} from '../src/lib/nestTouchInput.ts';

const point=(x=100,y=100,id=0)=>({identifier:id,clientX:x,clientY:y});
function harness(){
 const listeners=new Map(),calls=[];let editing=true;
 const canvas={addEventListener(name,fn,options){listeners.set(name,{fn,options})},removeEventListener(name,fn){assert.equal(listeners.get(name).fn,fn);listeners.delete(name)}};
 const input=installNestTouchInput(canvas,{
  start(p){calls.push(['hit',p.clientX,p.clientY]);return editing&&p.clientX>=80&&p.clientX<=120&&p.clientY>=80&&p.clientY<=140},
  move(p){calls.push(['move',p.clientX,p.clientY])},end(){calls.push(['end'])},cancel(){calls.push(['cancel'])}
 });
 const emit=(type,changed=[point()],touches=type==='touchend'?[]:changed,cancelable=true)=>{
  const event={changedTouches:changed,touches,cancelable,defaultPrevented:false,preventDefault(){assert(cancelable);this.defaultPrevented=true}};
  listeners.get(type)?.fn(event);return event;
 };
 return {input,emit,calls,listeners,setEditing:v=>{editing=v}};
}
test('empty room, wall, floor and both canvas edges allow native scroll throughout the swipe',()=>{
 for(const start of [point(0,100),point(390,100),point(100,0),point(100,300),point(160,120)]){
  const h=harness();assert.equal(h.emit('touchstart',[start]).defaultPrevented,false);
  // Crossing a resident halfway down a scroll must not claim the gesture.
  assert.equal(h.emit('touchmove',[point()]).defaultPrevented,false);
  assert.equal(h.emit('touchend',[point()]).defaultPrevented,false);
  assert.deepEqual(h.calls,[['hit',start.clientX,start.clientY]]);h.input.dispose();
 }
});
test('only a resident hit claims drag: vertical/horizontal motion and release outside canvas survive',()=>{
 const h=harness();assert(h.emit('touchstart').defaultPrevented);
 for(const p of [point(100,20),point(250,20),point(500,600)])assert(h.emit('touchmove',[p]).defaultPrevented);
 assert(h.emit('touchend',[point(500,600)]).defaultPrevented);
 assert.deepEqual(h.calls,[['hit',100,100],['move',100,20],['move',250,20],['move',500,600],['end']]);
 assert.equal(h.emit('touchmove').defaultPrevented,false);h.input.dispose();
});
test('visiting allows swipes over residents too; no hidden touch drag state is created',()=>{
 const h=harness();h.setEditing(false);
 assert.equal(h.emit('touchstart').defaultPrevented,false);assert.equal(h.emit('touchmove').defaultPrevented,false);
 assert.equal(h.emit('touchend').defaultPrevented,false);assert.deepEqual(h.calls,[['hit',100,100]]);h.input.dispose();
});
test('multi-touch never starts a drag; adding a finger rolls back rather than leaving a stuck grab',()=>{
 const h=harness(),two=[point(),point(200,200,2)];
 assert.equal(h.emit('touchstart',two).defaultPrevented,false);assert.equal(h.calls.length,0);
 h.emit('touchstart');h.emit('touchmove',[point(110,120)]);
 assert.equal(h.emit('touchstart',[two[1]],two).defaultPrevented,false);
 assert.equal(h.emit('touchmove',two).defaultPrevented,false);
 assert.equal(h.calls.filter(c=>c[0]==='cancel').length,1);
 assert(h.emit('touchstart').defaultPrevented);h.emit('touchend');h.input.dispose();
});
test('browser cancel, uncancelable moves and external resets release gesture ownership',()=>{
 for(const reason of ['touchcancel','uncancelable','reset']){
  const h=harness();h.emit('touchstart');
  if(reason==='touchcancel')h.emit('touchcancel');
  else if(reason==='uncancelable')h.emit('touchmove',[point()],[point()],false);
  else h.input.reset();
  assert.equal(h.emit('touchmove').defaultPrevented,false);assert.equal(h.emit('touchend').defaultPrevented,false);
  assert.equal(h.calls.filter(c=>c[0]==='cancel').length,reason==='reset'?0:1);h.input.dispose();
 }
 const h=harness();assert.equal(h.emit('touchstart',[point()],[point()],false).defaultPrevented,false);assert.equal(h.calls.length,0);h.input.dispose();
});
test('touch identifiers cannot hijack/end another drag; disposal removes every scoped listener',()=>{
 const h=harness();h.emit('touchstart');
 assert.equal(h.emit('touchmove',[point(100,100,7)]).defaultPrevented,false);
 assert.equal(h.emit('touchend',[point(100,100,7)]).defaultPrevented,false);
 assert(h.emit('touchmove').defaultPrevented);
 for(const event of ['touchstart','touchmove','touchend'])assert.equal(h.listeners.get(event).options.passive,false);
 h.input.dispose();assert.equal(h.listeners.size,0);assert.equal(h.calls.at(-1)[0],'cancel');
});
test('production scene keeps native scrolling, exact 3D hit testing and independent mouse/visit input',()=>{
 const code=fs.readFileSync(new URL('../src/components/NestScene.tsx',import.meta.url),'utf8');
 assert(code.includes("canvas.style.touchAction='pan-y pinch-zoom'"));assert(!/touchAction\s*=.*none/.test(code));
 assert(code.includes('raycaster.intersectObjects([...actors.values()],true)'));
 assert(code.includes("if(!id){if(latest.current.editing&&event.pointerType!=='touch')"));
 assert(code.includes('start:point=>latest.current.editing&&down(touchPoint(point))'));
 assert(code.includes("if(event.pointerType!=='touch')canvas.setPointerCapture(event.pointerId)"));
 assert(code.includes('if(!nativeTouch(event))down(event)'));assert(code.includes('touchInput?.reset()'));
 assert(code.includes('if(document.hidden){cancelGesture();taps.cancel();}'));
 const room=fs.readFileSync(new URL('../src/components/NestRoom.tsx',import.meta.url),'utf8');assert(room.includes('按住玩具拖动 · 空白处上下滑动'));assert(room.includes('左转'));assert(room.includes('右转'));
});
