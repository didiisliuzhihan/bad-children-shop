import {useAccount} from '../lib/AccountContext';
import {useCallback,useEffect,useMemo,useState} from 'react';
import type {Capsule,Toy} from '../types';
import type {HomePlacement} from '../lib/communityTypes';
import {homeResidents} from '../lib/communityDraft.mjs';
import {useToyQuest} from '../lib/useToyQuest';
import {moveResident,placeResident,readLayout,rotateResident,saveLayout,NEST_ROOM_ID} from '../lib/nestPlacement.mjs';
import {Icon} from './Icon';
import {NestScene} from './NestScene';
import type {NestTime} from '../lib/nestLighting';
import type {CapturedNestPhoto} from '../lib/nestCapture';
import {NestPhotoDialog} from './NestPhotoDialog';
import {setNestAmbience,observeNestAudioStatus,unlockAudio,type NestAudioStatus} from '../lib/audio';

function ResidentChoice({toy,item,count,placed,editing,selected,onEligibility,onPlace,onSelect,onOpen}:{toy:Toy;item:Capsule;count:number;placed:boolean;editing:boolean;selected:boolean;onEligibility:(id:string,allowed:boolean)=>void;onPlace:(id:string)=>void;onSelect:(id:string)=>void;onOpen:(toy:Toy,item:Capsule)=>void}){
 const {stage}=useToyQuest(toy.id),unlocked=stage==='unlocked';
 useEffect(()=>onEligibility(toy.id,unlocked),[toy.id,unlocked,onEligibility]);
 return <button className={'nest-resident-choice '+(!unlocked?'is-locked':'')} aria-pressed={selected} onClick={()=>!unlocked?onOpen(toy,item):placed?editing?onSelect(toy.id):onOpen(toy,item):onPlace(toy.id)}>
  <span className="nest-choice-image"><img src={toy.icon_url} alt="" loading="lazy"/>{!unlocked&&<Icon name="lock" size={18}/>}</span><span><strong>{toy.name_zh}</strong><small>{!unlocked?'做任务，再入住':placed?'已在小窝':'放进小窝'}<span className="nest-owned-count"> · 卡包 {count} 枚</span></small></span>
 </button>;
}
export function NestRoom({items,toys,active=true,soundActive=active,onOpen,onCards,onNotes,playerNickname}:{items:Capsule[];toys:Toy[];active?:boolean;soundActive?:boolean;onOpen:(toy:Toy,item:Capsule)=>void;onCards:()=>void;onNotes:()=>void;playerNickname?:string}){
 const account=useAccount();
 const [saving,setSaving]=useState(false),[baseRevision,setBaseRevision]=useState(account?.documents.nest?.revision||0);
 const residents=useMemo(()=>homeResidents(items,toys),[items,toys]);
 const [initial]=useState(()=>readLayout({getItem:(key:string)=>account?.profile?(account.documents.nest?JSON.stringify(account.documents.nest.value):null):localStorage.getItem(key)},residents.map(r=>r.toy.id)));
 const [placements,setPlacements]=useState<HomePlacement[]>(initial.placements),[saved,setSaved]=useState<HomePlacement[]>(initial.placements),[eligible,setEligible]=useState<string[]>([]),[editing,setEditing]=useState(false),[selected,setSelected]=useState<string|null>(null),[notice,setNotice]=useState(initial.error?'之前的布置草稿没能读取；原记录没有被改动。':initial.unplaced?`新家具占了一点地方，${initial.unplaced} 位小住客先在卡包里等你腾出位置。旧布置记录仍保留。`:initial.adjusted?'小住客已搬进新房间，并避开了家具。喜欢的话，可以重新保存布置。':'');
 const [persisted,setPersisted]=useState(false);
 const [photo,setPhoto]=useState<CapturedNestPhoto|null>(null);
 const [sceneVisited,setSceneVisited]=useState(active);
 const [audioStatus,setAudioStatus]=useState<NestAudioStatus>('inactive');
 useEffect(()=>observeNestAudioStatus(setAudioStatus),[]);
 useEffect(()=>{if(active)setSceneVisited(true)},[active]);
 // Arrangement, photos and toy detail are all part of the same room visit.
 // Only leaving this tab, hiding the page or the shared mute may silence it.
 useEffect(()=>{const update=()=>setNestAmbience(soundActive&&!document.hidden,'room');update();document.addEventListener('visibilitychange',update);return()=>{document.removeEventListener('visibilitychange',update);setNestAmbience(false,'room')}},[soundActive]);
 const closePhoto=useCallback(()=>setPhoto(null),[]);
 useEffect(()=>{if(!active)setPhoto(null)},[active]);
 const [timeOfDay,setTimeOfDay]=useState<NestTime>('day');
 const eligibility=useCallback((id:string,allowed:boolean)=>setEligible(ids=>allowed?(ids.includes(id)?ids:[...ids,id]):(ids.includes(id)?ids.filter(v=>v!==id):ids)),[]);
 const ownedIds=residents.map(r=>r.toy.id);
 const visible=useMemo(()=>placements.filter(p=>eligible.includes(p.toyId)&&residents.some(r=>r.toy.id===p.toyId)),[placements,eligible,residents]);
 const dirty=JSON.stringify(placements)!==JSON.stringify(saved);
 const move=useCallback((id:string,x:number,z:number)=>{setPlacements(previous=>moveResident(previous,id,x,z));setPersisted(false)},[]);
 const add=(id:string)=>{
  if(!eligible.includes(id)||!ownedIds.includes(id))return;const next=placeResident(visible,id,eligible);
  if(next===visible){setNotice('这里有点挤，先挪挪其他小住客吧。');return;}
  setPlacements(next);setSelected(id);setEditing(true);setPersisted(false);setNotice('拖动它，挑一个喜欢的位置。');
 };
 useEffect(()=>{if(account?.profile&&!editing){const fresh=readLayout({getItem:()=>account.documents.nest?JSON.stringify(account.documents.nest.value):null},ownedIds);setPlacements(fresh.placements);setSaved(fresh.placements);setBaseRevision(account.documents.nest?.revision||0)}},[account?.documents.nest?.revision,editing]);
 const save=async()=>{
  if(saving)return;
  if(account?.profile){
   setSaving(true);try{await account.saveDocument('nest',{version:1,roomId:NEST_ROOM_ID,placements:visible},baseRevision);setPlacements(visible);setSaved(visible);setPersisted(true);setEditing(false);setSelected(null);setNotice('小窝已保存到你的账户。')}
   catch(e){setNotice((e as Error).message)}finally{setSaving(false)}return;
  }
  if(!saveLayout({setItem:(key:string,value:string)=>localStorage.setItem(key,value)},visible,eligible)){setNotice('浏览器未能保存布置。可能是存储空间不足或禁用了网站存储；当前布置仍在，请先不要关闭页面。');return;}
  setPlacements(visible);setSaved(visible);setPersisted(true);setEditing(false);setSelected(null);setNotice('布置已保存在当前浏览器。');
 };
 const nudge=(dx:number,dz:number)=>{const p=visible.find(v=>v.toyId===selected);if(p)move(p.toyId,p.x+dx,p.z+dz);};
 const chosen=residents.find(r=>r.toy.id===selected&&visible.some(p=>p.toyId===selected));
 return <div className={"nest-room nest-room-spatial"+(saving?" is-saving":"")} data-nest-time={timeOfDay} data-nest-active={active} data-nest-audio={audioStatus} inert={saving} aria-busy={saving}>
  <header className="nest-heading"><div><h2>我的小窝</h2><p>{editing?'选中一位小住客，拖到喜欢的位置。':timeOfDay==='night'?'把灯留着，陪小住客待一会儿。':'陪小住客待一会儿。'}</p></div><div className="nest-mode-actions"><div className="nest-time-switch" role="group" aria-label="小窝昼夜"><button aria-pressed={timeOfDay==='day'} onClick={()=>setTimeOfDay('day')}>白天</button><button aria-pressed={timeOfDay==='night'} onClick={()=>setTimeOfDay('night')}>夜晚</button></div>{editing?<><button className="room-pill" onClick={()=>{setPlacements(saved);setEditing(false);setSelected(null);setNotice('已回到上次保存的布置。')}}>取消</button><button className="room-pill nest-save" disabled={saving} onClick={()=>void save()}>{saving?'正在保存…':'保存布置'}</button></>:<button className="room-pill" onClick={()=>{setEditing(true);setSelected(null);setNotice('')}}>布置小窝</button>}</div></header>
  {sceneVisited?<NestScene active={active} lifeReady={active&&!dirty&&(!account?.profile||baseRevision>0)&&!photo} toys={toys} placements={visible} editing={editing} selected={selected} timeOfDay={timeOfDay} onSelect={setSelected} onMove={move} onCapture={setPhoto}/>:<div className="nest-world nest-world-paused"/>}
  <div className="nest-under-scene"><span>{editing?'按住玩具拖动 · 空白处上下滑动':'逛小窝 · 有话想说时，点点「…」气泡'}</span><span>{account?.profile?(dirty?'尚未保存':'已连接账户 · 布置需点保存'):`游客 · ${dirty?'尚未保存':persisted?'已保存在此浏览器':'点保存后留在此浏览器'} · 不跨设备同步`}</span></div>
  {active&&audioStatus==='loading'&&<p className="nest-life-status" role="status">炉火声正在加载…</p>}
  {active&&(audioStatus==='blocked'||audioStatus==='muted')&&<p className="nest-life-status" role="status">{audioStatus==='muted'?'声音已关闭':'声音尚未开启'}，可点右上角喇叭打开。</p>}
  {active&&audioStatus==='error'&&<p className="nest-life-status" role="status">炉火声暂时没有加载成功。<button className="text-button" onClick={()=>void unlockAudio()}>重试炉火声</button></p>}
  {editing&&<section className="nest-placement-toolbar" aria-label="调整玩具位置"><div className="nest-selection-name">{chosen?<><strong>{chosen.toy.name_zh}</strong><span>也可以用按钮微调位置</span></>:<span>在房间或下方选一位小住客。</span>}</div>{chosen&&<><div className="nest-nudge-buttons"><button onClick={()=>nudge(-.23,.195)}>左移</button><button onClick={()=>nudge(.23,-.195)}>右移</button><button onClick={()=>nudge(-.195,-.23)}>后移</button><button onClick={()=>nudge(.195,.23)}>前移</button></div><div className="nest-transform-buttons"><button onClick={()=>{setPlacements(p=>rotateResident(p,chosen.toy.id,Math.PI/12));setPersisted(false)}}>左转</button><button onClick={()=>{setPlacements(p=>rotateResident(p,chosen.toy.id,-Math.PI/12));setPersisted(false)}}>右转</button><button onClick={()=>{setPlacements(p=>p.filter(v=>v.toyId!==chosen.toy.id));setSelected(null);setPersisted(false);setNotice('已从房间收起，卡包收藏不变。')}}>收进卡包</button></div></>}</section>}
  <p className="nest-notice" role="status">{notice}</p>
  <section className="nest-resident-tray" aria-label="可入住的玩具"><div className="nest-tray-heading"><h3>小住客</h3><span>{visible.length} 只在小窝 · 每款最多一只</span></div><div className="nest-resident-options">{residents.map(({toy,item,count})=><ResidentChoice key={toy.id} toy={toy} item={item} count={count} placed={visible.some(p=>p.toyId===toy.id)} selected={editing&&selected===toy.id} editing={editing} onEligibility={eligibility} onPlace={add} onSelect={setSelected} onOpen={onOpen}/>)}</div>{!residents.length&&<div className="community-empty"><p>第一位小住客，还在扭蛋机里等你。</p><button className="room-pill" onClick={onCards}>去看卡包</button></div>}</section>
  <nav className="nest-shortcuts" aria-label="小窝内的快捷入口"><button onClick={onCards}><Icon name="book"/>打开卡册<Icon name="arrow" size={16}/></button><button onClick={onNotes}><Icon name="heart"/>制作彩蛋明信片<Icon name="arrow" size={16}/></button></nav>
  {active&&photo&&<NestPhotoDialog photo={photo} playerNickname={playerNickname} onClose={closePhoto}/>}
 </div>;
}
