import {useCallback,useEffect,useRef,useState} from 'react';
import {toBlob} from 'html-to-image';
import type {Capsule,Toy} from '../types';
import {Icon} from './Icon';
import {Modal} from './Modal';
import {Tagline} from './Tagline';
import {playVoice,stopVoice} from '../lib/audio';

function ToyImage({toy,story=false}:{toy:Toy;story?:boolean}){
  const[failed,setFailed]=useState(false);
  return failed?<span className="toy-image-fallback"><Icon name="heart" size={40}/><small>{toy.name_zh}</small></span>:<img src={story?toy.story_image_url:toy.icon_url} loading="lazy" decoding="async" alt={toy.name_zh} onError={()=>setFailed(true)}/>;
}
export function ToyCard({item,toy,onRead,onListen,onSave,playing}:{item:Capsule;toy:Toy;onRead:()=>void;onListen:()=>void;onSave:(el:HTMLElement)=>void;playing:boolean}){
  const card=useRef<HTMLElement>(null),longPress=useRef<ReturnType<typeof setTimeout>|null>(null);
  const cancel=()=>{if(longPress.current)clearTimeout(longPress.current)};
  useEffect(()=>cancel,[]);
  return <article className="toy-card" ref={card} style={{'--toy-color':toy.color} as React.CSSProperties}
    onContextMenu={event=>{event.preventDefault();if(card.current)onSave(card.current)}}
    onPointerDown={event=>{if(event.pointerType==='touch')longPress.current=setTimeout(()=>{if(card.current)onSave(card.current)},650)}}
    onPointerUp={cancel} onPointerMove={cancel} onPointerCancel={cancel}>
    <div className="card-image"><div className="card-series">THE LITTLE MISFITS<span>{toy.number}</span></div><ToyImage toy={toy}/></div>
    <div className="card-content"><div className="card-name"><h3>{toy.name_zh}</h3><span>{toy.name_en}</span></div><Tagline toy={toy}/>
      <div className="card-actions"><button onClick={onListen} aria-label={'听故事 '+toy.name_zh}><Icon name={playing?'pause':'headphones'} size={16}/>{playing?'暂停':'听故事'}</button><button onClick={onRead}><Icon name="book" size={16}/>读故事</button><button className="save-card" onClick={()=>{if(card.current)onSave(card.current)}} aria-label="保存卡片图片"><Icon name="download" size={17}/></button></div>
      <time className="card-date" dateTime={item.obtained_at}>{new Date(item.obtained_at).toLocaleDateString('zh-CN')}</time>
    </div>
  </article>;
}
export function Collection({items,toys,mode,onClose,toast}:{items:Capsule[];toys:Toy[];mode:string;onClose:()=>void;toast:(s:string)=>void}){
  const[story,setStory]=useState<Toy|null>(null),[playing,setPlaying]=useState<string|null>(null);
  const[saveTarget,setSaveTarget]=useState<HTMLElement|null>(null),[saving,setSaving]=useState(false);
  const closeStory=useCallback(()=>setStory(null),[]),closeSave=useCallback(()=>setSaveTarget(null),[]);
  useEffect(()=>()=>stopVoice(),[]);
  const listen=async(toy:Toy)=>{
    if(playing===toy.id){stopVoice();setPlaying(null);return}
    setPlaying(toy.id);try{await playVoice(toy.audio_url,()=>setPlaying(null))}catch{setPlaying(null);toast('声音暂时无法播放，请重试。')}
  };
  const save=async()=>{
    if(!saveTarget||saving)return;setSaving(true);
    try{
      const blob=await toBlob(saveTarget,{pixelRatio:2,backgroundColor:'#e4e9e8',cacheBust:false,filter:node=>!(node as HTMLElement).classList?.contains('card-actions')});
      if(!blob)throw Error();const file=new File([blob],'bad-children-collectible.png',{type:'image/png'});
      if(navigator.canShare?.({files:[file]})&&innerWidth<768){await navigator.share({files:[file],title:'我的扭蛋收藏'})}
      else{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
      setSaveTarget(null);toast('卡片已保存');
    }catch(error){if((error as Error).name!=='AbortError')toast('图片暂时无法保存，请稍后重试。')}
    finally{setSaving(false)}
  };
  return <section className="collection-view" aria-label="我的扭蛋包">
    <header className="collection-header"><button className="text-button" onClick={onClose}><Icon name="back"/>返回机器</button><h1>我的扭蛋包<span>{items.length}</span></h1></header>
    {items.length?<div className="collection-grid">{items.map(item=>{const toy=toys.find(t=>t.id===item.toy_id);return toy?<ToyCard key={item.id} item={item} toy={toy} onRead={()=>setStory(toy)} onListen={()=>listen(toy)} onSave={setSaveTarget} playing={playing===toy.id}/>:null})}</div>:<div className="empty-bag"><Icon name="bag" size={45}/><p>扭蛋包还是空的</p><button className="pill-button dark" onClick={onClose}>去抽扭蛋<Icon name="arrow"/></button></div>}
    <footer className="collection-footer"><span><i className={'status-dot '+(mode==='cloud'?'online':'')}/>{mode==='cloud'?'云端已连接':'收藏保存在本机'}</span><span>长按卡片可保存图片</span></footer>
    {story&&<Modal label={story.name_zh+'的故事'} onClose={closeStory} className="story-modal"><div className="story-image"><ToyImage toy={story} story/></div><div className="story-copy"><h2>{story.name_zh}</h2><p className="toy-name-en">{story.name_en}</p><p className="story-zh">{story.story_text}</p><button className="pill-button dark" onClick={()=>listen(story)}><Icon name={playing===story.id?'pause':'headphones'}/>{playing===story.id?'暂停播放':'听故事'}</button></div></Modal>}
    {saveTarget&&<Modal label="保存收藏卡片" onClose={closeSave} className="save-modal"><h2>保存收藏卡片</h2><p>手机可通过分享菜单存入相册。</p><button className="pill-button dark" disabled={saving} onClick={save}><Icon name="download"/>{saving?'正在生成…':'保存图片'}</button></Modal>}
  </section>;
}
