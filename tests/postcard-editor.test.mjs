import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import {transformWithOxc} from 'vite';
import {chooseNotes,noteLength,TICKET_LIMIT,validateNote} from '../src/lib/communityDraft.mjs';
import {makePlayerPostcard} from '../src/lib/postcardDraft.ts';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const stamp={id:'shop-default',name:'羊女孩默认戳',imageUrl:'/preview/default-stamp.png',isDefault:true};
async function compile(name,context){
 const result=await transformWithOxc(read('src/components/'+name+'.tsx'),name+'.tsx',{jsx:{runtime:'automatic'}});
 vm.runInNewContext(result.code.replace(/^import[^\n]*\n/gm,'').replace(/^export function /gm,'function ')+'\nglobalThis.Component='+name+';',context);return context.Component;
}
const jsx={...React,_jsx:jsxRuntime.jsx,_jsxs:jsxRuntime.jsxs,_Fragment:React.Fragment};
function all(node,predicate){
 if(node===null||node===undefined||typeof node==='boolean')return [];
 if(Array.isArray(node))return node.flatMap(n=>all(n,predicate));
 if(typeof node!=='object')return [];
 return [...(predicate(node)?[node]:[]),...all(node.props?.children,predicate)];
}
function words(node){if(node===null||node===undefined||typeof node==='boolean')return '';if(Array.isArray(node))return node.map(words).join('');return typeof node==='object'?words(node.props?.children):String(node)}
async function studioHarness(account=null){
 let cursor=0;const slots=[],messages=[];
 const Postcard=()=>null,Modal=()=>null;
 const context={...jsx,crypto,AbortController,asset:p=>'/assets/'+p,defaultStamp:stamp,Icon:()=>null,Postcard,Modal,chooseNotes,noteLength,TICKET_LIMIT,validateNote,makePlayerPostcard,useAccount:()=>account,
  useEffect:()=>{},useCallback:fn=>fn,useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},
  useRef:initial=>{const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i]},
  prepareLocalPostcardMedia:()=>{throw Error('Not a media decoding test')}
 };
 const Component=await compile('TicketStudio',context);
 const h={tree:null,messages,render(){cursor=0;h.tree=Component({toast:message=>messages.push(message),active:true});return h.tree},card(){return all(h.tree,n=>n.type===Postcard&&!!n.props.editor)[0]},dialog(){return all(h.tree,n=>n.type===Modal)[0]},button(text,root=h.tree){const node=all(root,n=>n.type==='button'&&words(n)===text)[0];assert(node,'missing button '+text);return node}};
 h.render();return h;
}
test('editing hotspots are real labeled buttons; system stories and room photos cannot be edited or stamped',async()=>{
 const Postcard=await compile('Postcard',{...jsx,defaultStamp:stamp,Icon:()=>null});
 const editor={onMedia(){},onMessage(){},onSignature(){},onStamp(){}};
 const html=renderToStaticMarkup(React.createElement(Postcard,{source:'player',text:'<b>只是文字</b>',editor}));
 assert.equal((html.match(/aria-haspopup="dialog"/g)||[]).length,4);assert(html.includes('选择明信片印章'));assert(html.includes('点此盖戳'));assert(html.includes('&lt;b&gt;只是文字&lt;/b&gt;'));assert(!html.includes('<b>只是文字'));
 for(const source of ['nest','souvenir']){const html=renderToStaticMarkup(React.createElement(Postcard,{source,text:'留念',editor,stamped:true}));assert(!html.includes('aria-haspopup'));assert(!html.includes('default-stamp'));}
});
test('canvas-first editor has no permanent side form and names the random capsule destination honestly',async()=>{
 const h=await studioHarness();assert(!h.dialog());assert.equal(all(h.tree,n=>n.type==='textarea'||n.type==='input').length,0);
 assert(words(h.tree).includes('投进公共扭蛋池、让别人抽到的功能暂未开放'));assert(words(h.tree).includes('功能尚未开放'));
 assert(!read('src/components/TicketStudio.tsx').includes('className="postcard-editor"'));
 for(const path of ['src/components/TicketStudio.tsx','src/components/CollectionGallery.tsx','src/components/NestRoom.tsx','src/lib/communityDraft.mjs'])for(const stale of ['纸条','写给别人','寄一小片生活'])assert(!read(path).includes(stale),path+' contains '+stale);
});
test('clicking image offers text-only; text editing stages changes and cancel leaves the card untouched',async()=>{
 const h=await studioHarness();h.card().props.editor.onMedia();h.render();assert(h.dialog());h.button('只留文字一句话也能成为小彩蛋',h.dialog()).props.onClick();h.render();assert.equal(h.card().props.media,null);
 h.card().props.editor.onMessage();h.render();let textarea=all(h.dialog(),n=>n.type==='textarea')[0];textarea.props.onChange({target:{value:'尚未确认的文字'}});h.render();h.dialog().props.onClose();h.render();assert.equal(h.card().props.text,'');
 h.card().props.editor.onMessage();h.render();textarea=all(h.dialog(),n=>n.type==='textarea')[0];textarea.props.onChange({target:{value:'别急，先陪鸦休息一下。'}});h.render();all(h.dialog(),n=>n.type==='form')[0].props.onSubmit({preventDefault(){}});h.render();assert.equal(h.card().props.text,'别急，先陪鸦休息一下。');assert(!h.dialog());
});
test('missing content routes to text; only the owned default stamp can be chosen and survives text edits',async()=>{
 const h=await studioHarness();h.button('保存彩蛋草稿').props.onClick();h.render();assert.equal(h.dialog().props.label,'编辑明信片文字');h.dialog().props.onClose();h.render();
 h.card().props.editor.onStamp();h.render();const options=all(h.dialog(),n=>n.props?.className==='postcard-stamp-options')[0];assert.equal(all(options,n=>n.type==='button').length,1);all(options,n=>n.type==='button')[0].props.onClick();h.render();assert(h.card().props.stamped);
 h.card().props.editor.onMessage();h.render();all(h.dialog(),n=>n.type==='textarea')[0].props.onChange({target:{value:'开心一点'}});h.render();all(h.dialog(),n=>n.type==='form')[0].props.onSubmit({preventDefault(){}});h.render();assert(h.card().props.stamped);
});
test('saving the composed card calls only private draft persistence and blocks duplicate pending saves',async()=>{
 let finish,requests=0;const values=[];
 const account={profile:{nickname:'小鸦'},documents:{},uploadMedia:async media=>media,saveDocument:async(key,value,revision)=>{requests++;values.push({key,value,revision});await new Promise(resolve=>finish=resolve)}};
 const h=await studioHarness(account);h.card().props.editor.onMessage();h.render();all(h.dialog(),n=>n.type==='textarea')[0].props.onChange({target:{value:'偶然遇见你，真好。'}});h.render();all(h.dialog(),n=>n.type==='form')[0].props.onSubmit({preventDefault(){}});h.render();
 h.card().props.editor.onStamp();h.render();all(h.dialog(),n=>n.props?.className==='postcard-stamp-options')[0].props.children.props.onClick();h.render();
 const save=h.button('保存彩蛋草稿');save.props.onClick();save.props.onClick();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(requests,1);assert.equal(values[0].key,'postcards');assert.equal(values[0].value.drafts[0].source,'player');assert.equal(values[0].value.drafts[0].stampId,'shop-default');assert.equal(values[0].revision,0);
 finish();await new Promise(resolve=>setTimeout(resolve,0));h.render();assert(h.messages.some(m=>m.includes('尚未投进扭蛋池')));assert(!h.messages.some(m=>m.includes('投递成功')));
});
