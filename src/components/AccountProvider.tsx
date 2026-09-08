import {useCallback,useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {createClient} from '@supabase/supabase-js';
import type {Session} from '@supabase/supabase-js';
import {AccountContext} from '../lib/AccountContext';
import type {AccountSnapshot,AccountState} from '../lib/AccountContext';
import {ACCOUNT_PREVIEW_SESSION,accountName,accountPassword,recoveryToken} from '../lib/accountContract.mjs';
import {asset} from '../assets';
import type {PostcardMedia} from '../lib/postcardTypes';

const projectUrl=import.meta.env.VITE_SUPABASE_URL;
const publishableKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY;
const endpoint=projectUrl+'/functions/v1/bc-account-preview';
// One client per preview module, including React StrictMode's double initialization.
const client=projectUrl&&publishableKey?createClient(projectUrl,publishableKey,{auth:{storageKey:ACCOUNT_PREVIEW_SESSION,detectSessionInUrl:false}}):null;
async function request(data:unknown,token?:string,form?:FormData){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
 try{
  const response=await fetch(endpoint,{method:'POST',signal:controller.signal,headers:{apikey:publishableKey,...(!form?{'content-type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:form||JSON.stringify(data)});
  const body=await response.json();if(!response.ok)throw Object.assign(Error(body.error||'暂时没有保存成功。'),{status:response.status});return body;
 }catch(error){if((error as Error).name==='AbortError')throw Error('连接有点慢，请重试；不要重复创建账户，已有名字可直接登录。');throw error}finally{clearTimeout(timer)}
}
export function AccountProvider({children}:{children:ReactNode}){
 const [snapshot,setSnapshot]=useState<AccountSnapshot|null>(null),[status,setStatus]=useState<AccountState['status']>('loading'),[error,setError]=useState('');
 const session=useRef<Session|null>(null),current=useRef<AccountSnapshot|null>(null),generation=useRef(0),mounted=useRef(false);current.current=snapshot;
 const reauthenticationRequired=useRef(false);
 // A revoked application session is not a transient network error. Stop using
 // it immediately; an SDK token refresh must not re-enter the failed load loop.
 // Leave all cloud records and browser collection/draft keys untouched.
 const invalidateSession=useCallback((turn:number)=>{
  if(!mounted.current||turn!==generation.current)return;
  reauthenticationRequired.current=true;generation.current++;session.current=null;current.current=null;
  setSnapshot(null);setStatus('signed-out');setError('登录状态已失效，请重新登录。也可以先以游客身份逛逛；云端收藏不会被删除。');
 },[]);
 const apply=useCallback((next:AccountSnapshot)=>{
  if(!mounted.current||session.current?.user.id!==next.profile.user_id)return;
  // A slower read cannot roll back a newer document revision in this tab.
  setSnapshot(previous=>{
   const documents={...next.documents};if(previous?.profile.user_id===next.profile.user_id)for(const [key,doc] of Object.entries(previous.documents))if(doc.revision>(documents[key]?.revision||0))documents[key]=doc;
   if(documents.postcards)documents.postcards={...documents.postcards,value:{drafts:(documents.postcards.value.drafts||[]).map((d:any)=>({...d,media:d.media?.origin==='example'?{...d.media,url:asset('toy_tired_crow_card.png')}:d.media}))}};
   return {...next,documents,capsules:next.capsules.map(item=>({...item,synced:true}))};
  });setStatus('ready');setError('');
 },[]);
 const reload=useCallback(async()=>{
  const active=session.current,turn=generation.current;if(!active)return;
  try{const next=await request({action:'load'},active.access_token);if(turn===generation.current)apply(next)}catch(e){if((e as {status?:number}).status===401)invalidateSession(turn);else if(mounted.current&&turn===generation.current){setError((e as Error).message);setStatus('error')}throw e}
 },[apply,invalidateSession]);
 useEffect(()=>{
  mounted.current=true;
  if(!client){setStatus('error');setError('账户入口尚未配置。');return()=>{mounted.current=false}}
  const {data}=client.auth.onAuthStateChange((_event,next)=>{
   if(reauthenticationRequired.current&&next)return;
   const changed=session.current?.user.id!==next?.user.id;session.current=next;generation.current++;
   if(changed){setSnapshot(null);setError('')}
   if(!next){setSnapshot(null);setStatus('signed-out');return}
   if(changed||!current.current)setStatus('loading');
   // Avoid awaiting Auth methods inside its state-change lock.
   queueMicrotask(()=>{if(mounted.current)void reload().catch(()=>{})});
  });
  const refresh=()=>{if(document.visibilityState==='visible')void reload().catch(()=>{})};document.addEventListener('visibilitychange',refresh);
  const refreshMedia=setInterval(refresh,45*60*1000);
  return()=>{mounted.current=false;generation.current++;data.subscription.unsubscribe();document.removeEventListener('visibilitychange',refresh);clearInterval(refreshMedia)};
 },[client,reload]);
 const authenticated=useCallback(async(data:unknown,form?:FormData,expectedOwner=current.current?.profile.user_id)=>{
  if(!client)throw Error('账户入口尚未配置。');const {data:auth,error:authError}=await client.auth.getSession();
  if(authError||!auth.session||auth.session.user.id!==session.current?.user.id||auth.session.user.id!==expectedOwner)throw Error('请先登录。');
  const owner=auth.session.user.id,turn=generation.current;
  let result;try{result=await request(data,auth.session.access_token,form)}catch(e){if((e as {status?:number}).status===401)invalidateSession(turn);throw e}
  if(!mounted.current||owner!==session.current?.user.id||turn!==generation.current)throw Error('账户状态已改变，请重新打开当前页面。');
  if(result.profile)apply(result);return result;
 },[client,apply,invalidateSession]);
 const authenticate=async(mode:'register'|'login'|'recover',name:string,password:string,code?:string)=>{
  if(!client)throw Error('账户入口尚未配置。');const normalized=accountName(name);accountPassword(password);
  const result=await request({action:mode,name:normalized.display,password,...(mode==='recover'?{code:recoveryToken(code)}:{})});
  reauthenticationRequired.current=false;generation.current++;
  const {error}=await client.auth.setSession(result.session);if(error)throw Error('账户已验证，但当前浏览器没能保留登录，请重新登录。');
  return result.recoveryCode as string|undefined;
 };
 const logout=async()=>{await authenticated({action:'logout'});const {error}=await client!.auth.signOut({scope:'local'});if(error)throw Error('已撤销这次登录，请刷新页面完成退出。')};
 const saveDocument=async(key:'nest'|'postcards',value:unknown,revision?:number)=>{const owner=current.current;if(!owner)throw Error('先登录，再保存吧。');await authenticated({action:'save',key,value,revision:revision??owner.documents[key]?.revision??0},undefined,owner.profile.user_id)};
 const quest=async(toyId:string,operation:'save'|'unlock')=>{await authenticated({action:'quest',toyId,operation})};
 const importCapsules=async(items:unknown[],legacyToken?:string)=>{const result=await authenticated({action:'import',items,legacyToken});return result.added as number};
 const uploadMedia=async(media:PostcardMedia)=>{
  if(media.origin!=='local-file')return media;
  if(!media.url.startsWith('blob:'))throw Error('请选择自己的本地影像。');
  const owner=current.current?.profile.user_id;if(!owner)throw Error('请先登录。');
  const file=await (await fetch(media.url)).blob(),form=new FormData();form.set('file',file,'postcard');form.set('width',String(media.width));form.set('height',String(media.height));if(media.duration)form.set('duration',String(media.duration));
  const result=await authenticated(null,form,owner);
  if(media.posterUrl&&media.posterUrl.startsWith('blob:')){
   const poster=await (await fetch(media.posterUrl)).blob(),cover=new FormData();cover.set('file',poster,'poster');cover.set('width',String(media.width));cover.set('height',String(media.height));
   const uploaded=await authenticated(null,cover,owner);result.media.posterStoragePath=uploaded.media.storagePath;result.media.posterUrl=uploaded.media.url;
  }
  return result.media as PostcardMedia;
 };
 const homeLife=useCallback(async(operation:string,options:object={})=>authenticated({action:'life',operation,...options}),[authenticated]);
 const captureLife=useCallback(async(eventId:string,blob:Blob)=>{if(blob.type!=='image/png')throw Error('小窝故事照片需要 PNG 格式。');const form=new FormData();form.set('file',blob,'moment.png');form.set('nestEvent',eventId);form.set('width','960');form.set('height','960');await authenticated(null,form)},[authenticated]);
 return <AccountContext.Provider value={{profile:snapshot?.profile||null,capsules:snapshot?.capsules||[],documents:snapshot?.documents||{},stories:snapshot?.stories||[],receivedPostcards:snapshot?.receivedPostcards||[],status,error,authenticate,logout,reload,saveDocument,quest,importCapsules,uploadMedia,homeLife,captureLife}}>{children}</AccountContext.Provider>;
}
