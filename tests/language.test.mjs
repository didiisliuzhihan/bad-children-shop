import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import {EN_ENTRIES,NEST_STORY_EN,translateText} from '../src/lib/locale/en.mjs';
import {wrapCanvasText} from '../src/lib/locale/wrapText.mjs';
import {localeMocks} from './helpers/locale.mjs';
import {residentExpansionToys} from '../src/lib/residentExpansion.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const han=/[\u3400-\u9fff]/;
const english=Object.assign({},localeMocks,{useLanguage:()=> 'en',getLanguage:()=> 'en',tx:value=>translateText(value,'en')});
async function compile(file,context,expose){
 const result=await transformWithOxc(read(file),file,{jsx:{runtime:'automatic'}});
 const code=result.code.replace(/^import[^\n]*\n/gm,'').replace(/^export (?=(?:const|function|async function))/gm,'');
 vm.runInNewContext(code+'\n'+expose,context);return context;
}
test('all curated interface strings, seven published names/tasks and sixteen private stories have English',()=>{
 assert(EN_ENTRIES.length>=590);assert.equal(NEST_STORY_EN.length,16);
 for(const [zh,en] of EN_ENTRIES){assert(typeof en==='string',zh);assert(!han.test(en),zh);assert(!han.test(translateText(zh,'en')),zh);assert.equal(translateText(zh,'zh'),zh);}
 const toys=JSON.parse(read('tests/fixtures/locale-toys.json'));assert.equal(toys.length,7);
 for(const toy of toys){assert.equal(translateText(toy.name_zh,'en'),toy.name_en);for(const text of [toy.story_text,...toy.tagline_zh.split('——')])assert(!han.test(translateText(text,'en')),text);}
});
test('count/error messages translate without changing numbers or interpolated account nickname',()=>{
 for(const text of ['我的扭蛋包，17个收藏','7 位扭蛋宝 · 13 张卡片','明信片最多写 80 个字。','彩蛋明信片编辑'])assert(!han.test(translateText(text,'en')));
 const result=translateText('确认将当前浏览器的 7 枚旧收藏带入「哭哭葵」吗？这不会删除原记录，也不会迁入其他账户的收藏。','en');
 assert(result.includes('7'));assert(result.includes('“哭哭葵”'));assert(!result.includes('Kuku'));
 assert.equal(translateText('a message not in the dictionary','en'),'a message not in the dictionary');
});
test('locale persists in its own key and notifies subscribers without touching account or game storage',async()=>{
 const writes=[],listeners=[],events={},root={dataset:{}},memory=new Map([['bc-language-v1','en'],['collection','keep-me']]);
 const context={translateText,localStorage:{getItem:k=>memory.get(k),setItem(k,v){writes.push([k,v]);memory.set(k,v)}},document:{documentElement:root},window:{addEventListener:(name,fn)=>events[name]=fn},useSyncExternalStore:(subscribe,get)=>{subscribe(()=>listeners.push(get()));return get()}};
 await compile('src/lib/i18n.ts',context,'globalThis.api={getLanguage,setLanguage,useLanguage,tx};');
 assert.equal(context.api.useLanguage(),'en');context.api.setLanguage('zh');context.api.setLanguage('en');context.api.setLanguage('en');
 assert.deepEqual(listeners,['zh','en']);assert.equal(root.lang,'en');assert.equal(memory.get('collection'),'keep-me');assert(writes.every(([key])=>key==='bc-language-v1'));
 events.storage({key:'bc-language-v1',newValue:'zh'});assert.equal(root.lang,'zh-CN');
 context.localStorage.setItem=()=>{throw Error('storage disabled')};context.api.setLanguage('en');assert.equal(context.api.getLanguage(),'en');
});
test('player postcard message/signature and account nickname remain original even if they match translation keys',async()=>{
 const context={...React,...english,_jsx:jsx.jsx,_jsxs:jsx.jsxs,_Fragment:React.Fragment,Icon:()=>null,defaultStamp:{name:'Stamp',imageUrl:'/stamp.png'},usePostcardMedia:media=>({media,ref:{current:null},loading:false,error:'',imageFailed(){},retry(){}})};
 await compile('src/components/Postcard.tsx',context,'globalThis.Postcard=Postcard;');
 const render=props=>renderToStaticMarkup(React.createElement(context.Postcard,props));
 const player=render({source:'player',text:'哭哭葵',signature:'保存卡片',date:'2026-09-08',stamped:true});
 assert(player.includes('哭哭葵'));assert(player.includes('保存卡片'));assert(!player.includes('Kuku Sunflower'));assert(player.includes('postcard-stamp'));
 const nest=render({source:'nest',text:NEST_STORY_EN[0][0],date:'2026-09-08'});
 assert(nest.includes('Stressed Jimao'));assert(!nest.includes('postcard-stamp'));
 const souvenir=render({source:'souvenir',playerNickname:'哭哭葵',text:'今天没有大事，大家在这里待了一会儿。',date:'2026-09-08'});
 assert(souvenir.includes('哭哭葵'));assert(!souvenir.includes('Kuku Sunflower'));
});
test('English wrapping respects word boundaries; Chinese wrapping stays within the frame',()=>{
 assert.deepEqual(wrapCanvasText('hello little friend',12,s=>s.length),['hello little','friend']);
 assert.deepEqual(wrapCanvasText('小窝里的一刻',3,s=>s.length),['小窝里','的一刻']);
 assert(wrapCanvasText('supercalifragilistic',5,s=>s.length).every(x=>x.length<=5));
});

test('auxiliary English is present in Chinese and absent from the English card DOM',async()=>{
 let language='en';
 const context={...React,...english,useLanguage:()=>language,tx:value=>translateText(value,language),_jsx:jsx.jsx,_jsxs:jsx.jsxs};
 await compile('src/components/ChineseOnly.tsx',context,'globalThis.ChineseOnly=ChineseOnly;');
 await compile('src/components/CollectibleCardPreview.tsx',context,'globalThis.Preview=CollectibleCardPreview;');
 const toy=JSON.parse(read('tests/fixtures/locale-toys.json'))[0];
 const render=()=>renderToStaticMarkup(React.createElement(context.Preview,{toy,item:{obtained_at:'2026-09-08'},active:true,onImageReady(){}}));
 assert(!render().includes('collectible-live-english'));
 language='zh';assert(render().includes('collectible-live-english'));
 for(const [file,classes] of [
  ['src/App.tsx',['toy-name-en','tagline-en']],
  ['src/components/ToyRoom.tsx',['room-name-en']],
  ['src/components/CollectibleCardPreview.tsx',['collectible-live-english']],
 ])for(const name of classes)assert(read(file).includes('<ChineseOnly><p className="'+name+'">'),file+': '+name);
 for(const file of ['src/components/Collection.tsx','src/components/CollectionGallery.tsx'])assert(read(file).includes('<ChineseOnly><span>{tx(toy.name_en)}</span></ChineseOnly>'));
});

test('toy dismissal keeps its cheeky tone without changing the gentler postcard action',()=>{
 assert.equal(translateText('赶出去','en'),'Kick them out');
 assert.equal(translateText('先放回去','en'),'Put it back for now');
 assert.equal(translateText('登录 · 住下来','en'),'Sign in');
 assert(!translateText('向右滑动，遇见你的坏小孩','en').includes('your little'));
});

test('English homepage reserves separate flow rows and equal-width reveal actions',()=>{
 const css=read('src/language.css');
 assert(css.includes('grid-template-rows:minmax(0,1fr) auto'));
 assert(css.includes('.machine-page .canvas-wrap{position:relative;inset:auto;grid-row:1'));
 assert(css.includes('.interaction-dock{position:relative;inset:auto;transform:none;grid-row:2'));
 assert(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
 assert(css.includes('@media(orientation:landscape) and (max-height:520px)'));
});
test('every English toy export fits its frame, uses English copy and has a distinct locale cache key',async()=>{
 const built=await transformWithOxc(read('src/assets.ts').slice(read('src/assets.ts').indexOf('export const fallbackToys')),'toys.ts');
 const toyContext={asset:x=>x,sourceLink:x=>x,residentExpansionToys};
 vm.runInNewContext(built.code.replace('export const','const')+'\nglobalThis.toys=fallbackToys;',toyContext);
 const ops=[],fontCalls=[];
 const drawing=new Proxy({font:'12px sans-serif',createRadialGradient:()=>({addColorStop(){}}),measureText(text){return {width:text.length*Number(this.font.match(/(\d+)px/)?.[1]||12)*.54}},fillText(text,x,y){ops.push({text,x,y,font:this.font})}},{get:(target,key)=>key in target?target[key]:()=>{},set:(target,key,value)=>(target[key]=value,true)});
 const context={...english,Blob,URL,AbortController,setTimeout,clearTimeout,Image:class{naturalWidth=1024;naturalHeight=1024;async decode(){}},ensureQuestFont:async(timeout,language)=>fontCalls.push([timeout,language]),QUEST_FONT_FAMILY:'"BC Quest",sans-serif',EN_QUEST_FONT_FAMILY:'"Fredoka","BC Quest",sans-serif',fetch:async()=>({ok:true,blob:async()=>new Blob(['image'])}),document:{createElement:()=>({getContext:()=>drawing,toBlob:callback=>callback(new Blob(['PNG'],{type:'image/png'}))})}};
 await compile('src/lib/cardExport.ts',context,'globalThis.api={prepareCollectibleCard,collectibleCardKey};');
 const item={obtained_at:'2026-09-08T12:00:00Z'};
 for(const toy of toyContext.toys){ops.length=0;await context.api.prepareCollectibleCard(toy,item);assert(ops.some(o=>o.text===toy.name_en));assert(ops.every(o=>!han.test(o.text)),toy.name_en);assert(ops.every(o=>o.y<1440&&o.y>=0));assert(ops.some(o=>o.font.includes('Fredoka')),toy.name_en+' task uses playful type');assert.notEqual(context.api.collectibleCardKey(toy,item,'en'),context.api.collectibleCardKey(toy,item,'zh'));}
 assert.equal(fontCalls.length,7);assert(fontCalls.every(([timeout,language])=>timeout===1800&&language==='en'));
});
test('language switching does not key-remount the app/room, or enter account save requests',()=>{
 const app=read('src/App.tsx'),scene=read('src/components/NestScene.tsx'),account=read('src/components/AccountProvider.tsx');
 assert(app.includes('<LanguageSwitch'));assert(!/key=\{language/.test(app+scene));assert(scene.includes('},[retry])'));assert(!account.includes('useLanguage'));
 assert(read('src/components/NestPhotoDialog.tsx').includes('retry,language]'));
 assert(read('src/components/CardExportDialog.tsx').includes('retry,language]'));
});
