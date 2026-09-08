import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import * as THREE from 'three';
import {localMediaKind,fittedMediaSize,prepareLocalPostcardMedia,canvasBlob} from '../src/lib/postcardMedia.ts';
import {makePlayerPostcard,makeNestPostcard,postcardCaption} from '../src/lib/postcardDraft.ts';
import {captureNestPhoto} from '../src/lib/nestCapture.ts';
import {frameNestCamera} from '../src/lib/nestSceneGeometry.ts';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const media={id:'photo1',kind:'photo',url:'blob:private-room',width:960,height:960,label:'小窝照片',origin:'nest-capture'};
const snapshot={id:'shot1',media,createdAt:'2026-09-08T12:00:00Z',timeOfDay:'day',residentIds:['miss_popcorn','tired_crow']};

test('private home postcard never gets a stamp or fabricates its source; player drafts are stamped',()=>{
 const player=makePlayerPostcard(' <b>原样文字</b> ','😀'.repeat(25),media,'player1',snapshot.createdAt);
 assert.equal(player.source,'player');assert.equal(player.stampId,'shop-default');assert.equal(Array.from(player.signature).length,16);assert.equal(player.status,'local-draft');assert.equal(player.text,'<b>原样文字</b>');
 const home=makeNestPostcard('一起待了一会儿。',snapshot,'home1');assert.equal(home.source,'nest');assert(!('stampId' in home));assert.equal(home.snapshotId,snapshot.id);assert.equal(home.createdAt,snapshot.createdAt);assert.equal(home.media,media);
 assert.throws(()=>makeNestPostcard('虚构记录',{...snapshot,media:{...media,origin:'example'}},'fake'));
 assert.throws(()=>makePlayerPostcard(' ','',null,'empty',snapshot.createdAt));assert.throws(()=>makeNestPostcard('字'.repeat(81),snapshot,'long'));
 assert(!postcardCaption('day',2).includes('鸦'));assert(!postcardCaption('night',1).includes('爆米花'));assert(postcardCaption('day',0).includes('太阳'));
});

test('local media accepts supported formats only and has size/dimension limits',()=>{
 for(const [type,kind] of [['image/jpeg','photo'],['image/png','photo'],['image/webp','photo'],['image/gif','gif'],['video/mp4','video'],['video/webm','video']])assert.equal(localMediaKind({type,size:100,name:'file'}),kind);
 for(const type of ['text/html','image/svg+xml','image/heic','video/quicktime',''])assert.throws(()=>localMediaKind({type,size:10,name:'fake.jpg'}));
 assert.throws(()=>localMediaKind({type:'image/gif',size:9*1024*1024,name:'big.gif'}));assert.throws(()=>localMediaKind({type:'video/mp4',size:21*1024*1024,name:'big.mp4'}));assert.throws(()=>localMediaKind({type:'image/png',size:0,name:'empty.png'}));
 assert.deepEqual(fittedMediaSize(4000,3000),{width:1440,height:1080});assert.deepEqual(fittedMediaSize(100,200),{width:100,height:200});assert.throws(()=>fittedMediaSize(NaN,4));assert.throws(()=>fittedMediaSize(6000,6000));
});

async function loadPostcard(){
 const result=await transformWithOxc(read('src/components/Postcard.tsx'),'Postcard.tsx',{jsx:{runtime:'automatic'}});
 const source=result.code.replace(/^import[^\n]*\n/gm,'').replace(/^export function /gm,'function ')+'\nglobalThis.Postcard=Postcard;';
 const context={...React,_jsx:jsxRuntime.jsx,_jsxs:jsxRuntime.jsxs,defaultStamp:{name:'羊女孩默认戳',imageUrl:'/preview/default-stamp.png'},Icon:()=>null};
 vm.runInNewContext(source,context);return context;
}
test('rendered postcard omits the whole stamp element for home, including empty states',async()=>{
 const {Postcard}=await loadPostcard();
 for(const photo of [media,null]){
  const home=renderToStaticMarkup(React.createElement(Postcard,{source:'nest',text:'<script>字面文本</script>',media:photo,stamped:true}));
  assert(!home.includes('postcard-stamp'));assert(!home.includes('default-stamp'));assert(home.includes('&lt;script&gt;'));assert(!home.includes('<script>'));
 }
 const stamped=renderToStaticMarkup(React.createElement(Postcard,{source:'player',text:'你好',stamped:true,media}));assert(stamped.includes('postcard-stamp'));assert(stamped.includes('default-stamp.png'));
 const unstamped=renderToStaticMarkup(React.createElement(Postcard,{source:'player',text:'你好',stamped:false}));assert(!unstamped.includes('default-stamp.png'));
});

test('GIF starts on its still poster; video is inline, silent and has no autoplay',async()=>{
 const {Postcard}=await loadPostcard();
 const gif=renderToStaticMarkup(React.createElement(Postcard,{source:'player',text:'你好',media:{...media,kind:'gif',url:'blob:motion',posterUrl:'blob:still'}}));assert(gif.includes('src="blob:still"'));assert(!gif.includes('src="blob:motion"'));assert(gif.includes('播放影像'));
 const video=renderToStaticMarkup(React.createElement(Postcard,{source:'nest',text:'你好',media:{...media,kind:'video',url:'blob:motion',posterUrl:'blob:still'}}));assert(video.includes('<video'));assert(video.includes('muted=""'));assert(video.includes('playsInline=""'));assert(!video.includes('autoPlay'));
});

test('one-shot capture copies pixels before restoring renderer and never moves scene residents',async()=>{
 const originalDocument=globalThis.document,ops=[],camera=new THREE.OrthographicCamera(),selection=new THREE.Object3D(),scene=new THREE.Scene(),resident=new THREE.Group();scene.add(resident);resident.position.set(1,0,-1);frameNestCamera(camera,390,420);const before=camera.clone(),position=resident.position.clone();selection.visible=true;
 const output={width:0,height:0,getContext:()=>({fillStyle:'',fillRect:()=>ops.push('fill'),drawImage:()=>ops.push('copy')}),toBlob:cb=>{ops.push('encode');cb(new Blob(['jpg'],{type:'image/jpeg'}))}};
 globalThis.document={createElement:tag=>{assert.equal(tag,'canvas');return output}};
 let size=new THREE.Vector2(390,420),ratio=1.5;
 const renderer={domElement:{},getSize:v=>v.copy(size),getPixelRatio:()=>ratio,setPixelRatio:r=>{ratio=r},setSize:(x,y,css)=>{assert.equal(css,false);size.set(x,y)},render:()=>{ops.push('render:'+size.x);if(size.x===960)assert(!selection.visible)}};
 try{const blob=await captureNestPhoto(renderer,scene,camera,selection,'night');assert.equal(blob.type,'image/jpeg');assert.deepEqual(ops,['render:960','fill','copy','render:390','encode']);assert.deepEqual(size.toArray(),[390,420]);assert.equal(ratio,1.5);assert(selection.visible);assert(camera.projectionMatrix.equals(before.projectionMatrix));assert(camera.position.equals(before.position));assert(resident.position.equals(position));assert.equal(output.width,960)}finally{globalThis.document=originalDocument}
});

test('capture restores camera/canvas/selection even if drawing fails',async()=>{
 const originalDocument=globalThis.document,camera=new THREE.OrthographicCamera(),selection=new THREE.Object3D();frameNestCamera(camera,1200,700);const before=camera.clone();selection.visible=true;let size=new THREE.Vector2(1200,700),ratio=1.25;
 globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},drawImage(){throw Error('context lost')}})})};
 const renderer={domElement:{},getSize:v=>v.copy(size),getPixelRatio:()=>ratio,setPixelRatio:r=>ratio=r,setSize:(x,y)=>size.set(x,y),render(){}};
 try{await assert.rejects(captureNestPhoto(renderer,new THREE.Scene(),camera,selection,'day'));assert(camera.projectionMatrix.equals(before.projectionMatrix));assert.deepEqual(size.toArray(),[1200,700]);assert.equal(ratio,1.25);assert(selection.visible)}finally{globalThis.document=originalDocument}
});

function mediaHarness({duration=3,failEncode=false}={}){
 const original={document:globalThis.document,Image:globalThis.Image,create:URL.createObjectURL,revoke:URL.revokeObjectURL};let seq=0;const live=new Set(),revoked=[];
 URL.createObjectURL=()=>{const url='blob:test-'+(++seq);live.add(url);return url};URL.revokeObjectURL=url=>{revoked.push(url);live.delete(url)};
 class ImageMock extends EventTarget{naturalWidth=2000;naturalHeight=1500;set src(_){queueMicrotask(()=>this.dispatchEvent(new Event('load')))}}
 class VideoMock extends EventTarget{videoWidth=1920;videoHeight=1080;duration=duration;load(){queueMicrotask(()=>this.dispatchEvent(new Event('loadeddata')))}pause(){}removeAttribute(){}}
 globalThis.Image=ImageMock;globalThis.document={createElement:tag=>tag==='video'?new VideoMock():{getContext:()=>({fillRect(){},drawImage(){}}),toBlob:cb=>queueMicrotask(()=>cb(failEncode?null:new Blob(['still'],{type:'image/jpeg'})))}};
 return {live,revoked,restore(){globalThis.document=original.document;globalThis.Image=original.Image;URL.createObjectURL=original.create;URL.revokeObjectURL=original.revoke}};
}
test('photo processing releases original, preserves preview URL until disposal; GIF has a still',async()=>{
 const h=mediaHarness();try{
  const photo=await prepareLocalPostcardMedia(new File(['photo'],'private.jpg',{type:'image/jpeg'}));assert.equal(photo.media.width,1440);assert.equal(h.live.size,1);assert.equal(h.revoked.length,1);photo.release();photo.release();assert.equal(h.live.size,0);
  const gif=await prepareLocalPostcardMedia(new File(['gif'],'hello.gif',{type:'image/gif'}));assert(gif.media.posterUrl);assert.equal(h.live.size,2);gif.release();assert.equal(h.live.size,0);
 }finally{h.restore()}
});
test('failed decode/encoding, long videos and cancelled imports leave no object URLs',async()=>{
 let h=mediaHarness({duration:16});try{await assert.rejects(prepareLocalPostcardMedia(new File(['movie'],'long.mp4',{type:'video/mp4'})),/15 秒/);assert.equal(h.live.size,0)}finally{h.restore()}
 h=mediaHarness({failEncode:true});try{await assert.rejects(prepareLocalPostcardMedia(new File(['photo'],'bad.jpg',{type:'image/jpeg'})));assert.equal(h.live.size,0)}finally{h.restore()}
 h=mediaHarness();try{const controller=new AbortController();controller.abort();await assert.rejects(prepareLocalPostcardMedia(new File(['gif'],'cancel.gif',{type:'image/gif'}),controller.signal));assert.equal(h.live.size,0)}finally{h.restore()}
 await assert.rejects(canvasBlob({toBlob:cb=>cb(null)}));
});

test('room keepsakes stay in the room; Notes contains only player drafts and no story workshop',()=>{
 const studio=read('src/components/TicketStudio.tsx'),scene=read('src/components/NestScene.tsx'),collection=read('src/components/CollectionGallery.tsx');
 assert(studio.includes('controller.signal.aborted'));assert(studio.includes('owned.current.delete(id)'));assert(studio.includes('active={active&&view==='));
 for(const removed of ['makeNestPostcard','小窝来信',"'home'",'snapshots','onNest'])assert(!studio.includes(removed),removed);
 assert(studio.includes("type View='write'|'drafts'"));assert(studio.includes('useState<PlayerDraft[]>'));
 assert(scene.includes('pending.size||failed.size||gesture||latest.current.editing'));assert(scene.includes('api.current===current'));assert(scene.includes('captureNestPhoto(renderer,scene,camera,selection,timeOfDay,options)'));
 assert(!collection.includes('snapshots'));assert(!collection.includes('onCapture'));assert(collection.includes('useState<CommunityTab>(\'cards\')'));
 const room=read('src/components/NestRoom.tsx'),dialog=read('src/components/NestPhotoDialog.tsx');
 assert(room.includes('onCapture={setPhoto}'));assert(room.includes('active&&photo&&<NestPhotoDialog'));assert(room.includes('if(!active)setPhoto(null)'));
 assert(dialog.includes('source="souvenir"'));assert(dialog.includes('playerNickname={playerNickname}'));assert(dialog.includes('URL.revokeObjectURL(url)'));assert(dialog.includes('URL.revokeObjectURL(exportUrl)'));
 assert(dialog.includes('await image.decode()'));assert(dialog.includes('if(!alive)return'));assert(dialog.includes('disabled={!ready||sharing}'));assert(dialog.includes('不会投进扭蛋池'));assert(!dialog.includes('makeNestPostcard'));assert(!dialog.includes('setTab'));
 for(const path of ['src/lib/postcardDraft.ts','src/lib/postcardMedia.ts','src/lib/nestCapture.ts','src/components/TicketStudio.tsx','src/components/NestPhotoDialog.tsx']){const code=read(path);assert(!code.includes('localStorage'));assert(!code.includes('fetch('));assert(!code.includes('supabase'));assert(!code.includes('dangerouslySetInnerHTML'))}
});

test('only manual room keepsakes replace Postcard with the account nickname, safely and without a stamp',async()=>{
 const {Postcard}=await loadPostcard();
 const souvenir=renderToStaticMarkup(React.createElement(Postcard,{source:'souvenir',playerNickname:'<b>小羊</b>',text:'留念',media,stamped:true}));
 assert(souvenir.includes('postcard-nickname'));assert(souvenir.includes('&lt;b&gt;小羊&lt;/b&gt;'));assert(!souvenir.includes('>Postcard<'));assert(!souvenir.includes('postcard-stamp'));assert(!souvenir.includes('default-stamp'));assert(souvenir.includes('A LITTLE MOMENT AT HOME'));
 const guest=renderToStaticMarkup(React.createElement(Postcard,{source:'souvenir',playerNickname:'   ',text:'留念'}));assert(guest.includes('一个坏小孩'));
 for(const source of ['player','nest']){const original=renderToStaticMarkup(React.createElement(Postcard,{source,playerNickname:'不应替换',text:'你好'}));assert(original.includes('>Postcard<'));assert(!original.includes('不应替换'))}
});
