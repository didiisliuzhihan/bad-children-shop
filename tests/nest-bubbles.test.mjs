import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {transformWithOxc} from 'vite';import {createNestMoodSchedule,NEST_MOODS} from '../src/lib/nestMood.mjs';
import {LIFE_PAIRS,LIFE_SOLOS} from '../src/lib/nestLifeRules.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
async function component(name){
 let value=false;const jsx=(type,props)=>({type,props});
 const context={useState:()=>[value,next=>{value=typeof next==='function'?next(value):next}],_jsx:jsx,_jsxs:jsx,_Fragment:'Fragment'};
 const compiled=await transformWithOxc(read('src/components/'+name+'.tsx'),name+'.tsx',{jsx:{runtime:'automatic'}});
 vm.runInNewContext(compiled.code.replace(/^import[^\n]*\n/gm,'').replace(/^export function /gm,'function ')+'\nglobalThis.render='+name+';',context);return context.render;
}
test('all eight existing lines expand on click and stay open across position updates',async()=>{
 for(const story of [...LIFE_PAIRS,...LIFE_SOLOS]){
  const render=await component('NestDialogueBubble'),bubble={id:story.id,line:story.line,x:50,y:40};
  const closed=render({bubble}),button=closed.props.children;assert.equal(button.type,'button');assert.equal(button.props.type,'button');assert.equal(button.props['aria-expanded'],false);
  button.props.onClick();const open=render({bubble:{...bubble,x:51}}).props.children;assert.equal(open.props['aria-expanded'],true);
  const line=open.props.children[2];assert.equal(line.props['aria-hidden'],false);assert.equal(line.props.children.props.children.props.children,story.line);
  open.props.onClick();assert.equal(render({bubble}).props.children.props['aria-expanded'],false);
 }
});
test('bubble position is on non-button anchor, so global active scaling cannot move its hit target',async()=>{
 const render=await component('NestDialogueBubble'),tree=render({bubble:{id:'soup',line:'鸦已经在精神上帮忙了。',x:50,y:40}});
 assert.equal(tree.type,'div');assert.equal(tree.props.className,'nest-life-anchor');assert.equal(tree.props.style.left,'50%');
 const css=read('src/nest-life.css');assert(/\.nest-life-anchor\{[^}]*transform:translate\(-50%,-100%\)/.test(css));assert(css.includes('.nest-life-bubble:active:not(:disabled){transform:none;}'));assert(!css.includes('min-width:185px'));
 assert(read('src/components/NestScene.tsx').includes('<NestDialogueBubble key={bubble.id}'));
});
test('status bubbles are passive hand-drawn state without buttons, text expansion or click handlers',async()=>{
 const render=await component('NestStatusBubble');
 for(const kind of ['sleep','confused']){const tree=render({mood:{x:50,y:40,kind,id:'mood',leaving:false}});assert.equal(tree.type,'div');assert.equal(tree.props['aria-hidden'],'true');assert.equal(tree.props.onClick,undefined);assert(!JSON.stringify(tree).includes('aria-expanded'));}
 assert(/\.nest-status-bubble\{[^}]*pointer-events:none/.test(read('src/nest-life.css')));
});
test('only placed crow sleeps; placed sunflower and popcorn get confused states',()=>{
 assert.deepEqual(NEST_MOODS,{tired_crow:'sleep',kuku_sunflower:'confused',miss_popcorn:'confused'});
 for(const [toyId,kind] of Object.entries(NEST_MOODS)){const schedule=createNestMoodSchedule(()=>0);let state;for(let t=0;t<=8000;t+=100)state=schedule.update(t,[toyId,'jimao']);assert.equal(state.toyId,toyId);assert.equal(state.kind,kind);assert.equal(state.leaving,false);}
 const empty=createNestMoodSchedule(()=>0);for(let t=0;t<=60000;t+=100)assert.equal(empty.update(t,['jimao','stressed_jimao']),null);
});
test('moods are occasional, expire gently, and never compete with a dialogue or arrangement',()=>{
 const schedule=createNestMoodSchedule(()=>0);let state;
 for(let t=0;t<=8000;t+=100)state=schedule.update(t,['tired_crow']);assert(state);const id=state.id;
 for(let t=8100;t<=14000;t+=100)state=schedule.update(t,['tired_crow']);assert.equal(state.id,id);assert(state.leaving);
 for(let t=14100;t<=20000;t+=100)state=schedule.update(t,['tired_crow']);assert.equal(state,null);
 for(let t=20100;t<=44500;t+=100)state=schedule.update(t,['tired_crow']);assert(state);
 assert.equal(schedule.update(44600,['tired_crow'],true),null);assert.equal(schedule.update(44700,[],false),null);
 // Coming back after a hidden interval schedules a fresh visit, not a burst.
 assert.equal(schedule.update(120000,['tired_crow']),null);
 const source=read('src/lib/nestMood.mjs');assert(!source.includes('fetch('));assert(!source.includes('homeLife('));
});
