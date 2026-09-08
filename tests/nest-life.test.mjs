import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {eligibleLife,eligibleMoments,idlePose,eventEnvelope,LIFE_PAIRS} from '../src/lib/nestLifeRules.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('all three vignettes require both placed residents, never collection ownership',()=>{
 for(const event of LIFE_PAIRS){const placed=event.actors.map((toyId,i)=>({toyId,x:i*2,z:0}));assert(eligibleLife(placed).some(e=>e.id===event.id));assert(!eligibleLife(placed.slice(0,1)).some(e=>e.id===event.id));assert(!eligibleLife(placed.map((p,i)=>({...p,x:i*5}))).some(e=>e.id===event.id));}
 assert.equal(eligibleLife([]).length,0);assert.equal(eligibleMoments([{toyId:'tired_crow',x:0,z:0}])[0].actors.length,1);
});
test('five grounded idle profiles differ; reduced motion restores a still pose',()=>{
 const ids=['jimao','kuku_sunflower','stressed_jimao','miss_popcorn','tired_crow'];assert.equal(new Set(ids.map(id=>JSON.stringify(idlePose(id,10)))).size,5);
 for(const id of ids){for(let t=0;t<100;t+=.25){const pose=idlePose(id,t);assert(pose.y>=0&&pose.y<=.03);assert(Math.abs(pose.roll)<.03);assert(Math.abs(pose.turn)<.03);}assert.deepEqual(idlePose(id,10,true),{y:0,roll:0,turn:0});}
 assert.equal(eventEnvelope(0),0);assert.equal(eventEnvelope(6),1);assert.equal(eventEnvelope(12),0);
});
test('no pending reward text is bundled in the performance catalog or UI',()=>{
 const sql=read('supabase/nest-life-preview.sql');assert(sql.includes('精神上帮忙的报酬'));assert(!read('src/lib/nestLifeRules.mjs').includes('精神上帮忙的报酬'));
 const edge=read('supabase/functions/bc-account-preview/index.ts');assert(edge.includes(".not('collected_at','is',null)"));assert(edge.includes('p_user:auth.uid'));assert(!edge.includes('p_user:data.'));
 assert(sql.includes('unique(user_id,kind)'));assert(sql.includes('where user_id=p_user for update'));assert(sql.includes('from public,anon,authenticated'));
});
test('scene caps frame rate, stops hidden, preserves placement and attaches a clickable bubble',()=>{
 const scene=read('src/components/NestScene.tsx');assert(scene.includes('now-lastFrame>=33'));assert(scene.includes("document.visibilityState!=='hidden'"));assert(scene.includes('living.dispose()'));assert(read('src/components/NestDialogueBubble.tsx').includes('aria-expanded={expanded}'));assert(scene.includes('if(!moment)sync()'));
 const lifecycle=read('src/lib/useNestLife.ts');assert(lifecycle.includes("call('leave')"));assert(lifecycle.includes('clearInterval(heartbeat)'));assert(!lifecycle.includes('setNestAmbience'),'Room, not story eligibility, owns ambience');
});
test('preview machine never adopts via production anonymous sync; private stories remain stamp-free',()=>{
 const app=read('src/App.tsx');assert(app.includes('if(preview)return;'));assert(app.includes('if(!preview){'));assert(app.includes('await preview.onKeep(drawResult)'));assert(app.includes('<Postcard source="nest"'));
 const preview=read('review/community.tsx');assert(preview.includes("account.homeLife!('draw'"));assert(!preview.includes("location.href="));
 assert(!preview.includes('<App key='),'Signing in must not unmount the recovery-key dialog');assert(app.includes("<Collection key={preview?.owner||'default'}"),'Account switching must still discard the former room and open postcard');
});
