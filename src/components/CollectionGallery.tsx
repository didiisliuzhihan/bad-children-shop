import {useCallback,useEffect,useState} from 'react';
import {useAccount} from '../lib/AccountContext';
import type {Capsule,Toy} from '../types';
import {Icon} from './Icon';
import {Tagline} from './Tagline';
import {ToyRoom} from './ToyRoom';
import {NestRoom} from './NestRoom';
import {TicketStudio} from './TicketStudio';
import {Postcard} from './Postcard';
import {Modal} from './Modal';
import {collectedPostcards,type CollectedPostcard} from '../lib/collectedPostcards';
import {CollectionShelf} from './CollectionShelf';
import type {CommunityTab} from '../lib/communityTypes';
import '../community.css';
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
export function Collection({items,toys,mode,onClose,toast,communityPreview=false,production=false,playerNickname}:{items:Capsule[];toys:Toy[];mode:string;onClose:()=>void;toast:(s:string)=>void;communityPreview?:boolean;production?:boolean;playerNickname?:string}){
 const account=useAccount(),postcards=collectedPostcards(account?.stories||[],account?.receivedPostcards||[]);
 const [story,setStory]=useState<CollectedPostcard|null>(null);
 const[selected,setSelected]=useState<{toy:Toy;item:Capsule}|null>(null);
 const[tab,setTab]=useState<CommunityTab>('cards');
 const close=useCallback(()=>setSelected(null),[]);
 const open=useCallback((toy:Toy,item:Capsule)=>setSelected({toy,item}),[]);
 return <section className={'collection-view'+(communityPreview?' community-collection':'')} aria-label="我的扭蛋包">
  <header className="collection-header"><button className="text-button" onClick={onClose}><Icon name="back"/>返回机器</button><h1>我的扭蛋包<span>{items.length+postcards.length}</span></h1></header>
  {communityPreview&&<div className="community-tabs" role="tablist" aria-label="我的收藏空间">{([['cards','卡包'],['nest','小窝'],['notes','彩蛋明信片']] as const).map(([key,label],index)=><button id={'community-tab-'+key} key={key} role="tab" aria-controls={'community-panel-'+key} aria-selected={tab===key} tabIndex={tab===key?0:-1} onClick={()=>setTab(key)} onKeyDown={e=>{const keys=['cards','nest','notes'] as const;let next:number|undefined;if(e.key==='ArrowRight')next=(index+1)%3;if(e.key==='ArrowLeft')next=(index+2)%3;if(e.key==='Home')next=0;if(e.key==='End')next=2;if(next!==undefined){e.preventDefault();setTab(keys[next]);document.getElementById('community-tab-'+keys[next])?.focus()}}}>{label}</button>)}</div>}
  <div id="community-panel-cards" role={communityPreview?'tabpanel':undefined} aria-labelledby={communityPreview?'community-tab-cards':undefined} hidden={communityPreview&&tab!=='cards'}>
  <CollectionShelf toyCount={items.length} uniqueCount={new Set(items.map(item=>item.toy_id)).size} postcards={postcards} onOpenPostcard={setStory} onDraw={onClose} toyCards={items.map(item=>{const toy=toys.find(t=>t.id===item.toy_id);return toy?<CollectionCard key={item.id} item={item} toy={toy} onOpen={()=>setSelected({toy,item})}/>:null})}/>
  </div>
  {communityPreview&&<><section id="community-panel-nest" role="tabpanel" aria-labelledby="community-tab-nest" hidden={tab!=='nest'}><NestRoom soundActive={tab==='nest'} items={items} toys={toys} active={tab==='nest'&&!selected&&!story} onOpen={open} onCards={()=>setTab('cards')} onNotes={()=>setTab('notes')} playerNickname={playerNickname}/></section><section id="community-panel-notes" role="tabpanel" aria-labelledby="community-tab-notes" hidden={tab!=='notes'}><TicketStudio toast={toast} active={tab==='notes'&&!selected}/></section></>}
  <footer className="collection-footer"><span><i className={'status-dot '+(mode==='cloud'?'online':'')}/>{account?.profile?'云端已连接':communityPreview&&!production?'布局预览 · 使用示例收藏':mode==='cloud'?'云端已连接':'收藏保存在本机'}</span><span>{account?.profile?'收藏与任务进度跟随账户':communityPreview&&!production?'本次布置不会改动线上收藏':'登录后，可把本机收藏带进账户'}</span></footer>
  {selected&&<ToyRoom key={selected.toy.id} toy={selected.toy} item={selected.item} onClose={close} toast={toast} returnLabel={communityPreview&&tab==='nest'?'回到小窝':'扭蛋包'}/>}
  {story&&<Modal label={story.source==='nest'?'小窝生活明信片':'收到的彩蛋明信片'} onClose={()=>setStory(null)} className="nest-photo-modal"><Postcard source={story.source} text={story.text} date={story.createdAt} media={story.media} signature={story.source==='player'?story.signature:undefined} stamped={story.source==='player'}/></Modal>}
 </section>;
}
