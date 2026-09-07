import {useCallback,useEffect,useRef,useState} from 'react';
import type {Capsule,Toy} from '../types';
import {Icon} from './Icon';
import {Modal} from './Modal';
import {Tagline} from './Tagline';
import {playVoice,stopVoice} from '../lib/audio';
import {CardExportDialog} from './CardExportDialog';

function ToyImage({toy,story=false}:{toy:Toy;story?:boolean}){
  const[failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[toy.icon_url,toy.story_image_url]);
  return failed?<span className="toy-image-fallback"><Icon name="heart" size={40}/><small>{toy.name_zh}</small></span>:<img src={story?toy.story_image_url:toy.icon_url} loading={story?'eager':'lazy'} decoding="async" alt={toy.name_zh} onError={()=>setFailed(true)}/>;
}
export function ToyCard({item,toy,onRead,onListen,onSave,playing}:{item:Capsule;toy:Toy;onRead:()=>void;onListen:()=>void;onSave:()=>void;playing:boolean}){
  const card=useRef<HTMLElement>(null),longPress=useRef<ReturnType<typeof setTimeout>|null>(null);
  const cancel=()=>{if(longPress.current)clearTimeout(longPress.current)};
  useEffect(()=>cancel,[]);
  return <article className="toy-card" ref={card} style={{'--toy-color':toy.color} as React.CSSProperties}
    onContextMenu={event=>{event.preventDefault();onSave()}}
    onPointerDown={event=>{if(event.pointerType==='touch'&&!(event.target as HTMLElement).closest('button'))longPress.current=setTimeout(onSave,650)}}
    onPointerUp={cancel} onPointerMove={cancel} onPointerCancel={cancel}>
    <div className="card-image"><div className="card-series">THE LITTLE MISFITS<span>{toy.number}</span></div><ToyImage toy={toy}/></div>
    <div className="card-content"><div className="card-name"><h3>{toy.name_zh}</h3><span>{toy.name_en}</span></div><Tagline toy={toy}/>
      <div className="card-actions"><button onClick={onListen} aria-label={'听故事 '+toy.name_zh}><Icon name={playing?'pause':'headphones'} size={16}/>{playing?'暂停':'听故事'}</button><button onClick={onRead}><Icon name="book" size={16}/>读故事</button><button className="save-card" onClick={onSave} aria-label="保存卡片图片"><Icon name="download" size={17}/></button></div>
      <time className="card-date" dateTime={item.obtained_at}>{new Date(item.obtained_at).toLocaleDateString('zh-CN')}</time>
    </div>
  </article>;
}
export function Collection({items,toys,mode,onClose,toast}:{items:Capsule[];toys:Toy[];mode:string;onClose:()=>void;toast:(s:string)=>void}){
  const[story,setStory]=useState<Toy|null>(null),[playing,setPlaying]=useState<string|null>(null);
  const[saveTarget,setSaveTarget]=useState<{toy:Toy;item:Capsule}|null>(null);
  const closeStory=useCallback(()=>setStory(null),[]),closeSave=useCallback(()=>setSaveTarget(null),[]);
  useEffect(()=>()=>stopVoice(),[]);
  const listen=async(toy:Toy)=>{
    if(playing===toy.id){stopVoice();setPlaying(null);return}
    setPlaying(toy.id);try{await playVoice(toy.audio_url,()=>setPlaying(null))}catch{setPlaying(null);toast('声音暂时无法播放，请重试。')}
  };
  return <section className="collection-view" aria-label="我的扭蛋包">
    <header className="collection-header"><button className="text-button" onClick={onClose}><Icon name="back"/>返回机器</button><h1>我的扭蛋包<span>{items.length}</span></h1></header>
    {items.length?<div className="collection-grid">{items.map(item=>{const toy=toys.find(t=>t.id===item.toy_id);return toy?<ToyCard key={item.id} item={item} toy={toy} onRead={()=>setStory(toy)} onListen={()=>listen(toy)} onSave={()=>setSaveTarget({toy,item})} playing={playing===toy.id}/>:null})}</div>:<div className="empty-bag"><Icon name="bag" size={45}/><p>扭蛋包还是空的</p><button className="pill-button dark" onClick={onClose}>去抽扭蛋<Icon name="arrow"/></button></div>}
    <footer className="collection-footer"><span><i className={'status-dot '+(mode==='cloud'?'online':'')}/>{mode==='cloud'?'云端已连接':'收藏保存在本机'}</span><span>长按卡片可保存图片</span></footer>
    {story&&<Modal label={story.name_zh+'的故事'} onClose={closeStory} className="story-modal"><div className="story-image"><ToyImage toy={story} story/></div><div className="story-copy"><h2>{story.name_zh}</h2><p className="toy-name-en">{story.name_en}</p><p className="story-zh">{story.story_text}</p><button className="pill-button dark" onClick={()=>listen(story)}><Icon name={playing===story.id?'pause':'headphones'}/>{playing===story.id?'暂停播放':'听故事'}</button></div></Modal>}
    {saveTarget&&<CardExportDialog toy={saveTarget.toy} item={saveTarget.item} onClose={closeSave} toast={toast}/>}
  </section>;
}
