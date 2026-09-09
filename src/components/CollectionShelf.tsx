import {useState,type ReactNode} from 'react';
import {Icon} from './Icon';
import {defaultStamp} from '../lib/communityTypes';
import type {CollectedPostcard} from '../lib/collectedPostcards';
import {usePostcardMedia} from '../lib/usePostcardMedia';
import '../collection-shelf.css';

export function CollectedPostcardEntry({card,onOpen,active=true}:{card:CollectedPostcard;onOpen:()=>void;active?:boolean}){
 const picture=usePostcardMedia<HTMLSpanElement>(card.media,active,true),player=card.source==='player';
 const thumbnail=picture.media?.kind==='video'?picture.media.posterUrl:picture.media?.posterUrl||picture.media?.url;
 return <button className="collected-postcard" onClick={onOpen} aria-label={'打开'+(player?'收到的彩蛋明信片':'小窝故事明信片')+'：'+card.text}>
  <span className="collected-postcard-photo" ref={picture.ref}>{thumbnail&&!picture.error?<img key={picture.attempt} src={thumbnail} alt={player?'对方寄来的影像':'故事发生时的小住客'} loading="lazy" decoding="async" onError={picture.imageFailed}/>:<span className="collected-postcard-letter"><span>Postcard</span><small>{picture.loading?'照片正在赶来…':card.media?'点开明信片查看照片':'把一句话，好好收着。'}</small><i/><i/><i/></span>}{card.media&&card.media.kind!=='photo'&&<span className="collected-postcard-motion">{card.media.kind==='gif'?'GIF':'动态影像'}</span>}</span>
  <span className="collected-postcard-body"><span className="collected-postcard-kind">{player?'收到的彩蛋':'小窝故事'}<span>{player?'偶然相遇':'仅自己可见'}</span></span><span className="collected-postcard-text">{card.text}</span>
   <span className="collected-postcard-bottom"><span><small>{player?'来自 · '+(card.signature.trim()||'一个坏小孩'):'来自你的小窝'}</small><time dateTime={card.createdAt}>{new Date(card.createdAt).toLocaleDateString('zh-CN')}</time></span>{player&&card.stampId===defaultStamp.id&&<img className="collected-postcard-stamp" src={defaultStamp.imageUrl} alt={defaultStamp.name}/>}<Icon name="arrow" size={16}/></span>
  </span>
 </button>;
}

export function CollectionShelf({toyCards,toyCount,uniqueCount,postcards,onOpenPostcard,onDraw}:{toyCards:ReactNode;toyCount:number;uniqueCount:number;postcards:CollectedPostcard[];onOpenPostcard:(card:CollectedPostcard)=>void;onDraw:()=>void}){
 const [category,setCategory]=useState<'toys'|'postcards'>('toys');
 return <div className="collection-shelf">
  <div className="collection-shelf-toolbar"><div className="collection-kind-switch" role="tablist" aria-label="卡包分类">{([['toys','玩具',toyCount],['postcards','明信片',postcards.length]] as const).map(([key,label,count],index)=><button key={key} id={'shelf-tab-'+key} role="tab" aria-selected={category===key} aria-controls={'shelf-panel-'+key} tabIndex={category===key?0:-1} onClick={()=>setCategory(key)} onKeyDown={e=>{let next:typeof category|undefined;if(e.key==='ArrowRight'||e.key==='ArrowLeft')next=index?'toys':'postcards';if(e.key==='Home')next='toys';if(e.key==='End')next='postcards';if(next){e.preventDefault();setCategory(next);document.getElementById('shelf-tab-'+next)?.focus()}}}>{label}<span>{count}</span></button>)}</div>
   <p>{category==='toys'?`${uniqueCount} 位扭蛋宝 · ${toyCount} 张卡片`:'小窝故事和收到的彩蛋，都收在这里。'}</p></div>
  <section id="shelf-panel-toys" role="tabpanel" aria-labelledby="shelf-tab-toys" hidden={category!=='toys'}>{toyCount?<div className="collection-grid">{toyCards}</div>:<div className="collection-shelf-empty"><Icon name="bag" size={34}/><h2>第一位扭蛋宝，还在等你</h2><p>抽到的玩具卡会收在这里，重复的也保留。</p><button className="room-pill primary" onClick={onDraw}>去抽扭蛋<Icon name="arrow" size={16}/></button></div>}</section>
  <section id="shelf-panel-postcards" role="tabpanel" aria-labelledby="shelf-tab-postcards" hidden={category!=='postcards'}>{postcards.length?<div className="collected-postcards-grid">{postcards.map(card=><CollectedPostcardEntry key={card.source+':'+card.id} card={card} active={category==='postcards'} onOpen={()=>onOpenPostcard(card)}/>)}</div>:<div className="collection-shelf-empty"><span className="empty-postcard-mark" aria-hidden="true">Postcard</span><h2>还没抽到明信片</h2><p>下一次转动，也许就有一小片生活等你。<br/>这里只收已抽到的明信片，不放创作草稿。</p><button className="room-pill primary" onClick={onDraw}>去抽扭蛋<Icon name="arrow" size={16}/></button></div>}</section>
 </div>;
}
