import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import decoderSource from 'three/examples/jsm/libs/draco/gltf/draco_decoder.js?raw';
import type { Toy } from './types';

// The local preview supplies this marker. Published HTML continues to use Storage.
export const localPreview=!!document.querySelector('meta[name="bc-local-preview"]');
const previewBase=document.querySelector<HTMLMetaElement>('meta[name="bc-asset-base"]')?.content;
export const cloudAssets=!localPreview&&!!import.meta.env.VITE_ASSET_BASE_URL;
export const assetBase=new URL(previewBase||import.meta.env.VITE_ASSET_BASE_URL||(import.meta.env.DEV?'./assets/delivery/':'../assets/delivery/'),location.href).href.replace(/\/$/,'');
export const asset=(name:string)=>`${assetBase}/${encodeURIComponent(name)}`;
for(const [family,file,weight] of [['Fredoka','fredoka.woff2','300 700'],['Inter','inter.woff2','100 900']]){
 const face=new FontFace(family,`url("${asset(file)}")`,{weight,display:'swap'});document.fonts.add(face);void face.load().catch(()=>{});
}
export const sourceLink=asset;
// Decoder JavaScript belongs to the single HTML bundle. Its Blob is local generated code,
// not an external .js request and not an inline binary asset.
const decoder=new DRACOLoader();
decoder.setWorkerLimit(2);
const decoderBlob=URL.createObjectURL(new Blob([decoderSource],{type:'application/javascript'}));
decoder.setDecoderPath({js:decoderBlob,wasm:''});
(decoder as unknown as {decoderConfig:{type:string};decoderPaths:{dep_js:string}}).decoderConfig={type:'js'};
(decoder as unknown as {decoderPaths:{dep_js:string}}).decoderPaths.dep_js=decoderBlob;
const loader=new GLTFLoader();loader.setDRACOLoader(decoder);
const pending=new Map<string,Promise<GLTF>>();
export function loadModel(url:string,onProgress?:(percent:number)=>void){
  if(!pending.has(url))pending.set(url,loader.loadAsync(url,e=>onProgress?.(e.total?e.loaded/e.total*100:35)).catch(e=>{pending.delete(url);throw e}));
  return pending.get(url)!;
}
export function releaseModel(url:string){
  const promise=pending.get(url); if(!promise)return;
  pending.delete(url);promise.then(g=>g.scene.traverse(o=>{const mesh=o as import('three').Mesh;if(mesh.isMesh){mesh.geometry.dispose();const ms=Array.isArray(mesh.material)?mesh.material:[mesh.material];ms.forEach(m=>m.dispose())}})).catch(()=>{});
}
export const fallbackToys:Toy[]=[{
  id:'jimao',number:'01',name_en:'Zhang Jimao – 100% Tamed',name_zh:'张鸡毛 · 驯服100%',
  tagline_en:"So happy, I'm so proud right now — buy me a bubble tea today",tagline_zh:'开心开心，我太有面子了——今天给你买一杯奶茶。',
  story_text:'我是你们的皇后',
  story_en:'',
  model_url:asset('toy_jimao.glb'),icon_url:asset('toy_jimao.png'),audio_url:sourceLink('toy1 jimao.mp3'),story_image_url:sourceLink('toy1 jimao.jpg'),color:'#e9c28b'
},{
  id:'kuku_sunflower',number:'02',name_en:'Kuku Sunflower',name_zh:'哭哭葵',
  tagline_en:'You forgot to water me, I got emo — pat my head this week',tagline_zh:'你忘了给葵浇水，葵emo了——这周记得摸摸葵的脑袋。',
  story_text:'不枯不枯',
  story_en:'',
  model_url:asset('toy_kuku_sunflower.glb'),icon_url:asset('toy_kuku_sunflower.png'),audio_url:sourceLink('toy2 emok.mp3'),story_image_url:sourceLink('toy2 emok.jpg'),color:'#d6deb7'
}];
