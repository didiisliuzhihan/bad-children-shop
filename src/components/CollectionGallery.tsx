import {useCallback,useEffect,useState} from 'react';
import type {Capsule,Toy} from '../types';
import {Icon} from './Icon';
import {Tagline} from './Tagline';
import {ToyRoom} from './ToyRoom';
function CollectionCard({item,toy,onOpen}:{item:Capsule;toy:Toy;onOpen:()=>void}){
 const[failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[toy.icon_url,toy.card_image_url]);
 return <article className="toy-card collection-entry" style={{'--toy-color':toy.color} as React.CSSProperties}>
  <button className={'card-image'+(toy.card_image_url?' has-artwork':'')} onClick={onOpen} aria-label={'查看 '+toy.name_zh+'的收藏卡片'}><div className="card-series">THE LITTLE MISFITS<span>{toy.number}</span></div>{failed?<span className="toy-image-fallback"><Icon name="heart" size={36}/><small>{toy.name_zh}</small></span>:<img src={toy.card_image_url||toy.icon_url} loading="lazy" decoding="async" alt={toy.name_zh} onError={()=>setFailed(true)}/>}</button>
  <div className="card-content"><div className="card-name"><h3>{toy.name_zh}</h3><span>{toy.name_en}</span></div><Tagline toy={toy}/>
   <div className="card-actions"><button onClick={onOpen}>查看玩具<Icon name="arrow" size={15}/></button><button className="save-card" onClick={onOpen} aria-label={'保存 '+toy.name_zh+'的卡片'}><Icon name="download" size={17}/><span>保存卡片</span></button></div>
   <time className="card-date" dateTime={item.obtained_at}>{new Date(item.obtained_at).toLocaleDateString('zh-CN')}</time>
  </div>
 </article>;
}
export function Collection({items,toys,mode,onClose,toast}:{items:Capsule[];toys:Toy[];mode:string;onClose:()=>void;toast:(s:string)=>void}){
 const[selected,setSelected]=useState<{toy:Toy;item:Capsule}|null>(null);
 const close=useCallback(()=>setSelected(null),[]);
 return <section className="collection-view" aria-label="我的扭蛋包">
  <header className="collection-header"><button className="text-button" onClick={onClose}><Icon name="back"/>返回机器</button><h1>我的扭蛋包<span>{items.length}</span></h1></header>
  {items.length?<div className="collection-grid">{items.map(item=>{const toy=toys.find(t=>t.id===item.toy_id);return toy?<CollectionCard key={item.id} item={item} toy={toy} onOpen={()=>setSelected({toy,item})}/>:null})}</div>:<div className="empty-bag"><Icon name="bag" size={45}/><p>扭蛋包还是空的</p><button className="pill-button dark" onClick={onClose}>去抽扭蛋<Icon name="arrow"/></button></div>}
  <footer className="collection-footer"><span><i className={'status-dot '+(mode==='cloud'?'online':'')}/>{mode==='cloud'?'云端已连接':'收藏保存在本机'}</span><span>模型解锁进度保存在当前浏览器</span></footer>
  {selected&&<ToyRoom key={selected.toy.id} toy={selected.toy} item={selected.item} onClose={close} toast={toast}/>}
 </section>;
}
