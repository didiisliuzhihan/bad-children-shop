import {useEffect,useRef,useState} from 'react';
import {defaultStamp} from '../lib/communityTypes';
import type {PostcardMedia} from '../lib/postcardTypes';
import {Icon} from './Icon';
import {usePostcardMedia} from '../lib/usePostcardMedia';
import '../postcard.css';

export function PostcardMediaView({media,active=true}:{media:PostcardMedia;active?:boolean}){
 const picture=usePostcardMedia(media,active),url=picture.media?.url,posterUrl=picture.media?.posterUrl;
 const [loadedImage,setLoadedImage]=useState(''),imageKey=(url||'')+':'+picture.attempt;
 const imageLoading=picture.loading||!!url&&media.kind!=='video'&&loadedImage!==imageKey&&!picture.error;
 const video=useRef<HTMLVideoElement>(null),[playing,setPlaying]=useState(false),[failed,setFailed]=useState(false),generation=useRef(0),allowed=useRef(active),mounted=useRef(false);allowed.current=active;
 useEffect(()=>{generation.current++;setPlaying(false);setFailed(false)},[media.id,url]);
 useEffect(()=>{if(!active){generation.current++;video.current?.pause();setPlaying(false)}},[active]);
 useEffect(()=>{mounted.current=true;const element=video.current,hide=()=>{if(document.hidden){generation.current++;element?.pause();setPlaying(false)}};document.addEventListener('visibilitychange',hide);return()=>{mounted.current=false;generation.current++;element?.pause();document.removeEventListener('visibilitychange',hide)}},[url]);
 const toggle=async()=>{
  const token=++generation.current,element=video.current;
  if(playing){element?.pause();setPlaying(false);return}if(!active||document.hidden)return;setPlaying(true);
  if(media.kind==='video')try{await element?.play();if(!mounted.current||!allowed.current||document.hidden){element?.pause();return}}
  catch{if(token===generation.current&&mounted.current&&allowed.current){setPlaying(false);setFailed(true)}}
 };
 return <div className="postcard-media" ref={picture.ref} aria-busy={imageLoading}>
  {url&&(media.kind==='video'?<video key={picture.attempt} ref={video} src={url} poster={posterUrl} muted playsInline preload="none" onEnded={()=>setPlaying(false)} onPause={()=>setPlaying(false)} onError={picture.imageFailed} aria-label={media.label}/>:<img key={picture.attempt} src={media.kind==='gif'&&!playing?(posterUrl||url):url} alt={media.label} decoding="async" onLoad={()=>setLoadedImage(imageKey)} onError={picture.imageFailed}/>)}
  {imageLoading&&<span className="postcard-media-loading" role="status">照片正在赶来…</span>}
  {url&&media.kind!=='photo'&&!failed&&!picture.error&&<button className="postcard-motion-toggle" onClick={()=>void toggle()} aria-label={playing?'暂停影像':'播放影像'} aria-pressed={playing}><Icon name={playing?'pause':'play'} size={16}/><span>{playing?'暂停':media.kind==='gif'?'GIF':'动态'}<span className="postcard-motion-word"> · {playing?'留在这一刻':'点按播放'}</span></span></button>}
  {(failed||picture.error)&&<div className="postcard-media-error" role="status"><span>影像暂时没有打开，不影响这张明信片的收藏。</span><button className="text-button" onClick={()=>{setFailed(false);picture.retry()}}>重试影像</button></div>}
 </div>;
}

export type PostcardEditorActions={onMedia:()=>void;onMessage:()=>void;onSignature:()=>void;onStamp:()=>void};
export function Postcard({source,text,signature='',media=null,stamped=false,date,active=true,playerNickname,editor}:{source:'player'|'nest'|'souvenir';text:string;signature?:string;media?:PostcardMedia|null;stamped?:boolean;date?:string;active?:boolean;playerNickname?:string;editor?:PostcardEditorActions}){
 const editing=source==='player'?editor:undefined;
 const photo=media?<PostcardMediaView key={media.id} media={media} active={active}/>:<div className="postcard-no-photo"><span>{source==='nest'?'这张旧明信片还没有照片。':'没有照片，'}</span><span>{source==='nest'?'小片段再次发生时，会尝试补拍。':'也可以寄来一句话。'}</span></div>;
 return <article className={'community-postcard'+(source==='player'&&stamped?' is-stamped':'')+(!media?' is-text-only':'')+(editing?' is-editable':'')} data-postcard-source={source} aria-label={source==='player'?'彩蛋明信片'+(editing?'编辑':'预览'):source==='souvenir'?'小窝拍摄留念':'小窝生活明信片预览'}>
  <div className="postcard-photo-side">{editing?<div className="postcard-photo-content">{photo}<button type="button" className="postcard-edit-photo" onClick={editing.onMedia} aria-label="编辑明信片图片：添加照片、动态影像或只留文字" aria-haspopup="dialog"><span><Icon name="camera" size={16}/>{media?.origin==='example'?'示例图 · 点此替换':media?'更换图片':'添加图片'}</span></button></div>:photo}<span className="postcard-photo-caption">{source==='nest'&&media?.sceneMoment==='repeat'?'这个小故事再次发生时':source!=='player'?'A LITTLE MOMENT AT HOME':'A LITTLE MOMENT FOR YOU'}</span></div>
  <div className="postcard-letter-side"><header><span className="postcard-eyebrow">BAD CHILDREN SHOP</span><span className={'postcard-title'+(source==='souvenir'?' postcard-nickname':'')}>{source==='souvenir'?playerNickname?.trim()||'一个坏小孩':'Postcard'}</span><span className="postcard-source">{source!=='player'?'来自你的小窝':'给另一位坏小孩'}</span></header>
   {editing?<button type="button" className="postcard-edit-message" onClick={editing.onMessage} aria-label="编辑明信片文字：选择一句或自己输入" aria-haspopup="dialog"><span className="postcard-message">{text||'留一句话，让抽到它的人偷偷开心一下。'}</span><small><Icon name="edit" size={14}/>点文字，选一句或自己写</small></button>:<p className="postcard-message">{text||'留一句话，让它替你去遇见另一个坏小孩。'}</p>}
   <footer><div className="postcard-signature">{editing?<button type="button" className="postcard-edit-signature" onClick={editing.onSignature} aria-label="修改明信片落款" aria-haspopup="dialog">来自 · {signature.trim()||'一个坏小孩'}<Icon name="edit" size={14}/></button>:source==='player'?`来自 · ${signature.trim()||'一个坏小孩'}`:'把这一刻，留给你。'}{date&&<time dateTime={date}>{new Date(date).toLocaleDateString('zh-CN')}</time>}</div>
    {editing?<button type="button" className={'postcard-edit-stamp'+(stamped?' has-stamp':'')} onClick={editing.onStamp} aria-label={stamped?'更换明信片印章':'选择明信片印章'} aria-haspopup="dialog"><span className="postcard-stamp"><img src={defaultStamp.imageUrl} alt="羊女孩默认印章"/></span><small>{stamped?'更换印章':'点此盖戳'}</small></button>:source==='player'&&stamped&&<span className="postcard-stamp" aria-label={defaultStamp.name}><img src={defaultStamp.imageUrl} alt="羊女孩默认印章"/></span>}
   </footer>
  </div>
 </article>;
}
