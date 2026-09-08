import {useCallback,useEffect,useRef,useState} from 'react';
import {asset,fallbackToys} from '../assets';
import type {Capsule,Toy} from '../types';
import draft from '../../assets/drafts/toy04/catalog-preview.json';
import {Collection} from './CollectionGallery';
import {ToyRoom} from './ToyRoom';
import {Icon,BrandMark} from './Icon';
import {installAudioStart,isAudioReady,observeAudioReady,setMuted,startBackground} from '../lib/audio';
const popcorn:Toy={...draft,story_en:'',model_url:'/preview/toy4.glb',icon_url:'/preview/toy4-front.png',card_image_url:'/preview/toy4-card.png',story_image_url:'/preview/toy4-story.jpg',audio_url:'/preview/toy4-voice.mp3'};
const toys=[...fallbackToys.filter(toy=>toy.id!==popcorn.id),popcorn];
const items:Capsule[]=toys.map(toy=>({id:'preview-'+toy.id,toy_id:toy.id,obtained_at:'2026-09-07T12:00:00Z',synced:false}));
/** Explicit loopback-only preview, with fictional capsules and isolated quest storage.
 * Never authenticates, reads cloud collections or writes catalog/capsule data.
 */
export function CollectionPreview(){
 const [initial,setInitial]=useState(true),[muted,setMute]=useState(false),[audioReady,setReady]=useState(isAudioReady),[message,setMessage]=useState('');
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{const stop=installAudioStart(asset('studio-loop.wav'),asset('nest-fireplace-asmr.mp3')),unobserve=observeAudioReady(setReady);return()=>{stop();unobserve();if(timer.current)clearTimeout(timer.current)}},[]);
 const close=useCallback(()=>setInitial(false),[]);
 const toast=useCallback((s:string)=>{setMessage(s);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setMessage(''),3500)},[]);
 return <main className="shop is-entered preview-shop">
  <header className="topbar"><div className="brand"><BrandMark/><span>BAD CHILDREN<br/>SHOP</span></div><span className="preview-label">本地预览 · 不影响正式收藏</span><button className="icon-button" data-audio-toggle aria-label={muted?'打开音乐':audioReady?'静音音乐':'开启声音'} onClick={()=>{const next=audioReady?!muted:false;setMute(next);setMuted(next);if(!next)void startBackground(asset('studio-loop.wav'))}}><Icon name={muted?'mute':'sound'}/></button></header>
  <Collection items={items} toys={toys} mode="local" onClose={()=>{location.href='http://127.0.0.1:4173/'}} toast={toast}/>
  {initial&&<ToyRoom toy={popcorn} item={items[3]} onClose={close} toast={toast}/>}
  <div className={'toast '+(message?'show':'')} role="status">{message}</div>
 </main>;
}
