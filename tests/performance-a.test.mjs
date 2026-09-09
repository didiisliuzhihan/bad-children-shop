import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import {transformWithOxc} from 'vite';
import {createPrivateMediaCache} from '../src/lib/privateMediaCache.ts';
import {applyAccountPatch} from '../src/lib/accountSnapshot.ts';
import {isConfirmedDocumentRetry} from '../supabase/functions/bc-account-preview/documentRetry.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};

test('private image URLs batch in groups of 24, deduplicate and expire independently',async()=>{
 let now=0;const cache=createPrivateMediaCache(()=>now),calls=[];
 const loader=async paths=>{calls.push(paths);return {expiresAt:now+3600000,urls:paths.map(path=>({path,url:'https://qa.invalid/'+path}))}};
 const jobs=Array.from({length:30},(_,n)=>cache.get('owner','owner/'+n,loader));jobs.push(cache.get('owner','owner/0',loader));
 await Promise.all(jobs);assert.deepEqual(calls.map(c=>c.length),[24,6]);
 await cache.get('owner','owner/0',loader);assert.equal(calls.length,2);
 now=3550000;await cache.get('owner','owner/0',loader);assert.equal(calls.length,3);
});
test('a failed private image is retryable and cannot poison other files or another owner',async()=>{
 const cache=createPrivateMediaCache(),calls=[];
 const load=async paths=>{calls.push(paths);return {expiresAt:Date.now()+3600000,urls:paths.map(path=>({path,url:path.endsWith('bad')?null:'https://qa.invalid/'+path}))}};
 const results=await Promise.allSettled([cache.get('a','a/good',load),cache.get('a','a/bad',load)]);
 assert.deepEqual(results.map(r=>r.status),['fulfilled','rejected']);
 await assert.rejects(cache.get('a','a/bad',load));assert.equal(calls.length,2);
 let complete;const old=cache.get('a','a/pending',()=>new Promise(resolve=>complete=resolve));const rejected=assert.rejects(old,/账户已切换/);await settle();cache.clear();await rejected;
 complete({expiresAt:Date.now()+3600000,urls:[{path:'a/pending',url:'OLD PRIVATE URL'}]});await settle();
 const fresh=await cache.get('b','b/photo',load);assert.equal(fresh,'https://qa.invalid/b/photo');assert(!fresh.includes('OLD'));
});
test('save retry is acknowledged only at the exact next revision with the same canonical data',()=>{
 const value={placements:[{toyId:'crow',x:1,z:2}],roomId:'nest'};
 assert(isConfirmedDocumentRetry({key:'nest',revision:4,value:{roomId:'nest',placements:[{z:2,x:1,toyId:'crow'}]}},'nest',value,3));
 for(const current of [null,{key:'other',revision:4,value},{key:'nest',revision:5,value},{key:'nest',revision:4,value:{...value,placements:[]}}])assert(!isConfirmedDocumentRetry(current,'nest',value,3));
});
test('confirmed patches are owner-scoped, preserve document revisions and deduplicate story IDs',()=>{
 const old={profile:{user_id:'a'},capsules:[],stories:[],documents:{nest:{key:'nest',revision:9,value:{x:1}}}};
 assert.equal(applyAccountPatch(old,{ownerId:'b',capsules:[{id:'foreign'}]}),old);
 const patch={ownerId:'a',stories:[{id:'story1',source:'nest',text:'hello',createdAt:'today'}],document:{key:'nest',revision:8,value:{x:2}}};
 const result=applyAccountPatch(applyAccountPatch(old,patch),patch);assert.equal(result.stories.length,1);assert.equal(result.documents.nest.value.x,1);
});

test('card preview is readable before image/font/export and hidden cards do not request artwork',async()=>{
 const source=(await transformWithOxc(read('src/components/CollectibleCardPreview.tsx'),'Card.tsx',{jsx:{runtime:'automatic'}})).code.replace(/^import[^\n]*\n/gm,'').replace(/^export function /gm,'function ');
 const context={...React,_jsx:jsx.jsx,_jsxs:jsx.jsxs};vm.runInNewContext(source+'\nglobalThis.View=CollectibleCardPreview;',context);
 const toy={id:'crow',name_zh:'鸦',name_en:'Crow',tagline_zh:'先休息——喝一杯水',card_image_url:'https://qa.invalid/card.png',color:'#abcabc',number:'01'},item={obtained_at:'2026-09-08T12:00:00Z'};
 const visible=renderToStaticMarkup(React.createElement(context.View,{toy,item,active:true,onImageReady(){}}));
 for(const copy of ['鸦','先休息','喝一杯水','2026/9/8'])assert(visible.includes(copy));assert(visible.includes('<img'));assert(!visible.includes('canvas'));
 const hidden=renderToStaticMarkup(React.createElement(context.View,{toy,item,active:false,onImageReady(){}}));assert(!hidden.includes('<img'));assert(hidden.includes('喝一杯水'));
});
test('an optional font failure still produces a real image export, with a bounded stable-key cache',async()=>{
 const calls={fetch:0,encode:0,draw:0};const drawing=new Proxy({measureText:text=>({width:text.length*10}),drawImage(){calls.draw++}},{get:(target,key)=>key in target?target[key]:()=>{},set:(target,key,value)=>(target[key]=value,true)});
 const code=(await transformWithOxc(read('src/lib/cardExport.ts'),'cardExport.ts')).code.replace(/^import[^\n]*\n/gm,'').replace(/^export (?=(?:const|function|async function))/gm,'');
 const context={Blob,URL,AbortController,setTimeout,clearTimeout,Image:class{naturalWidth=1024;naturalHeight=1024;async decode(){}},ensureQuestFont:async()=>{throw Error('font offline')},QUEST_FONT_FAMILY:'sans-serif',
  fetch:async()=>{calls.fetch++;return {ok:true,blob:async()=>new Blob(['real image'])}},document:{createElement:()=>({getContext:()=>drawing,toBlob:callback=>{calls.encode++;callback(new Blob(['complete card'],{type:'image/png'}))}})}};
 vm.runInNewContext(code+'\nglobalThis.api={prepareCollectibleCard,cachedCollectibleCard,collectibleCardKey};',context);
 const toy={id:'crow',name_zh:'鸦',name_en:'Crow',tagline_zh:'休息——喝水',card_image_url:'https://qa.invalid/card.png',color:'#abcabc',number:'01'},item={obtained_at:'2026-09-08T12:00:00Z'};
 const [one,two]=await Promise.all([context.api.prepareCollectibleCard(toy,item),context.api.prepareCollectibleCard({...toy},{...item})]);
 assert.equal(one,two);assert.equal(one.type,'image/png');assert.equal(calls.draw,1);assert.equal(calls.encode,1);assert.equal(calls.fetch,1);
 for(let n=0;n<10;n++)await context.api.prepareCollectibleCard({...toy,name_zh:'鸦'+n},item);
 assert.equal(context.api.cachedCollectibleCard(context.api.collectibleCardKey(toy,item)),undefined);
});
test('production keep/save, deferred-photo and card paths have no dependency on a full photo reload',()=>{
 const edge=read('supabase/functions/bc-account-preview/index.ts'),provider=read('src/components/AccountProvider.tsx'),card=read('src/components/CollectibleCard.tsx');
 assert(edge.includes("['keep','reject'].includes(data.operation)&&data.responseMode==='patch'"));assert(edge.includes('!draw.data.resolved||!draw.data.kept'));assert(edge.includes('!draw.data.resolved||draw.data.kept'));
 assert(edge.includes("createSignedUrls(paths,3600)"));assert(edge.includes('data.paths.length>24'));assert(edge.includes('!ownMediaPath(path,auth.uid)'));
 assert(provider.includes("{action:'load',deferMedia:true}"));assert(card.includes('!active||!imageReady||current||error'));assert(!card.includes('图片或字体未能加载'));
 assert(read('src/components/ToyRoom.tsx').includes("active={pane==='card'}"));
});
