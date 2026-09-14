import {ChineseOnly} from './ChineseOnly';
import {tx,useLanguage} from '../lib/i18n';
import {useEffect,useState} from 'react';
import type {Capsule,Toy} from '../types';
import {Modal} from './Modal';
import {Icon} from './Icon';
import {CollectibleCard} from './CollectibleCard';
import {ToyViewer} from './ToyViewer';
import {FogUnlock} from './FogUnlock';
import {questPreview,useToyQuest} from '../lib/useToyQuest';
import {useToyVoice} from '../lib/useToyVoice';
type Pane='model'|'card'|'story';
export function ToyRoom({toy,item,onClose,toast,returnLabel='扭蛋包'}:{toy:Toy;item:Capsule;onClose:()=>void;toast:(s:string)=>void;returnLabel?:string}){
 const language=useLanguage();
 const [pane,setPane]=useState<Pane>('card'),[mobile,setMobile]=useState(()=>matchMedia('(max-width:760px)').matches);
 const {playing,listen}=useToyVoice(toy,()=>toast('声音暂时无法播放，请重试。'));
 const quest=useToyQuest(toy.id);
 useEffect(()=>{const media=matchMedia('(max-width:760px)');const change=()=>{setMobile(media.matches);if(!media.matches)setPane(p=>p==='model'?'card':p)};media.addEventListener('change',change);return()=>media.removeEventListener('change',change)},[]);
 const showModel=!mobile||pane==='model';
 const tabs=(isMobile:boolean)=><div className={'room-tabs '+(isMobile?'room-mobile-tabs':'room-desktop-tabs')} role="tablist" aria-label={tx("玩具收藏内容")}>
  {tx((isMobile?['model','card','story']:['card','story']).map(key=><button key={key} id={'room-'+(isMobile?'mobile-':'desktop-')+key} type="button" role="tab" aria-selected={pane===key} aria-controls={'room-panel-'+key} onClick={()=>setPane(key as Pane)}>{tx(key==='model'?'模型':key==='card'?'卡片':'故事')}{tx(key==='model'&&quest.stage!=='unlocked'&&<Icon name="lock" size={12}/>)}</button>))}
 </div>;
 return <Modal label={tx(toy.name_zh+'收藏详情')} onClose={onClose} className="toy-room-modal">
  <header className="toy-room-header"><button className="room-back" onClick={onClose}><Icon name="back" size={17}/>{tx(returnLabel)}</button>{tx(playing&&pane!=='story'?<button className="room-voice-status" aria-label={tx("暂停当前玩具故事")} onClick={listen}><Icon name="pause" size={14}/>{tx("故事播放中 · 暂停")}</button>:quest.canSkipPreview&&quest.stage==='waiting'?<button className="preview-skip" onClick={quest.skipPreviewWait}>{tx("预览：体验解锁")}</button>:<span>{tx(questPreview?'交互预览 · ':'')}THE LITTLE MISFITS / {tx(toy.number)}</span>)}</header>
  {tx(mobile&&tabs(true))}
  <div className="toy-room-layout">
   {tx(showModel&&<section id="room-panel-model" className={'room-model-panel '+(quest.stage==='unlocked'?'is-unlocked':'is-locked')} aria-label={tx("模型展示")} data-model-state={quest.stage}>
    <div className="room-model-heading"><span>THE LITTLE MISFITS / {tx(toy.number)}</span><h2>{tx(toy.name_en)}</h2><ChineseOnly><p>{tx(toy.name_zh)}</p></ChineseOnly></div>
    {tx(quest.stage==='unlocked'?<ToyViewer toy={toy}/>:<FogUnlock toy={toy} stage={quest.stage} onCard={()=>setPane('card')} onUnlock={quest.unlock}/>)}
   </section>)}
   <section className="room-companion" hidden={mobile&&pane==='model'}>
    {tx(!mobile&&tabs(false))}
    <div id="room-panel-card" role="tabpanel" aria-labelledby={'room-'+(mobile?'mobile-':'desktop-')+'card'} hidden={pane!=='card'}><CollectibleCard toy={toy} item={item} active={pane==='card'} toast={toast} onConfirmSaved={quest.confirmSaved} questStage={quest.stage}/></div>
    {tx(pane==='story'&&<article id="room-panel-story" role="tabpanel" aria-labelledby={'room-'+(mobile?'mobile-':'desktop-')+'story'} className="room-story">
     <img className="room-story-photo" src={toy.story_image_url} alt={tx(toy.name_zh+'的故事照片')}/>
     <div className="room-story-copy">{language==='en'&&<small className="voice-language-note">English reading · Original Chinese audio and artwork</small>}<h2>{tx(toy.name_zh)}</h2><ChineseOnly><p className="room-name-en">{tx(toy.name_en)}</p></ChineseOnly><p className="room-story-caption">{tx(toy.story_text)}</p>{tx(toy.story_note&&<p className="room-story-note">{tx(toy.story_note)}</p>)}{tx(toy.audio_url?<button className="room-pill room-voice" aria-pressed={playing} onClick={listen}><Icon name={playing?'pause':'play'} size={17}/>{tx(playing?'暂停故事':'听它说说话')}</button>:<p className="room-story-note">{tx("声音还在准备中，先读读它的小故事。")}</p>)}</div>
    </article>)}
   </section>
  </div>
 </Modal>;
}
