import {useEffect,useRef,useState} from 'react';
import App from '../App';
import {AccountMenu} from './AccountMenu';
import {AccountSyncNotice} from './AccountSyncNotice';
import {useAccount} from '../lib/AccountContext';
import {fallbackToys} from '../assets';
import {initializeCloud,readLocal,syncCapsule,writeLocal} from '../lib/collection';
import type {AccountDraw} from '../lib/nestLifeTypes';
import type {Capsule} from '../types';

/** Live entry: real guest collections, no demo rewards or task bypass. */
export function CommunityShop(){
 const account=useAccount()!,[guest,setGuest]=useState<Capsule[]>(readLocal),[loginRequest,setLoginRequest]=useState(0),[dismissed,setDismissed]=useState(false);
 const request=useRef<string|null>(null);
 useEffect(()=>setDismissed(false),[account.status,account.error]);
 useEffect(()=>{
  if(account.status!=='signed-out')return;
  let active=true;void initializeCloud().then(result=>{if(active)setGuest(result.items)});
  return()=>{active=false};
 },[account.status,account.profile?.user_id]);
 const draw=async():Promise<AccountDraw>=>{
  request.current??=crypto.randomUUID();
  if(account.profile){const result=await account.homeLife!('draw',{requestId:request.current});if(!result.id||!result.type)throw Error('扭蛋暂时没准备好，请重试。');request.current=null;return result as AccountDraw;}
  const result:AccountDraw={id:request.current,type:'toy',toyId:fallbackToys[Math.floor(Math.random()*fallbackToys.length)].id};request.current=null;return result;
 };
 const keep=async(draw:AccountDraw)=>{
  if(account.profile){await account.homeLife!('keep',{requestId:draw.id});return;}
  if(!draw.toyId)return;
  const item:Capsule={id:draw.id,toy_id:draw.toyId,obtained_at:new Date().toISOString(),synced:false};
  const next=guest.some(c=>c.id===item.id)?guest:[item,...guest];
  if(!writeLocal(next))throw Error('浏览器未能保存收藏，请检查存储设置后重试。');
  setGuest(next);void syncCapsule(item);
 };
 const reject=async(draw:AccountDraw)=>{if(account.profile)await account.homeLife!('reject',{requestId:draw.id});};
 return <><App preview={{initialBag:false,production:true,owner:account.profile?.user_id,storyCount:account.stories?.length||0,items:account.profile?account.capsules:guest,mode:account.profile?'cloud':'local',nickname:account.profile?.nickname,extra:<AccountMenu loginRequest={loginRequest}/>,onDraw:draw,onKeep:keep,onReject:reject}}/>
  {account.status==='signed-out'&&account.error&&!dismissed&&<aside className="preview-reauth-notice" role="status"><p>{account.error}</p><div><button className="room-pill" onClick={()=>setLoginRequest(n=>n+1)}>重新登录</button><button className="text-button" onClick={()=>setDismissed(true)}>先逛逛</button></div></aside>}
  <AccountSyncNotice/>
  {account.status==='loading'&&<div className="preview-account-loading" role="status">正在打开你的收藏…</div>}
  {account.status==='error'&&<div className="preview-account-loading" role="alert"><p>{account.error}</p><button className="room-pill" onClick={()=>void account.reload().catch(()=>{})}>重试同步</button></div>}
 </>;
}
