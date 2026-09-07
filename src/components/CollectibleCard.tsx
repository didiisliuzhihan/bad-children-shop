import {useEffect,useState} from 'react';
import type {Capsule,Toy} from '../types';
import {renderCollectibleCard} from '../lib/cardExport';
import {Icon} from './Icon';
type Props={toy:Toy;item:Capsule;toast:(s:string)=>void;onConfirmSaved:()=>boolean;questStage:string};
/** The very same decoded PNG is previewed, shared and downloaded. */
export function CollectibleCard({toy,item,toast,onConfirmSaved,questStage}:Props){
 const[ready,setReady]=useState<{file:File;url:string}|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0),[sharing,setSharing]=useState(false),[saveHint,setSaveHint]=useState('');
 useEffect(()=>{
  let alive=true,url:string|undefined;setReady(null);setError(false);setSaveHint('');
  void renderCollectibleCard(toy,item).then(blob=>{if(!alive)return;url=URL.createObjectURL(blob);setReady({file:new File([blob],`bad-children-${toy.id}.png`,{type:'image/png'}),url})}).catch(()=>{if(alive)setError(true)});
  return()=>{alive=false;if(url){const old=url;setTimeout(()=>URL.revokeObjectURL(old),1500)}};
 },[toy,item,retry]);
 const save=()=>{
  if(!ready||sharing)return;setSaveHint('');
  // Do not generate or await before invoking the native share in this gesture.
  if(navigator.canShare?.({files:[ready.file]})&&matchMedia('(pointer:coarse)').matches){
   setSharing(true);void navigator.share({files:[ready.file],title:'我的扭蛋收藏'}).then(()=>setSaveHint('保存后，点下方确认，让小任务出发。')).catch(error=>setSaveHint(error.name==='AbortError'?'已取消；保存后再确认就好。':'也可以长按上方完整卡片，保存到相册。')).finally(()=>setSharing(false));
  }else{
   try{const a=document.createElement('a');a.href=ready.url;a.download=ready.file.name;document.body.append(a);a.click();a.remove();setSaveHint('下载已发起；确认保存后，再让小任务出发。')}
   catch{setSaveHint('下载未能打开，也可以长按上方图片保存。')}
  }
 };
 const confirm=()=>{
  if(!ready||sharing)return;
  if(onConfirmSaved()){setSaveHint('任务出发啦，做完小事再回来看看它。');toast('做完小任务，回来敲敲玻璃吧。')}
  else setSaveHint('进度未能保存，请检查浏览器存储设置后再试。');
 };
 return <div className="collectible-card-panel">
  <div className="export-preview" aria-busy={!ready&&!error}>
   {ready?<img src={ready.url} alt={toy.name_zh+'完整收藏卡片，包含任务和收藏日期'} width={1080} height={1440}/>:error?<div className="export-status"><p>图片或字体未能加载，请重试。</p><button className="room-pill" onClick={()=>setRetry(n=>n+1)}>重新生成</button></div>:<div className="export-status" role="status"><span className="loading-ring"/><p>正在准备完整卡片…</p></div>}
  </div>
  <div className="card-save-actions"><button className="room-pill" disabled={!ready||sharing} onClick={save}><Icon name="download" size={17}/>{sharing?'正在打开分享…':'保存卡片'}</button><span>3:4 · 可长按保存</span></div>
  <div className="quest-confirm" data-confirm-state={questStage}>
   {questStage==='unsaved'?<><p>把卡片带走，再去完成那件小事。</p><button className="room-pill primary" disabled={!ready||sharing} onClick={confirm}>已保存，去做任务<Icon name="arrow" size={16}/></button></>:questStage==='waiting'?<><span className="quest-status-dot"/><p>小任务已经出发</p><small>做完小任务，去模型页敲敲玻璃吧。</small></>:<><Icon name={questStage==='unlocked'?'check':'heart'} size={17}/><p>{questStage==='unlocked'?'你们已经更亲近了一点':'小任务做完了么？去模型页看看它吧。'}</p></>}
  </div>
  {saveHint&&<p className="card-save-hint" role="status">{saveHint}</p>}
 </div>;
}
