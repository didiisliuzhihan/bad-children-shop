import {useEffect,useRef,useState} from 'react';
import {renderNestKeepsake} from '../lib/nestPhotoExport';
import type {CapturedNestPhoto} from '../lib/nestCapture';
import type {PostcardMedia} from '../lib/postcardTypes';
import {postcardCaption} from '../lib/postcardDraft';
import {Modal} from './Modal';
import {Postcard} from './Postcard';
import {Icon} from './Icon';

/** A local keepsake, never a player submission or an event-generated story reward. */
export function NestPhotoDialog({photo,playerNickname,onClose}:{photo:CapturedNestPhoto;playerNickname?:string;onClose:()=>void}){
 const card=useRef<HTMLDivElement>(null);
 const [media,setMedia]=useState<PostcardMedia|null>(null),[ready,setReady]=useState<{url:string;file:File}|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[sharing,setSharing]=useState(false),[hint,setHint]=useState('');
 const mounted=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 useEffect(()=>{
  const url=URL.createObjectURL(photo.blob);
  setMedia({id:photo.createdAt,kind:'photo',url,width:960,height:960,label:'刚刚拍下的小窝',origin:'nest-capture'});
  return()=>URL.revokeObjectURL(url);
 },[photo]);
 useEffect(()=>{
  if(!media)return;
  let alive=true,exportUrl:string|undefined;setReady(null);setError('');setHint('');
  void (async()=>{
   const node=card.current;
   if(!alive||!node)return;
   const blob=await renderNestKeepsake({photo:photo.blob,nickname:playerNickname,text:postcardCaption(photo.timeOfDay,photo.residentIds.length),date:photo.createdAt,layout:node.getBoundingClientRect().width>580?'landscape':'portrait'});
   if(!alive)return;if(!blob?.size)throw Error('明信片没有生成成功。');
   exportUrl=URL.createObjectURL(blob);
   setReady({url:exportUrl,file:new File([blob],'我的小窝-'+photo.createdAt.slice(0,10)+'.png',{type:'image/png'})});
  })().catch(cause=>{if(alive)setError(cause instanceof Error?cause.message:'完整明信片暂时没有生成好，请重试。')});
  return()=>{alive=false;if(exportUrl)URL.revokeObjectURL(exportUrl)};
 },[media,photo,playerNickname,retry]);
 const save=()=>{
  if(!ready||sharing)return;setHint('');
  if(navigator.canShare?.({files:[ready.file]})&&matchMedia('(pointer:coarse)').matches){
   setSharing(true);
   void navigator.share({files:[ready.file],title:'我的小窝留念'}).then(()=>{if(mounted.current)setHint('喜欢这一刻，就把它留在相册里。')}).catch(error=>{if(mounted.current)setHint(error.name==='AbortError'?'已取消，明信片还在这里。':'也可以长按上方明信片，保存到相册。')}).finally(()=>{if(mounted.current)setSharing(false)});
  }else{
   try{const link=document.createElement('a');link.href=ready.url;link.download=ready.file.name;document.body.append(link);link.click();link.remove();setHint('下载已发起，也可以长按明信片保存。')}
   catch{setHint('下载没有打开，也可以长按明信片保存。')}
  }
 };
 return <Modal label="小窝拍摄留念" className="nest-photo-modal" onClose={onClose}>
  <header className="nest-photo-heading"><h2>留住这一刻</h2><p>拍一张，给自己留念。</p></header>
  <div ref={card} className="nest-photo-preview" aria-busy={!ready&&!error}>
   {ready?<img className="nest-photo-result" src={ready.url} alt={'小窝留念明信片 · '+(playerNickname?.trim()||'一个坏小孩')}/>:<div>{media&&<Postcard source="souvenir" playerNickname={playerNickname} text={postcardCaption(photo.timeOfDay,photo.residentIds.length)} media={media} date={photo.createdAt}/>}</div>}
  </div>
  <div className="nest-photo-save-actions"><button className="room-pill" disabled={!ready||sharing} onClick={save}><Icon name="download" size={17}/>{sharing?'正在打开分享…':'保存明信片'}</button><button className="room-pill" onClick={onClose}>回小窝</button></div>
  {!ready&&!error&&<p className="nest-photo-hint" role="status">正在准备完整明信片…</p>}
  {error&&<div className="nest-photo-hint" role="alert"><p>{error}</p><button className="text-button" onClick={()=>setRetry(n=>n+1)}>重新生成</button>{media&&<a href={media.url} download="我的小窝照片.jpg">保存原照片</a>}</div>}
  {hint&&<p className="nest-photo-hint" role="status">{hint}</p>}
  <p className="nest-photo-hint">仅供自己留念，不会投进扭蛋池。{!playerNickname?.trim()&&'未登录，暂用「一个坏小孩」作为昵称。'}</p>
 </Modal>;
}

