import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {initialPlayState,snapshotOf,stepPlay,savePlayDocument,attachPlayPhoto,PLAY_OWNER,PLAY_DB} from '../review/local-play-store.ts';
import {validateLayout} from '../src/lib/nestPlacement.mjs';
test('local playground is isolated, with five sample types and valid preplaced neighbours',()=>{
 const state=initialPlayState();assert.equal(state.snapshot.profile.user_id,PLAY_OWNER);assert.equal(new Set(state.snapshot.capsules.map(c=>c.toy_id)).size,5);assert.equal(state.stories.length,0);
 assert(PLAY_DB.startsWith('bc-local-play-'));assert.equal(validateLayout(state.snapshot.documents.nest.value,state.snapshot.capsules.map(c=>c.toy_id)).length,2);
 const entry=fs.readFileSync(new URL('../review/local-play.tsx',import.meta.url),'utf8'),config=fs.readFileSync(new URL('../review/local-play.vite.config.ts',import.meta.url),'utf8');
 assert(!entry.includes('AccountProvider'));assert(config.includes('envDir:false'));assert(config.includes("'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':JSON.stringify('')"));
 assert(!fs.readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8').includes('local-play'));
});
test('local draw retry returns the same outstanding capsule; keep is idempotent and durable state grows once',()=>{
 const state=initialPlayState(),draw=stepPlay(state,'draw',{requestId:'draw-1'});
 assert.equal(stepPlay(state,'draw',{requestId:'draw-2'}).id,draw.id);
 const result=stepPlay(state,'keep',{requestId:draw.id});assert.equal(result.patch.capsules.length,1);assert.equal(state.snapshot.capsules.length,6);
 stepPlay(state,'keep',{requestId:draw.id});assert.equal(state.snapshot.capsules.length,6);assert.throws(()=>stepPlay(state,'reject',{requestId:draw.id}));
});
test('local stories require a completed eligible scene and attached photo before entering the draw pool',()=>{
 const now=Date.now(),state=initialPlayState(now),options={revision:1};
 const event=stepPlay(state,'start',options,now,()=>0).event;assert.equal(event.kind,'soup');
 assert.equal(stepPlay(state,'complete',{...options,requestId:event.id},now+11000).ok,undefined);assert.equal(state.stories.length,0);
 const completed=stepPlay(state,'complete',{...options,requestId:event.id},now+14000);assert(completed.capture);assert.equal(snapshotOf(state).stories.length,0);
 const before=stepPlay(state,'draw',{requestId:'before-photo'},now+15000,()=>0);assert.equal(before.type,'toy');stepPlay(state,'reject',{requestId:before.id});
 attachPlayPhoto(state,event.id,{id:'actual-capture',kind:'photo',url:'',storagePath:PLAY_OWNER+'/scene',width:960,height:960,label:'captured scene',origin:'account-file'});
 const drawn=stepPlay(state,'draw',{requestId:'with-photo'},now+16000,()=>0);assert.equal(drawn.type,'story');assert(drawn.story.media.storagePath);
 stepPlay(state,'keep',{requestId:drawn.id});assert.equal(snapshotOf(state).stories.length,1);
});
test('local layout saves retain revision conflict and exact retry protection',()=>{
 const state=initialPlayState(),value=structuredClone(state.snapshot.documents.nest.value);
 const first=savePlayDocument(state,'nest',value,1);assert.equal(first.document.revision,2);
 assert.equal(savePlayDocument(state,'nest',value,1).document.revision,2);
 savePlayDocument(state,'nest',{...value,placements:[]},2);
 assert.throws(()=>savePlayDocument(state,'nest',value,1));assert.equal(state.snapshot.documents.nest.revision,3);
});
