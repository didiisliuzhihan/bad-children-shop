import test from 'node:test';import assert from 'node:assert/strict';
import {QUEST_KEY,QUEST_WAIT_MS,questStage,remainingQuestMs,readQuest,updateQuest,WipeCoverage} from '../src/lib/questProgress.mjs';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}};
test('explicit saved confirmation starts one ten-minute clock per toy, never on image generation',()=>{
 const s=memory(),t=1000000;assert.equal(readQuest(s,'kuku'),null);assert.equal(questStage(null,t),'unsaved');
 assert(updateQuest(s,'kuku','save',t));assert.equal(questStage(readQuest(s,'kuku'),t+QUEST_WAIT_MS-1),'waiting');
 assert.equal(questStage(readQuest(s,'kuku'),t+QUEST_WAIT_MS),'ready');
 assert(updateQuest(s,'kuku','save',t+12000));assert.equal(readQuest(s,'kuku').savedAt,t);
 assert.equal(readQuest(s,'jimao'),null);assert(updateQuest(s,'jimao','save',t+100));assert.equal(readQuest(s,'kuku').savedAt,t);
});
test('close/reopen and duplicate capsules retain the same toy progress; early unlock is rejected',()=>{
 const s=memory(),t=1000000;assert.equal(updateQuest(s,'kuku','unlock',t),false);updateQuest(s,'kuku','save',t);
 assert.equal(updateQuest(s,'kuku','unlock',t+QUEST_WAIT_MS-1),false);
 assert(updateQuest(s,'kuku','unlock',t+QUEST_WAIT_MS));assert.equal(questStage(readQuest(s,'kuku')),'unlocked');
 updateQuest(s,'kuku','save',t+QUEST_WAIT_MS+100);updateQuest(s,'kuku','unlock',t+QUEST_WAIT_MS+200);
 assert.equal(readQuest(s,'kuku').unlockedAt,t+QUEST_WAIT_MS);
 assert.equal(remainingQuestMs(readQuest(s,'kuku'),t+1),QUEST_WAIT_MS-1);
});
test('storage failures and corrupt data never unlock or report success',()=>{
 const s=memory();s.setItem(QUEST_KEY,'broken');assert.equal(readQuest(s,'kuku'),null);assert.equal(updateQuest(s,'kuku','save'),false);
 assert.equal(updateQuest({getItem:()=>null,setItem:()=>{throw Error('quota')}},'kuku','save'),false);
 s.setItem(QUEST_KEY,JSON.stringify({kuku:{savedAt:1000000,unlockedAt:1000010}}));assert.equal(questStage(readQuest(s,'kuku'),1000020),'waiting');
 assert.equal(updateQuest(s,'__proto__','save'),false);
});
test('wiping tracks unique coverage; stationary touches do not unlock',()=>{
 const w=new WipeCoverage();const first=w.add(.5,.5,.10);for(let i=0;i<100;i++)assert.equal(w.add(.5,.5,.10),first);
 assert(first<.18);for(let x=.15;x<.9;x+=.05)for(let y=.3;y<.8;y+=.12)w.add(x,y,.10);
 assert(w.cells.size/(28*28)>.18);
});
