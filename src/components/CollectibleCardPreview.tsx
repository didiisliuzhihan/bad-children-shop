import {useState} from 'react';
import type {Toy,Capsule} from '../types';

/** Native image + selectable text: viewing never waits for an export or font. */
export function CollectibleCardPreview({toy,item,active,onImageReady}:{toy:Toy;item:Capsule;active:boolean;onImageReady:()=>void}){
 const [failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 const [statement,...task]=toy.tagline_zh.replace(/（任务）|\(任务\)/g,'').split(/——|—|--/);
 return <article className={'collectible-live-card'+(toy.card_image_url?' has-art':'')} aria-label={toy.name_zh+'收藏卡片'}>
  <div className="collectible-live-art" style={{background:toy.color}}>
   {active&&!failed&&<img key={retry} src={toy.card_image_url||toy.icon_url} alt={toy.name_zh+'卡面'} decoding="async" onLoad={onImageReady} onError={()=>setFailed(true)}/>}
   {failed&&<div className="card-art-error"><span>卡面暂时没能加载，文字仍可查看。</span><button className="text-button" onClick={()=>{setFailed(false);setRetry(n=>n+1)}}>重试卡面</button></div>}
   <span className="collectible-live-brand">THE LITTLE MISFITS</span><span className="collectible-live-number">{toy.number}</span>
  </div>
  <div className="collectible-live-copy"><h3>{toy.name_zh}</h3><p className="collectible-live-english">{toy.name_en}</p><hr/><p>{statement}</p><p className="collectible-live-task">{task.join('——').trim()}</p><time dateTime={item.obtained_at}>{new Date(item.obtained_at).toLocaleDateString('zh-CN')}</time></div>
 </article>;
}
