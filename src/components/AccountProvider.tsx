import {useCallback,useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {createClient} from '@supabase/supabase-js';
import type {Session} from '@supabase/supabase-js';
import {AccountContext} from '../lib/AccountContext';
import type {AccountSnapshot,AccountState} from '../lib/AccountContext';
import {ACCOUNT_PREVIEW_SESSION,accountName,accountPassword,recoveryToken} from '../lib/accountContract.mjs';
import {asset} from '../assets';
import type {PostcardMedia} from '../lib/postcardTypes';
import {nestPhotoOutbox,type PendingNestPhoto} from '../lib/nestPhotoStorage';
import {applyAccountPatch,accountSessionKey,type AccountPatch} from '../lib/accountSnapshot';
import {privateMediaCache} from '../lib/privateMediaCache';

const projectUrl=import.meta.env.VITE_SUPABASE_URL;
const publishableKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY;
const endpoint=projectUrl+'/functions/v1/bc-account-preview';
// One client per preview module, including React StrictMode's double initialization.
const client=projectUrl&&publishableKey?createClient(projectUrl,publishableKey,{auth:{storageKey:ACCOUNT_PREVIEW_SESSION,detectSessionInUrl:false}}):null;
async function request(data:any,token?:string,form?:FormData,stillCurrent=()=>true){
 const retryable=!form&&(data?.action==='load'||data?.action==='media'||data?.action==='save'||data?.action==='life'&&data?.operation==='keep');
 for(let attempt=0;;attempt++){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),form||['register','login','recover'].includes(data?.action)?45000:12000);
 try{
  const response=await fetch(endpoint,{method:'POST',signal:controller.signal,headers:{apikey:publishableKey,...(!form?{'content-type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:form||JSON.stringify(data)});
  const body=await response.json();if(!response.ok)throw Object.assign(Error(body.error||'暂时没有保存成功。'),{status:response.status});return body;
 }catch(error){
  const transient=(error as Error).name==='AbortError'||error instanceof TypeError||[408,502,503,504].includes((error as {status:number}).status);
  if(retryable&&attempt===0&&transient&&stillCurrent()){clearTimeout(timer);await new Promise(resolve=>setTimeout(resolve,450));if(stillCurrent())continue;}
  if((error as Error).name==='AbortError')throw Error(data?.action==='register'?'连接有点慢，请用刚才的名字和密码登录确认，不要重复注册。':'暂时没有收到确认，请重试；已保存的内容不会重复加入。');throw error;
 }finally{clearTimeout(timer)}
 }
}
export function AccountProvider({children}:{children:ReactNode}){
 const [snapshot,setSnapshot]=useState<AccountSnapshot|null>(null),[status,setStatus]=useState<AccountState['status']>('loading'),[error,setError]=useState('');
 const [syncError,setSyncError]=useState('');
 const writeVersion=useRef(0),readSequence=useRef(0),lastLoad=useRef(0),inflight=useRef<{turn:number;version:number;sequence:number;promise:Promise<void>}|null>(null);
 const session=useRef<Session|null>(null),current=useRef<AccountSnapshot|null>(null),generation=useRef(0),mounted=useRef(false);current.current=snapshot;
 const reauthenticationRequired=useRef(false);
 // A revoked application session is not a transient network error. Stop using
 // it immediately; an SDK token refresh must not re-enter the failed load loop.
 // Leave all cloud records and browser collection/draft keys untouched.
 const invalidateSession=useCallback((turn:number)=>{
  if(!mounted.current||turn!==generation.current)return;
  reauthenticationRequired.current=true;generation.current++;session.current=null;current.current=null;privateMediaCache.clear();
  setSnapshot(null);setSyncError('');setStatus('signed-out');setError('登录状态已失效，请重新登录。也可以先以游客身份逛逛；云端收藏不会被删除。');
 },[]);
 const apply=useCallback((next:AccountSnapshot)=>{
  if(!mounted.current||session.current?.user.id!==next.profile.user_id)return;
  // A slower read cannot roll back a newer document revision in this tab.
  setSnapshot(previous=>{
   const documents={...next.documents};if(previous?.profile.user_id===next.profile.user_id)for(const [key,doc] of Object.entries(previous.documents))if(doc.revision>(documents[key]?.revision||0))documents[key]=doc;
   if(documents.postcards)documents.postcards={...documents.postcards,value:{drafts:(documents.postcards.value.drafts||[]).map((d:any)=>({...d,media:d.media?.origin==='example'?{...d.media,url:asset('toy_tired_crow_card.png')}:d.media}))}};
   return {...next,documents,capsules:next.capsules.map(item=>({...item,synced:true}))};
  });setStatus('ready');setError('');setSyncError('');
 },[]);
 const reload=useCallback(async()=>{
  const active=session.current,turn=generation.current,version=writeVersion.current;if(!active)return;
  if(inflight.current?.turn===turn&&inflight.current.version===version)return inflight.current.promise;
  const sequence=++readSequence.current,valid=()=>mounted.current&&turn===generation.current;
  const promise=(async()=>{
   try{const next=await request({action:'load',deferMedia:true},active.access_token,undefined,valid);if(valid()&&sequence===readSequence.current&&version===writeVersion.current){apply(next);lastLoad.current=Date.now()}}
   catch(e){if((e as {status?:number}).status===401)invalidateSession(turn);else if(valid()&&sequence===readSequence.current&&version===writeVersion.current){if(current.current?.profile.user_id===active.user.id){setSyncError('后台同步暂未完成，已打开的收藏仍可查看。');setStatus('ready')}else{setError((e as Error).message);setStatus('error')}}throw e}
   finally{if(inflight.current?.sequence===sequence)inflight.current=null}
  })();
  inflight.current={turn,version,sequence,promise};return promise;
 },[apply,invalidateSession]);
 useEffect(()=>{
  mounted.current=true;
  if(!client){setStatus('error');setError('账户入口尚未配置。');return()=>{mounted.current=false}}
  const {data}=client.auth.onAuthStateChange((event,next)=>{
   if(reauthenticationRequired.current&&next)return;
   const changed=session.current?.user.id!==next?.user.id,replaced=accountSessionKey(session.current)!==accountSessionKey(next);session.current=next;
   if(replaced||!next){generation.current++;readSequence.current++;inflight.current=null;lastLoad.current=0;current.current=null;privateMediaCache.clear();setSnapshot(null);setError('');setSyncError('')}
   if(!next){setSnapshot(null);setStatus('signed-out');return}
   if(changed||!current.current)setStatus('loading');
   // Avoid awaiting Auth methods inside its state-change lock.
   if(changed||!current.current||event!=='TOKEN_REFRESHED'&&Date.now()-lastLoad.current>30000)queueMicrotask(()=>{if(mounted.current)void reload().catch(()=>{})});
  });
  const refresh=()=>{if(document.visibilityState==='visible'&&Date.now()-lastLoad.current>30000)void reload().catch(()=>{})};document.addEventListener('visibilitychange',refresh);window.addEventListener('online',refresh);
  const refreshMedia=setInterval(refresh,45*60*1000);
  return()=>{mounted.current=false;generation.current++;data.subscription.unsubscribe();document.removeEventListener('visibilitychange',refresh);window.removeEventListener('online',refresh);clearInterval(refreshMedia)};
 },[client,reload]);
 const authenticated=useCallback(async(data:unknown,form?:FormData,expectedOwner=current.current?.profile.user_id)=>{
  if(!client)throw Error('账户入口尚未配置。');const {data:auth,error:authError}=await client.auth.getSession();
  if(authError||!auth.session||auth.session.user.id!==session.current?.user.id||auth.session.user.id!==expectedOwner)throw Error('请先登录。');
  const owner=auth.session.user.id,turn=generation.current;
  const valid=()=>mounted.current&&owner===session.current?.user.id&&turn===generation.current;
  let result;try{result=await request(data&&typeof data==='object'?{...data,responseMode:'patch',deferMedia:true}:data,auth.session.access_token,form,valid)}catch(e){if((e as {status?:number}).status===401)invalidateSession(turn);throw e}
  if(!mounted.current||owner!==session.current?.user.id||turn!==generation.current)throw Error('账户状态已改变，请重新打开当前页面。');
  if(result.patch){const patch=result.patch as AccountPatch;if(patch.ownerId!==owner)throw Error('保存确认的账户不一致，请重新同步。');if(patch.document?.key==='postcards')patch.document={...patch.document,value:{drafts:(patch.document.value.drafts||[]).map((d:any)=>({...d,media:d.media?.origin==='example'?{...d.media,url:asset('toy_tired_crow_card.png')}:d.media}))}};writeVersion.current++;setSnapshot(previous=>applyAccountPatch(previous,patch));setSyncError('')}
  if(result.profile){writeVersion.current++;apply(result)}return result;
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
 const homeLife=useCallback(async(operation:string,options:object={})=>{const result=await authenticated({action:'life',operation,...options});if(operation==='keep'&&!result.patch)throw Error('还没有收到收藏确认，请重试；不会重复收留。');return result},[authenticated]);
 const mediaUrls=useCallback(async(paths:string[])=>authenticated({action:'media',paths}),[authenticated]);
 const [photoPending,setPhotoPending]=useState(false);
 const flushPhotos=useCallback(async(owner:string)=>{
  const ok=await nestPhotoOutbox.flush(owner,(id:string)=>mounted.current&&session.current?.user.id===id,async(item:PendingNestPhoto)=>{
   const form=new FormData();form.set('file',item.blob,'moment.png');form.set('nestEvent',item.eventId);form.set('repeated',String(item.repeated));form.set('width','960');form.set('height','960');
   const result=await authenticated(null,form,owner);
   writeVersion.current++;setSnapshot(previous=>previous?.profile.user_id===owner?{...previous,stories:previous.stories?.map(story=>story.id===result.media.storyId?{...story,media:result.media}:story)}:previous);
  });
  if(mounted.current&&session.current?.user.id===owner)setPhotoPending(!ok);
 },[authenticated]);
 useEffect(()=>{
  const owner=snapshot?.profile.user_id;setPhotoPending(false);if(!owner||status!=='ready')return;
  const retry=()=>{if(!document.hidden)void flushPhotos(owner)};
  retry();const timer=setInterval(retry,30000);window.addEventListener('online',retry);document.addEventListener('visibilitychange',retry);
  return()=>{clearInterval(timer);window.removeEventListener('online',retry);document.removeEventListener('visibilitychange',retry)};
 },[snapshot?.profile.user_id,status,flushPhotos]);
 const captureLife=useCallback(async(eventId:string,blob:Blob,repeated=false)=>{
  if(blob.type!=='image/png')throw Error('小窝故事照片需要 PNG 格式。');
  const owner=current.current?.profile.user_id;if(!owner)throw Error('请先登录。');
  await nestPhotoOutbox.put({owner,eventId,blob,repeated});await flushPhotos(owner);
 },[flushPhotos]);
 return <AccountContext.Provider value={{profile:snapshot?.profile||null,capsules:snapshot?.capsules||[],documents:snapshot?.documents||{},stories:snapshot?.stories||[],receivedPostcards:snapshot?.receivedPostcards||[],status,error,syncError,mediaUrls,authenticate,logout,reload,saveDocument,quest,importCapsules,uploadMedia,homeLife,captureLife,photoPending}}>{children}</AccountContext.Provider>;
}
