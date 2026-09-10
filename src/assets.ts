import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import decoderSource from 'three/examples/jsm/libs/draco/gltf/draco_decoder.js?raw';
import type { Toy } from './types';
import {NEST_TAP_FILES} from './lib/nestTapCatalog.mjs';
import {RESIDENT_RELEASE_FILES,residentExpansionToys} from './lib/residentExpansion.mjs';

// The local preview supplies this marker. Published HTML continues to use Storage.
export const localPreview=!!document.querySelector('meta[name="bc-local-preview"]');
const previewBase=document.querySelector<HTMLMetaElement>('meta[name="bc-asset-base"]')?.content;
export const cloudAssets=!localPreview&&!!import.meta.env.VITE_ASSET_BASE_URL;
export const assetBase=new URL(previewBase||import.meta.env.VITE_ASSET_BASE_URL||(import.meta.env.DEV?'./assets/delivery/':'../assets/delivery/'),location.href).href.replace(/\/$/,'');
// New room assets ship atomically with the Pages release; existing media stays
// on Storage. Local previews continue reading the same delivery originals.
const releaseAssets=new Set(['room_furnished_nest.glb','nest-fireplace-asmr.mp3','default-stamp-white.png',...NEST_TAP_FILES,...RESIDENT_RELEASE_FILES]);
export const asset=(name:string)=>!localPreview&&!import.meta.env.DEV&&releaseAssets.has(name)?new URL('./assets/delivery/'+encodeURIComponent(name),location.href).href:`${assetBase}/${encodeURIComponent(name)}`;
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
  story_note:'张鸡毛的尾巴翘得很高，心却软得一塌糊涂。它说自己已经被驯服100%，但只愿意听喜欢的人的话。今天的任务：给那个让你开心的人，买一杯奶茶。',
  story_en:'',
  model_url:asset('toy_jimao.glb'),icon_url:asset('toy_jimao.png'),audio_url:sourceLink('toy1 jimao.mp3'),story_image_url:sourceLink('toy1 jimao.jpg'),color:'#e9c28b'
},{
  id:'kuku_sunflower',number:'02',name_en:'Kuku Sunflower',name_zh:'哭哭葵',
  tagline_en:'You forgot to water me, I got emo — pat my head this week',tagline_zh:'你忘了给葵浇水，葵emo了——这周记得摸摸葵的脑袋。',
  story_text:'不枯不枯',
  story_note:'下雨的时候，它穿着绿色雨靴等你。天晴了，它还是会掉一点眼泪。不是所有的眼泪都因为难过，也可能是想你。今天的任务：摸摸它的脑袋，告诉它，慢慢长大也没关系。',
  story_en:'',
  model_url:asset('toy_kuku_sunflower.glb'),icon_url:asset('toy_kuku_sunflower.png'),audio_url:sourceLink('toy2 emok.mp3'),story_image_url:sourceLink('toy2 emok.jpg'),color:'#d6deb7'
},{
  id:'stressed_jimao',number:'03',name_en:'Stressed Jimao',name_zh:'抗压鸡毛',
  tagline_en:"Says it's fine. Forecast: thunderstorms — do one little thing for Jimao this week.",
  tagline_zh:'嘴上说着没事，头顶已经打雷——这周帮小鸡毛做一件小事叭',
  story_text:'你看我还好吗？',
  story_note:'抗压鸡毛头顶的天气预报，十次有九次是局部雷阵雨。闪电都连到脑袋上了，它还咧着嘴说：“问题不大。”可那对快合上的眼皮，早就替它举了白旗。这周帮小鸡毛做一件小事叭。让它也歇一歇，等脑袋里的小雷雨下完。',
  story_en:'',color:'#d5deea',
  model_url:asset('toy_stressed_jimao.glb'),icon_url:asset('toy_stressed_jimao.png'),
  card_image_url:asset('toy_stressed_jimao_card.png'),
  audio_url:sourceLink('toy3_stressed_jimao_voice.mp3'),story_image_url:sourceLink('toy3_stressed_jimao_story.jpg')
},{
  id:'miss_popcorn',number:'04',name_en:'Miss Popcorn',name_zh:'爆米花· 幽怨女仆',
  tagline_zh:'今天又惹爆米花小姐不得劲了——惹怒她记得说“别急，你好漂亮”',
  tagline_en:"Miss Popcorn is displeased again. If you upset her, say, “Don't fret. You look so pretty.”",
  story_text:'今天的家务额度已经用完了。',
  story_note:'爆米花把钥匙挂得叮当响，像在宣布今天正式罢工。可每次说着“下次不管你了”，它又悄悄把你喜欢的杯子摆好。它的幽怨不是不喜欢你，只是今天也想轮到自己被照顾。',
  story_en:'',color:'#f4dc8e',
  model_url:asset('toy_popcorn_maid.glb'),icon_url:asset('toy_popcorn_maid.png'),card_image_url:asset('toy_popcorn_maid_card.png'),
  audio_url:sourceLink('toy4_popcorn_voice.mp3'),story_image_url:sourceLink('toy4_popcorn_story.jpg')
},{
  id:'tired_crow',number:'05',name_en:'Whatever Dua',name_zh:'我没招了鸦',
  tagline_zh:'你问肥宅鸦怎么办，鸦也想问你——今天陪鸦理直气壮地歇一会儿',
  tagline_en:'You ask Dua what to do. Dua was about to ask you.',
  story_text:'办法还没想好，坐姿已经摆好了。',
  story_note:'鸦把毛巾裹好，往红椅子里一瘫，宣布今天的脑袋暂不接单。海浪都追到脚边了，它只慢吞吞地抬了抬爪子。你问它怎么办，它挪出一点位置：要不，你也坐会儿？有些答案可以晚点再想，歇一歇这件事，倒是现在就能一起做。',
  story_en:'',color:'#cadfdf',
  model_url:asset('toy_tired_crow.glb'),icon_url:asset('toy_tired_crow.png'),card_image_url:asset('toy_tired_crow_card.png'),
  audio_url:sourceLink('toy5_whatever_dua_voice.mp3'),story_image_url:sourceLink('toy5_whatever_dua_story.jpg')
},...residentExpansionToys(asset)];
