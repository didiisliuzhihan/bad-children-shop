import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import React from 'react';import * as jsxRuntime from 'react/jsx-runtime';import {renderToStaticMarkup} from 'react-dom/server';import {transformWithOxc} from 'vite';
import {collectedPostcards} from '../src/lib/collectedPostcards.ts';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const nest={id:'same-id',source:'nest',createdAt:'2026-09-08T12:00:00Z',text:'鸦在精神上帮忙了。'};
const player={id:'same-id',source:'player',status:'collected',createdAt:'2026-09-01T12:00:00Z',obtainedAt:'2026-09-08T13:00:00Z',text:'<script>文字原样保留</script>',signature:'<b>朋友</b>',stampId:'shop-default'};
async function load(hooks=React,jsx=jsxRuntime){const code=(await transformWithOxc(read('src/components/CollectionShelf.tsx'),'CollectionShelf.tsx',{jsx:{runtime:'automatic'}})).code.replace(/^import[^\n]*\n/gm,'').replace(/^export function /gm,'function ');const context={...hooks,_jsx:jsx.jsx,_jsxs:jsx.jsxs,Icon:()=>null,defaultStamp:{id:'shop-default',name:'羊女孩默认戳',imageUrl:'/preview/default-stamp.png'}};vm.runInNewContext(code+'\nglobalThis.Shelf=CollectionShelf;globalThis.Entry=CollectedPostcardEntry;',context);return context;}
test('postcard collection merges private stories and received receipts, excludes drafts, preserves source namespaces',()=>{
 const outgoing={...player,id:'draft',status:'local-draft'},input=[nest,nest],received=[player,outgoing];const original=JSON.stringify([input,received]);
 const result=collectedPostcards(input,received);assert.equal(result.length,2);assert.equal(result[0].source,'player');assert.equal(result[1].source,'nest');assert.equal(JSON.stringify([input,received]),original);assert.deepEqual(collectedPostcards([],[]),[]);
});
test('postcard entries show private provenance without stamps, and received provenance with escaped signature/stamp',async()=>{
 const {Entry}=await load();const privateHtml=renderToStaticMarkup(React.createElement(Entry,{card:{...nest,stampId:'shop-default',signature:'不应出现'},onOpen(){}}));
 assert(privateHtml.includes('仅自己可见'));assert(!privateHtml.includes('default-stamp'));assert(!privateHtml.includes('不应出现'));
 const received=renderToStaticMarkup(React.createElement(Entry,{card:player,onOpen(){}}));assert(received.includes('收到的彩蛋'));assert(received.includes('default-stamp.png'));assert(received.includes('&lt;b&gt;朋友&lt;/b&gt;'));assert(!received.includes('<script>'));assert(received.includes('&lt;script&gt;'));
});
test('shelf separates toys from postcards, keeps duplicate card counts, and renders honest empty states',async()=>{
 const {Shelf}=await load();const html=renderToStaticMarkup(React.createElement(Shelf,{toyCount:3,uniqueCount:2,postcards:[nest],onOpenPostcard(){},onDraw(){},toyCards:React.createElement('div',{},'三张卡片')}));
 assert(html.includes('2 位扭蛋宝 · 3 张卡片'));assert(html.includes('id="shelf-panel-postcards"'));assert(html.includes('aria-labelledby="shelf-tab-postcards" hidden=""'));assert(html.includes('aria-selected="true"'));assert(html.includes('三张卡片'));
 const empty=renderToStaticMarkup(React.createElement(Shelf,{toyCount:0,uniqueCount:0,postcards:[],onOpenPostcard(){},onDraw(){},toyCards:[]}));assert(empty.includes('还没抽到明信片'));assert(empty.includes('不放创作草稿'));assert(!empty.includes('collected-postcard-text'));
});
test('category buttons and arrow keys switch independent accessible panels and preserve open behavior',async()=>{
 const slots=[];let cursor=0,opened=null,drawn=0;const hooks={useState(initial){const i=cursor++;slots[i]??=initial;return [slots[i],value=>slots[i]=value]}};
 const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};const context=await load(hooks,jsx),focused=[];context.document={getElementById:id=>({focus:()=>focused.push(id)})};
 const render=()=>{cursor=0;return context.Shelf({toyCount:2,uniqueCount:1,postcards:[nest],onOpenPostcard:card=>opened=card,onDraw:()=>drawn++,toyCards:'toys'})};
 const walk=(node,predicate)=>{if(!node||typeof node!=='object')return [];return [...(predicate(node)?[node]:[]),...[node.props?.children].flat(Infinity).flatMap(n=>walk(n,predicate))]};
 let tree=render(),tabs=walk(tree,n=>n.props?.role==='tab');tabs[1].props.onClick();tree=render();assert.equal(walk(tree,n=>n.props?.id==='shelf-panel-toys')[0].props.hidden,true);assert.equal(walk(tree,n=>n.props?.id==='shelf-panel-postcards')[0].props.hidden,false);
 const entry=walk(tree,n=>n.type===context.Entry)[0];entry.props.onOpen();assert.equal(opened,nest);
 tabs=walk(tree,n=>n.props?.role==='tab');let prevented=false;tabs[1].props.onKeyDown({key:'Home',preventDefault:()=>prevented=true});tree=render();assert(prevented);assert.equal(focused.at(-1),'shelf-tab-toys');assert.equal(walk(tree,n=>n.props?.id==='shelf-panel-toys')[0].props.hidden,false);assert.equal(drawn,0);
});
