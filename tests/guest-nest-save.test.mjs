import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {transformWithOxc} from 'vite';
import {readLayout,saveLayout,NEST_ROOM_ID,NEST_LAYOUT_KEY} from '../src/lib/nestPlacement.mjs';
const toy={id:'tired_crow',name_zh:'我没招了鸦'},placement={toyId:toy.id,x:0,z:0,rotation:0};
const compiled=(await transformWithOxc(fs.readFileSync(new URL('../src/components/NestRoom.tsx',import.meta.url),'utf8'),'NestRoom.tsx',{jsx:{runtime:'automatic'}})).code.replace(/^import[^\n]*\n/gm,'').replace(/^export function /gm,'function ');
function room({fail=false,account=null}={}){
 const map=new Map([[NEST_LAYOUT_KEY,JSON.stringify({version:1,roomId:NEST_ROOM_ID,placements:[placement]})]]),slots=[];let cursor=0,effects=[];
 const context={NEST_ROOM_ID,useAccount:()=>account,homeResidents:()=>[{toy,item:{id:'card'},count:1}],readLayout,saveLayout,
  localStorage:{getItem:k=>map.get(k)||null,setItem(k,v){if(fail)throw Error('QuotaExceededError');map.set(k,v)}},
  location:{hostname:'didiisliuzhihan.github.io'},document:{hidden:false,querySelector:()=>null,addEventListener(){},removeEventListener(){}},
  setNestAmbience(){},observeNestAudioStatus:()=>()=>{},unlockAudio:async()=>true,Icon:()=>null,NestScene:'NestScene',NestPhotoDialog:()=>null,
  _jsx:(type,props)=>({type,props}),_jsxs:(type,props)=>({type,props}),_Fragment:'Fragment',useMemo:f=>f(),useCallback:f=>f,
  useState(initial){const i=cursor++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};return [slots[i].value,v=>{slots[i].value=typeof v==='function'?v(slots[i].value):v}]},
  useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>v!==old.deps[j]))effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()}})},
 };
 vm.runInNewContext(compiled+'\nglobalThis.Room=NestRoom;',context);
 const render=()=>{cursor=0;effects=[];const tree=context.Room({items:[],toys:[],active:true});effects.forEach(f=>f());return tree;};
 const find=(node,p)=>{if(!node||typeof node!=='object')return null;if(p(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,p);if(found)return found}return null;};
 const button=(tree,text)=>find(tree,n=>n.type==='button'&&n.props.children===text);
 const tree=render();find(tree,n=>!!n.props?.onEligibility).props.onEligibility(toy.id,true);render();
 return {render,find,button,map,close:()=>slots.forEach(s=>s?.cleanup?.())};
}
test('production guest saves a nonempty room locally, exits editing and restores exact placement',()=>{
 const h=room();try{
  let tree=h.render();h.button(tree,'布置小窝').props.onClick();tree=h.render();assert(h.find(tree,n=>n.type==='NestScene').props.editing);
  h.button(tree,'保存布置').props.onClick();tree=h.render();assert.equal(h.find(tree,n=>n.type==='NestScene').props.editing,false);
  assert(h.find(tree,n=>n.props?.children==='布置已保存在当前浏览器。'));
  assert.deepEqual(readLayout({getItem:k=>h.map.get(k)},[toy.id]).placements,[placement]);
  assert(h.find(tree,n=>typeof n.props?.children==='string'&&n.props.children.includes('不跨设备同步')));
 }finally{h.close()}
});
test('guest storage failure leaves edits and prior saved record intact with an actionable message',()=>{
 const h=room({fail:true});try{const before=h.map.get(NEST_LAYOUT_KEY);h.button(h.render(),'布置小窝').props.onClick();h.button(h.render(),'保存布置').props.onClick();const tree=h.render();assert(h.find(tree,n=>n.type==='NestScene').props.editing);assert.equal(h.map.get(NEST_LAYOUT_KEY),before);assert(h.find(tree,n=>typeof n.props?.children==='string'&&n.props.children.includes('浏览器未能保存布置')));assert(!tree.props.inert);}finally{h.close()}
});
test('signed-in room still uses account save, never writes its placement into guest storage',async()=>{
 let saves=0;const account={profile:{user_id:'account'},documents:{nest:{revision:2,value:{version:1,roomId:NEST_ROOM_ID,placements:[placement]}}},async saveDocument(key,value,revision){saves++;assert.equal(key,'nest');assert.equal(revision,2);assert.equal(value.placements.length,1)}};
 const h=room({account,fail:true});try{const before=h.map.get(NEST_LAYOUT_KEY);h.button(h.render(),'布置小窝').props.onClick();h.button(h.render(),'保存布置').props.onClick();await new Promise(setImmediate);assert.equal(saves,1);assert.equal(h.map.get(NEST_LAYOUT_KEY),before);assert(h.find(h.render(),n=>n.props?.children==='小窝已保存到你的账户。'));}finally{h.close()}
});
