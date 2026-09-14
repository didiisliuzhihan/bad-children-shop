import {ChineseOnly} from './ChineseOnly';
import {tx,useLanguage,dateLabel} from '../lib/i18n';
import {useState} from 'react';
import type {Toy,Capsule} from '../types';

/** Native image + selectable text: viewing never waits for an export or font. */
export function CollectibleCardPreview({toy,item,active,onImageReady}:{toy:Toy;item:Capsule;active:boolean;onImageReady:()=>void}){
 useLanguage();
 const [failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 const [statement,...task]=toy.tagline_zh.replace(/（任务）|\(任务\)/g,'').split(/——|—|--/);
 return <article className={'collectible-live-card'+(toy.card_image_url?' has-art':'')} aria-label={tx(toy.name_zh+'收藏卡片')}>
  <div className="collectible-live-art" style={{background:toy.color}}>
   {tx(active&&!failed&&<img key={retry} src={toy.card_image_url||toy.icon_url} alt={tx(toy.name_zh+'卡面')} decoding="async" onLoad={onImageReady} onError={()=>setFailed(true)}/>)}
   {tx(failed&&<div className="card-art-error"><span>{tx("卡面暂时没能加载，文字仍可查看。")}</span><button className="text-button" onClick={()=>{setFailed(false);setRetry(n=>n+1)}}>{tx("重试卡面")}</button></div>)}
   <span className="collectible-live-brand">THE LITTLE MISFITS</span><span className="collectible-live-number">{tx(toy.number)}</span>
  </div>
  <div className="collectible-live-copy"><h3>{tx(toy.name_zh)}</h3><ChineseOnly><p className="collectible-live-english">{tx(toy.name_en)}</p></ChineseOnly><hr/><p>{tx(statement)}</p><p className="collectible-live-task">{tx(task.join('——').trim())}</p><time dateTime={item.obtained_at}>{tx(dateLabel(item.obtained_at))}</time></div>
 </article>;
}
