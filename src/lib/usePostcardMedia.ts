import {useEffect,useRef,useState} from 'react';
import {useAccount} from './AccountContext';
import {privateMediaCache} from './privateMediaCache';
import type {PostcardMedia} from './postcardTypes';

export function usePostcardMedia<T extends HTMLElement=HTMLDivElement>(media:PostcardMedia|null|undefined,active=true,thumbnail=false){
 const account=useAccount(),owner=account?.profile?.user_id||'',ref=useRef<T|null>(null);
 const [near,setNear]=useState(false),[attempt,setAttempt]=useState(0),[failure,setFailure]=useState('');
 const [resolved,setResolved]=useState<{key:string;url:string;posterUrl?:string}|null>(null),autoRetried=useRef(false);
 const key=[owner,media?.id,media?.storagePath,media?.posterStoragePath,media?.url,media?.posterUrl,thumbnail].join('|');
 const own=!!media?.storagePath,allowed=!own||!!owner&&media!.storagePath!.startsWith(owner+'/')&&(!media?.posterStoragePath||media.posterStoragePath.startsWith(owner+'/'));
 useEffect(()=>{setFailure('');setAttempt(0);setNear(false);autoRetried.current=false},[key]);
 useEffect(()=>{
  if(!active)return;const node=ref.current;if(!node)return;
  if(typeof IntersectionObserver==='undefined'){setNear(true);return}
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setNear(true);observer.disconnect()}},{rootMargin:'180px'});observer.observe(node);return()=>observer.disconnect();
 },[active,key]);
 useEffect(()=>{
  if(!media||!own||!active||!near||!allowed||!account?.mediaUrls)return;
  let alive=true;setFailure('');
  const paths=thumbnail&&media.posterStoragePath?[media.posterStoragePath]:[media.storagePath!,...(media.posterStoragePath?[media.posterStoragePath]:[])];
  if(attempt)privateMediaCache.invalidate(owner,paths);
  void Promise.all(paths.map(path=>privateMediaCache.get(owner,path,account.mediaUrls!))).then(urls=>{
   if(alive)setResolved({key,url:thumbnail&&media.posterStoragePath?'':urls[0],posterUrl:media.posterStoragePath?urls.at(-1):undefined});
  }).catch(()=>{if(alive)setFailure('这张照片暂时没能打开。')});return()=>{alive=false};
 },[key,active,near,allowed,attempt,account?.mediaUrls]);
 const loaded=resolved?.key===key?resolved:undefined;
 const readyMedia=media&&allowed?{...media,...(loaded?{url:loaded.url,posterUrl:loaded.posterUrl}:own?{url:'',posterUrl:undefined}:{})}:null;
 const retry=()=>{setFailure('');setAttempt(n=>n+1)};
 const imageFailed=()=>{if(own&&!autoRetried.current){autoRetried.current=true;retry()}else setFailure('这张照片暂时没能打开。')};
 return {ref,media:readyMedia,attempt,loading:!!media&&own&&allowed&&!loaded&&!failure,error:!allowed?'这张照片属于其他账户。':failure,retry,imageFailed};
}
