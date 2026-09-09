import {useCallback,useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from '../src/App';
import {AccountContext,useAccount} from '../src/lib/AccountContext';
import type {AccountSnapshot,AccountState} from '../src/lib/AccountContext';
import {applyAccountPatch} from '../src/lib/accountSnapshot';
import type {AccountPatch} from '../src/lib/accountSnapshot';
import type {PostcardMedia} from '../src/lib/postcardTypes';
import type {AccountDraw} from '../src/lib/nestLifeTypes';
import {privateMediaCache} from '../src/lib/privateMediaCache';
import {PLAY_OWNER,playTransaction,readPlayFile,snapshotOf,savePlayDocument,stepPlay,attachPlayPhoto} from './local-play-store';
import '../src/styles.css';import '../src/v3.css';import '../src/v4.css';import '../src/v5.css';import '../src/collection-room.css';import '../src/account.css';import '../src/nest-life.css';

function LocalPlay(){
 const [snapshot,setSnapshot]=useState<AccountSnapshot|null>(null),[error,setError]=useState(''),mounted=useRef(false),urls=useRef(new Map<string,string>());
 const apply=useCallback((patch:AccountPatch|undefined)=>{if(mounted.current&&patch)setSnapshot(previous=>applyAccountPatch(previous,patch))},[]);
 const reload=useCallback(async()=>{try{const next=await playTransaction(state=>snapshotOf(state));if(mounted.current){setSnapshot(next);setError('')}}catch(cause){if(mounted.current)setError((cause as Error).message);throw cause}},[]);
 useEffect(()=>{mounted.current=true;void reload().catch(()=>{});return()=>{mounted.current=false;privateMediaCache.clear();for(const url of urls.current.values())URL.revokeObjectURL(url);urls.current.clear()}},[reload]);
 const homeLife=useCallback(async(operation:string,options:object={})=>{const result=await playTransaction(state=>stepPlay(state,operation,options));apply(result.patch);return result},[apply]);
 const mediaUrls=useCallback(async(paths:string[])=>{
  if(paths.length>24||paths.some(path=>!path.startsWith(PLAY_OWNER+'/')))throw Error('只能读取这份本地试玩的照片。');
  const rows=await Promise.all(paths.map(async path=>{try{let url=urls.current.get(path);if(!url){url=URL.createObjectURL(await readPlayFile(path));urls.current.set(path,url)}return {path,url}}catch{return {path,url:null}}}));
  return {expiresAt:Date.now()+3600000,urls:rows};
 },[]);
 const saveFile=async(blob:Blob,source:PostcardMedia):Promise<PostcardMedia>=>{
  const id=crypto.randomUUID(),path=PLAY_OWNER+'/'+id;
  await playTransaction((_state,files)=>files.put(blob,path));return {...source,id,origin:'account-file',url:'',posterUrl:undefined,storagePath:path};
 };
 const uploadMedia=async(media:PostcardMedia)=>{
  if(media.origin!=='local-file')return media;if(!media.url.startsWith('blob:'))throw Error('请选择本机的照片。');
  const saved=await saveFile(await (await fetch(media.url)).blob(),media);
  if(media.posterUrl?.startsWith('blob:')){const poster=await saveFile(await (await fetch(media.posterUrl)).blob(),media);saved.posterStoragePath=poster.storagePath}
  return saved;
 };
 const captureLife=async(eventId:string,blob:Blob,repeated=false)=>{
  const media=await saveFile(blob,{id:eventId,url:'',kind:'photo',width:960,height:960,label:repeated?'这个小故事再次发生时':'小窝当时的模样',origin:'nest-capture',capturedAt:new Date().toISOString(),...(repeated?{sceneMoment:'repeat'}:{})});
  apply(await playTransaction(state=>attachPlayPhoto(state,eventId,media)));
 };
 if(!snapshot)return <main style={{padding:24}}><h1>A · 本地试玩</h1><p role="status">{error||'正在打开本机的试玩小窝…'}</p>{error&&<button className="room-pill" onClick={()=>void reload().catch(()=>{})}>重试本地读取</button>}</main>;
 const unavailable=async()=>{throw Error('这里是不登录的本地试玩。真实账户请在正式网站使用。')};
 const value:AccountState={...snapshot,status:'ready',error:'',persistence:'device',reload,homeLife,mediaUrls,uploadMedia,captureLife,authenticate:unavailable,logout:unavailable,importCapsules:unavailable,
  saveDocument:async(key,document,revision)=>{apply(await playTransaction(state=>savePlayDocument(state,key,document,revision??snapshot.documents[key]?.revision??0)))},
  quest:async()=>{throw Error('试玩的五只示例已经解锁；不会改动正式账户任务。')},
 };
 return <AccountContext.Provider value={value}><PlayShop/></AccountContext.Provider>;
}
function PlayShop(){
 const account=useAccount()!,request=useRef<string|null>(null),[help,setHelp]=useState(false);
 const draw=async()=>{request.current??=crypto.randomUUID();const result=await account.homeLife!('draw',{requestId:request.current});if(!result.id||!result.type)throw Error('扭蛋暂未准备好。');request.current=null;return result as AccountDraw};
 const extra=<button className="room-pill" onClick={()=>setHelp(value=>!value)} aria-expanded={help}>A · 本地试玩</button>;
 return <><App preview={{initialBag:false,production:false,owner:PLAY_OWNER,items:account.capsules,mode:'local',nickname:'试玩小窝',storyCount:account.stories?.length||0,extra,onDraw:draw,onKeep:async item=>{await account.homeLife!('keep',{requestId:item.id})},onReject:async item=>{await account.homeLife!('reject',{requestId:item.id})}}}/>
  {help&&<aside className="local-play-guide"><strong>只在这台电脑试玩，不影响线上收藏。</strong><p>已备好五只解锁示例。可抽蛋收留、查看卡片、布置小窝和拍照；刷新后仍保留在此浏览器。</p><p>鸦与爆米花已入住，待一会儿会有小片段；完成并拍到照片后，故事才有机会被抽到。</p><p>照片与草稿不上传。这里不登录真实账户，也不能代表真实云端网络速度。手机布置滚动问题仍待单独修复。</p><button className="room-pill" onClick={()=>setHelp(false)}>开始试玩</button></aside>}
 </>;
}
if(!['127.0.0.1','localhost'].includes(location.hostname))throw Error('此入口仅供本地试玩。');
createRoot(document.getElementById('root')!).render(<LocalPlay/>);
