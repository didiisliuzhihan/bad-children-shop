import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from '../src/App';
import {fallbackToys} from '../src/assets';
import {AccountProvider} from '../src/components/AccountProvider';
import {AccountMenu} from '../src/components/AccountMenu';
import {AccountSyncNotice} from '../src/components/AccountSyncNotice';
import {useAccount} from '../src/lib/AccountContext';
import {QUEST_KEY,QUEST_WAIT_MS,updateQuest} from '../src/lib/questProgress.mjs';
import type {Capsule} from '../src/types';
import type {AccountDraw} from '../src/lib/nestLifeTypes';
import {startPerformanceProbe} from './performanceProbe';
import '../src/styles.css';import '../src/v3.css';import '../src/v4.css';import '../src/v5.css';import '../src/collection-room.css';import '../src/community.css';import '../src/nest-life.css';

const ids=['tired_crow','miss_popcorn','stressed_jimao','jimao','kuku_sunflower','jimao','jimao','kuku_sunflower','miss_popcorn','stressed_jimao','tired_crow','kuku_sunflower','jimao'];
const samples:Capsule[]=ids.map((toy_id,index)=>({id:'community-demo-'+index,toy_id,obtained_at:new Date(Date.UTC(2026,8,8,12-index)).toISOString(),synced:false}));
function Preview(){
 const account=useAccount()!,[guest,setGuest]=useState(samples),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),seedLock=useRef(false),request=useRef<string|null>(null);
 const [loginRequest,setLoginRequest]=useState(0),[dismissedAuthNotice,setDismissedAuthNotice]=useState(false);
 useEffect(()=>setDismissedAuthNotice(false),[account.error,account.status]);
 const seed=async()=>{if(seedLock.current)return;seedLock.current=true;setBusy(true);try{await account.importCapsules(samples.map((item,index)=>({...item,id:crypto.randomUUID(),obtained_at:new Date(Date.now()-index*60000).toISOString()})));setNotice('测试收藏已装好；模型任务仍按正常流程解锁。')}catch(e){setNotice((e as Error).message)}finally{seedLock.current=false;setBusy(false)}};
 const demoUnlock=()=>{
  const key=QUEST_KEY+':preview:community',storage={getItem:()=>localStorage.getItem(key),setItem:(_key:string,value:string)=>localStorage.setItem(key,value)};
  try{const now=Date.now();for(const toy of fallbackToys){updateQuest(storage,toy.id,'save',now-QUEST_WAIT_MS-1000);updateQuest(storage,toy.id,'unlock',now);}window.dispatchEvent(new Event('bc-quest-changed'));setNotice('五款示例已解锁：在小窝摆入两位邻居、保存后，安静等一小会儿。')}catch{setNotice('预览状态未能保存。')}
 };
 const draw=async():Promise<AccountDraw>=>{
  request.current??=crypto.randomUUID();
  if(account.profile){const result=await account.homeLife!('draw',{requestId:request.current});if(!result.id||!result.type)throw Error('扭蛋暂时没准备好，请重试。');request.current=null;return result as AccountDraw;}
  const result:AccountDraw={id:request.current,type:'toy',toyId:fallbackToys[Math.floor(Math.random()*fallbackToys.length)].id};request.current=null;return result;
 };
 const keep=async(draw:AccountDraw)=>{
  if(account.profile){await account.homeLife!('keep',{requestId:draw.id});}
  else if(draw.toyId)setGuest(items=>items.some(c=>c.id===draw.id)?items:[{id:draw.id,toy_id:draw.toyId!,obtained_at:new Date().toISOString(),synced:false},...items]);
 };
 const reject=async(draw:AccountDraw)=>{if(account.profile)await account.homeLife!('reject',{requestId:draw.id});};
 const extra=<><span className="preview-label">本地生活预览</span>{!account.profile&&<button className="room-pill" onClick={demoUnlock}>示例解锁</button>}{account.profile&&!account.capsules.length&&<button className="room-pill" disabled={busy} onClick={()=>void seed()}>加入测试收藏</button>}<AccountMenu loginRequest={loginRequest}/></>;
 return <><App preview={{owner:account.profile?.user_id,storyCount:account.stories?.length||0,items:account.profile?account.capsules:guest,mode:account.profile?'cloud':'local',nickname:account.profile?.nickname,extra,onDraw:draw,onKeep:keep,onReject:reject}}/>{account.status==='signed-out'&&account.error&&!dismissedAuthNotice&&<aside className="preview-reauth-notice" role="status"><p>{account.error}</p><div><button className="room-pill" onClick={()=>setLoginRequest(n=>n+1)}>重新登录</button><button className="text-button" onClick={()=>setDismissedAuthNotice(true)}>先看示例小窝</button></div></aside>}{account.status==='loading'&&<div className="preview-account-loading" role="status">正在打开你的收藏…</div>}{account.status==='error'&&<div className="preview-account-loading" role="alert"><p>{account.error}</p><button className="room-pill" onClick={()=>void account.reload().catch(()=>{})}>重试同步</button></div>}{notice&&<button className="preview-life-notice" role="status" onClick={()=>setNotice('')}>{notice} ×</button>}</>;
}
// No anonymous production client is initialized anywhere in this preview.
startPerformanceProbe();
createRoot(document.getElementById('root')!).render(<React.StrictMode><AccountProvider><Preview/><AccountSyncNotice/></AccountProvider></React.StrictMode>);
