import {useEffect,useState} from 'react';
import type {Capsule,Toy} from '../types';
import {renderCollectibleCard} from '../lib/cardExport';
import {Modal} from './Modal';
import {Icon} from './Icon';

export function CardExportDialog({toy,item,onClose,toast}:{toy:Toy;item:Capsule;onClose:()=>void;toast:(s:string)=>void}){
  const[ready,setReady]=useState<{file:File;url:string}|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0),[sharing,setSharing]=useState(false);
  useEffect(()=>{
    let alive=true,url:string|undefined;setReady(null);setError(false);
    void renderCollectibleCard(toy,item).then(blob=>{
      if(!alive)return;url=URL.createObjectURL(blob);setReady({file:new File([blob],`bad-children-${toy.id}.png`,{type:'image/png'}),url});
    }).catch(()=>{if(alive)setError(true)});
    return()=>{alive=false;if(url){const old=url;setTimeout(()=>URL.revokeObjectURL(old),1500)}};
  },[toy,item,retry]);
  const save=()=>{
    if(!ready||sharing)return;
    // No image generation/await before share: preserve iOS's fresh user activation.
    if(navigator.canShare?.({files:[ready.file]})&&matchMedia('(pointer:coarse)').matches){
      setSharing(true);void navigator.share({files:[ready.file],title:'我的扭蛋收藏'}).then(()=>onClose()).catch(error=>{if(error.name!=='AbortError')toast('可以长按预览图片，选择保存到相册。')}).finally(()=>setSharing(false));
    }else{
      const a=document.createElement('a');a.href=ready.url;a.download=ready.file.name;document.body.append(a);a.click();a.remove();toast('图片已准备好，也可长按预览保存。');
    }
  };
  return <Modal label="保存收藏卡片" onClose={onClose} className="save-modal">
    <h2>保存收藏卡片</h2>
    <div className="export-preview" aria-busy={!ready&&!error}>
      {ready?<img src={ready.url} alt={toy.name_zh+'收藏卡片预览'} width={1080} height={1440}/>:error?<div className="export-status"><p>图片或字体未能加载，请重试。</p><button className="pill-button dark" onClick={()=>setRetry(n=>n+1)}>重新生成</button></div>:<div className="export-status" role="status"><span className="loading-ring"/><p>正在准备完整图片…</p></div>}
    </div>
    <p className="export-help">3:4 · 1080 × 1440<br/>也可以长按上方图片保存</p>
    <button className="pill-button dark export-save" disabled={!ready||sharing} onClick={save}><Icon name="download"/>{sharing?'正在打开分享…':ready?'保存图片':'正在准备…'}</button>
  </Modal>;
}
