import {useCallback,useEffect,useRef,useState} from 'react';
import type {Capsule,Toy} from '../types';
import {prepareCollectibleCard,cachedCollectibleCard,collectibleCardKey} from '../lib/cardExport';
import {CollectibleCardPreview} from './CollectibleCardPreview';
import {Icon} from './Icon';
type Props={toy:Toy;item:Capsule;active?:boolean;toast:(s:string)=>void;onConfirmSaved:()=>boolean|Promise<boolean>;questStage:string};
export function CollectibleCard({toy,item,active=true,toast,onConfirmSaved,questStage}:Props){
 const key=collectibleCardKey(toy,item),generation=useRef(0),url=useRef<string|null>(null),inflight=useRef<string|null>(null);
 const [ready,setReady]=useState<{key:string;file:File;url:string}|null>(null),[error,setError]=useState(false),[preparing,setPreparing]=useState(false),[imageReady,setImageReady]=useState(false),[sharing,setSharing]=useState(false),[saveHint,setSaveHint]=useState('');
 const current=ready?.key===key?ready:null;
 const publish=useCallback((blob:Blob)=>{if(url.current)URL.revokeObjectURL(url.current);url.current=URL.createObjectURL(blob);setReady({key,file:new File([blob],'bad-children-'+toy.id+'.png',{type:'image/png'}),url:url.current})},[key]);
 useEffect(()=>{generation.current++;inflight.current=null;setError(false);setPreparing(false);setImageReady(false);setSaveHint('');
  const cached=cachedCollectibleCard(key);if(cached)publish(cached);
  return()=>{generation.current++;inflight.current=null;const old=url.current;url.current=null;if(old)setTimeout(()=>URL.revokeObjectURL(old),1500)};
 },[key,publish]);
 const prepare=useCallback(async()=>{
  if(inflight.current===key)return;const turn=generation.current;inflight.current=key;setPreparing(true);setError(false);
  try{const blob=await prepareCollectibleCard(toy,item);if(turn===generation.current)publish(blob)}
  catch{if(turn===generation.current){setError(true);setSaveHint('高清卡片暂时没准备好，不影响查看。可以稍后重试。')}}
  finally{if(turn===generation.current){inflight.current=null;setPreparing(false)}}
 },[key,publish]);
 useEffect(()=>{
  if(!active||!imageReady||current||error)return;
  // Hidden tabs do no work. Let the first image/text paint and input settle first.
  if(typeof requestIdleCallback==='function'){const id=requestIdleCallback(()=>void prepare(),{timeout:2000});return()=>cancelIdleCallback(id)}
  const id=setTimeout(()=>void prepare(),350);return()=>clearTimeout(id);
 },[active,imageReady,key,!!current,error,prepare]);
 const [confirming,setConfirming]=useState(false);
 const save=()=>{
  if(!current||sharing)return;setSaveHint('');
  // Prepared in advance: native share still runs within this user gesture.
  if(navigator.canShare?.({files:[current.file]})&&matchMedia('(pointer:coarse)').matches){
   setSharing(true);void navigator.share({files:[current.file],title:'我的扭蛋收藏'}).then(()=>setSaveHint('保存后，点下方确认，让小任务出发。')).catch(error=>setSaveHint(error.name==='AbortError'?'已取消；保存后再确认就好。':'也可以长按上方完整卡片，保存到相册。')).finally(()=>setSharing(false));
  }else{
   try{const a=document.createElement('a');a.href=current.url;a.download=current.file.name;document.body.append(a);a.click();a.remove();setSaveHint('下载已发起；确认保存后，再让小任务出发。')}
   catch{setSaveHint('下载未能打开，也可以长按上方图片保存。')}
  }
 };
 const confirm=async()=>{
  if(!current||sharing||confirming)return;setConfirming(true);
  try{if(await onConfirmSaved()){setSaveHint('任务出发啦，做完小事再回来看看它。');toast('做完小任务，回来敲敲玻璃吧。')}else setSaveHint('进度未能保存，请检查连接或浏览器存储设置后重试。')}
  catch{setSaveHint('进度暂时没有确认，请重试。已保存的进度不会重置。')}finally{setConfirming(false)}
 };
 return <div className="collectible-card-panel">
  <div className="export-preview">{current?<img src={current.url} alt={toy.name_zh+'完整收藏卡片，包含任务和收藏日期'} width={1080} height={1440}/>:<CollectibleCardPreview key={key} toy={toy} item={item} active={active} onImageReady={()=>setImageReady(true)}/>}</div>
  <div className="card-save-actions"><button className="room-pill" disabled={preparing||sharing||confirming} onClick={current?save:()=>void prepare()}><Icon name="download" size={17}/>{sharing?'正在打开分享…':preparing?'正在准备高清卡片…':current?'保存卡片':error?'重试高清卡片':'准备高清卡片'}</button><span>{current?'3:4 · 可长按保存':'可先查看画面和文字'}</span></div>
  <div className="quest-confirm" data-confirm-state={questStage}>
   {questStage==='unsaved'?<><p>把卡片带走，再去完成那件小事。</p><button className="room-pill primary" disabled={!current||sharing||confirming} onClick={()=>void confirm()}>{confirming?'正在保存进度…':'已保存，去做任务'}<Icon name="arrow" size={16}/></button></>:questStage==='waiting'?<><span className="quest-status-dot"/><p>小任务已经出发</p><small>做完小任务，去模型页敲敲玻璃吧。</small></>:<><Icon name={questStage==='unlocked'?'check':'heart'} size={17}/><p>{questStage==='unlocked'?'你们已经更亲近了一点':'小任务做完了么？去模型页看看它吧。'}</p></>}
  </div>
  {saveHint&&<p className="card-save-hint" role="status">{saveHint}</p>}
 </div>;
}
