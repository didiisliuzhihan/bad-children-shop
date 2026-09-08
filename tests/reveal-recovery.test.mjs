import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {transformWithOxc} from 'vite';
import {canTransition,chooseToy,dragProgress,shouldCommitDrag} from '../src/flow.mjs';
const source=fs.readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
async function harness(type='toy'){
 const slots=[],timers=new Map(),sounds=[];let cursor=0,queue=[],dirty=false,tree,now=0,seq=0,kept=0,rejected=0;
 const toy={id:'crow',model_url:'crow.glb',name_zh:'鸦',name_en:'Dua',icon_url:'crow.png',tagline_en:'Rest'};
 const draw={id:'draw-1',type,toyId:type==='toy'?toy.id:undefined,...(type==='story'?{story:{id:'story-1',source:'nest',text:'小事',createdAt:'2026-09-08'}}:{})};
 const preview={owner:'owner',items:[],mode:'cloud',onDraw:async()=>draw,onKeep:async result=>{assert.equal(result.id,draw.id);kept++},onReject:async result=>{assert.equal(result.id,draw.id);rejected++}};
 const context={canTransition,chooseToy,dragProgress,shouldCommitDrag,asset:s=>s,fallbackToys:[toy],loadModel:async()=>({scene:{}}),isAudioReady:()=>true,observeAudioReady:()=>()=>{},installAudioStart:()=>()=>{},sound:s=>sounds.push(s),startBackground:()=>{},muteAudio:()=>{},
  matchMedia:()=>({matches:false}),document:{addEventListener(){},removeEventListener(){}},window:{},
  useState(initial){const i=cursor++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};return [slots[i].value,value=>{const next=typeof value==='function'?value(slots[i].value):value;if(next!==slots[i].value){slots[i].value=next;dirty=true}}]},
  useRef(initial){const i=cursor++;slots[i]??={current:initial};return slots[i]},
  useCallback(fn,deps){const i=cursor++;if(!slots[i]||deps.some((v,j)=>!Object.is(v,slots[i].deps[j])))slots[i]={value:fn,deps};return slots[i].value},
  useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j])))queue.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()}})},
  setTimeout(fn,ms){const id=++seq;timers.set(id,{fn,at:now+ms});return id},clearTimeout:id=>timers.delete(id),
  requestAnimationFrame:fn=>fn(),crypto:{randomUUID:()=>String(++seq)},
  _jsx:(type,props)=>({type,props}),_jsxs:(type,props)=>({type,props}),_Fragment:'Fragment',
 };
 for(const name of ['Postcard','MachineScene','RevealScene','BrandMark','Icon','Collection','Modal','Tagline'])context[name]=name;
 const code=(await transformWithOxc(source,'App.tsx',{jsx:{runtime:'automatic'}})).code.replace(/^import[^\n]*\n/gm,'').replace('export default function App','function App').replace(/^export \{[^}]*\};?\s*$/gm,'');vm.runInNewContext(code+'\nglobalThis.App=App;',context);
 const render=()=>{let iterations=0;do{dirty=false;cursor=0;queue=[];tree=context.App({preview});queue.forEach(fn=>fn());if(++iterations>20)throw Error('Render loop');}while(dirty);return tree};
 const flush=async()=>{for(let i=0;i<12;i++){await Promise.resolve();if(dirty)render()}};
 const advance=async ms=>{const end=now+ms;while(true){const entry=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)break;const [id,t]=entry;now=t.at;timers.delete(id);t.fn();render();await flush();}now=end;await flush()};
 const walk=(n,p)=>!n||typeof n!=='object'?[]:[...(p(n)?[n]:[]),...[n.props?.children].flat(Infinity).flatMap(c=>walk(c,p))];
 const find=p=>walk(tree,p)[0],phase=()=>tree.props['data-phase'];
 render();await flush();
 return {find,phase,render,flush,advance,sounds,draw,kept:()=>kept,rejected:()=>rejected,async spin(){find(n=>n.props?.['aria-label']==='轻点或向右滑动旋钮，或按回车抽取扭蛋').props.onClick({detail:0});await flush();await advance(5500)},open(){find(n=>n.type==='button'&&n.props.children?.[0]==='打开扭蛋').props.onClick();render()},unmount(){slots.forEach(s=>s?.cleanup?.())}};
}
test('a never-resolving model cannot trap a drawn capsule; fallback reaches decisions and can return it',async()=>{
 const h=await harness();try{await h.spin();assert.equal(h.phase(),'SEALED');h.open();assert.equal(h.phase(),'REVEALED');await h.advance(6500);assert.equal(h.phase(),'DECISION');assert(h.find(n=>n.props?.className==='model-fallback'));const reject=h.find(n=>n.type==='button'&&n.props.className==='pill-button cast-button');await reject.props.onClick();await h.flush();await h.advance(1000);assert.equal(h.phase(),'IDLE');assert.equal(h.rejected(),1);assert.equal(h.kept(),0);}finally{h.unmount()}
});
test('model load completion before opening never advances the sealed phase; rapid double-open is idempotent',async()=>{
 const h=await harness();try{await h.spin();h.find(n=>n.type==='RevealScene').props.onReady();h.render();await h.advance(5000);assert.equal(h.phase(),'SEALED');const open=h.find(n=>n.type==='button'&&n.props.children?.[0]==='打开扭蛋').props.onClick;open();open();h.render();assert.equal(h.sounds.filter(s=>s==='open').length,1);await h.advance(1900);assert.equal(h.phase(),'DECISION');}finally{h.unmount()}
});
test('story capsules reach decisions without any model callback and never request a hidden toy',async()=>{
 const h=await harness('story');try{await h.spin();assert.equal(h.find(n=>n.type==='RevealScene').props.loadToy,false);h.open();await h.advance(800);assert.equal(h.phase(),'DECISION');assert(h.find(n=>n.type==='Postcard'));}finally{h.unmount()}
});
test('a WebGL/model error reaches a recoverable image decision without waiting indefinitely',async()=>{
 const h=await harness();try{await h.spin();h.open();h.find(n=>n.type==='RevealScene').props.onError();h.render();await h.advance(0);assert.equal(h.phase(),'DECISION');assert(h.find(n=>n.props?.className==='model-fallback'));}finally{h.unmount()}
});
