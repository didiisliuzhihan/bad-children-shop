// Device-only playground. Never imported by src/main.tsx or used as cloud authority.
import {placeResident,validateLayout,NEST_ROOM_ID} from '../src/lib/nestPlacement.mjs';
import {eligibleMoments,lifeDirection} from '../src/lib/nestLifeRules.mjs';
import {isConfirmedDocumentRetry} from '../supabase/functions/bc-account-preview/documentRetry.mjs';
import type {AccountSnapshot} from '../src/lib/AccountContext';
import type {AccountPatch} from '../src/lib/accountSnapshot';
import type {AccountDraw,NestMoment,NestTrace,PrivateStory,NestLifeReply} from '../src/lib/nestLifeTypes';
import type {PostcardMedia} from '../src/lib/postcardTypes';
export const PLAY_OWNER='local-play-a';
export const PLAY_DB='bc-local-play-a-v1';
const toys=['jimao','kuku_sunflower','stressed_jimao','miss_popcorn','tired_crow'];
const copy:Record<string,string>={soup:'爆米花说今天不管了。锅里还是给鸦留了一份，算它精神上帮忙的报酬。',tea:'鸡毛陪葵坐到茶不烫了。问题没有变小，好像也没有刚才那么大了。',book:'抗压鸡毛和鸦翻了三页书。今天的进度：一起允许自己停在第三页。',solo_jimao:'鸡毛给自己留了一杯热的。没人夸它，它也觉得今天还行。',solo_kuku:'葵在暖光里发了一会儿呆。今天没有努力开花，也被好好照到了。',solo_stressed:'抗压鸡毛把书停在了这一页。头顶的小雷，今天也提早下班了。',solo_popcorn:'爆米花煮了一点热的，嘴上说只管自己，手却又多拿了一只杯子。',solo_crow:'鸦翻开书，又靠回了沙发。今天最认真完成的事，是理直气壮地歇一会儿。'};
type StoryRow=PrivateStory&{kind:string;eventId:string;collected?:boolean};
type State={snapshot:AccountSnapshot;draws:Record<string,{draw:AccountDraw;choice?:'keep'|'reject'}>;stories:StoryRow[];event?:NestMoment;trace?:NestTrace;lastEvent?:number};
export type PlayReply=NestLifeReply&Partial<AccountDraw>&{patch?:AccountPatch};
export function initialPlayState(now=Date.now()):State{
 const date=new Date(now).toISOString();let placements:any[]=[];
 for(const id of ['tired_crow','miss_popcorn'])placements=placeResident(placements,id,toys);
 return {snapshot:{profile:{user_id:PLAY_OWNER,nickname:'试玩小窝',created_at:date},capsules:toys.map(toy_id=>({id:crypto.randomUUID(),toy_id,obtained_at:date,synced:true})),documents:{nest:{key:'nest',revision:1,updated_at:date,value:{version:1,roomId:NEST_ROOM_ID,placements}},quests:{key:'quests',revision:1,updated_at:date,value:Object.fromEntries(toys.map(id=>[id,{savedAt:now-601000,unlockedAt:now}]))},postcards:{key:'postcards',revision:1,updated_at:date,value:{drafts:[]}}},stories:[]},draws:{},stories:[]};
}
export function snapshotOf(state:State):AccountSnapshot{return {...state.snapshot,stories:state.stories.filter(row=>row.collected).map(({kind,eventId,collected,...story})=>story)}}
function patchDocument(state:State,key:string,value:any,revision:number){
 const current=state.snapshot.documents[key];
 if((current?.revision||0)!==revision){if(isConfirmedDocumentRetry(current,key,value,revision))return {ownerId:PLAY_OWNER,document:current};throw Error('另一处刚保存了更新，请重新打开后再修改。')}
 const document={key,value,revision:revision+1,updated_at:new Date().toISOString()};state.snapshot.documents[key]=document;return {ownerId:PLAY_OWNER,document};
}
export function savePlayDocument(state:State,key:'nest'|'postcards',value:any,revision:number):AccountPatch{
 if(key==='nest'){const valid=validateLayout(value,toys);if(!valid||valid.length!==value.placements?.length)throw Error('布置的位置需要调整。');value={version:1,roomId:NEST_ROOM_ID,placements:valid}}
 else if(!Array.isArray(value?.drafts)||value.drafts.length>12||value.drafts.some((d:any)=>d.source!=='player'||!d.text?.trim()||Array.from(d.text).length>80))throw Error('请检查草稿文字，最多保存 12 张。');
 return patchDocument(state,key,value,revision);
}
export function stepPlay(state:State,operation:string,options:{requestId?:string;revision?:number}={},now=Date.now(),random=Math.random):PlayReply{
 const id=options.requestId;
 if(operation==='draw'){
  if(!id)throw Error('缺少扭蛋编号。');const same=state.draws[id]||Object.values(state.draws).find(row=>!row.choice);if(same)return same.draw;
  const pending=state.stories.find(row=>!row.collected&&row.media),draw:AccountDraw=pending&&random()<.4?{id,type:'story',story:{id:pending.id,source:'nest',text:pending.text,createdAt:pending.createdAt,media:pending.media}}:{id,type:'toy',toyId:toys[Math.floor(random()*toys.length)]};
  state.draws[id]={draw};return draw;
 }
 if(operation==='keep'||operation==='reject'){
  const row=id&&state.draws[id];if(!row)throw Error('没有找到这枚扭蛋。');if(row.choice&&row.choice!==operation)throw Error('这枚扭蛋已经处理过了，请回卡包查看。');row.choice=operation;
  if(operation==='reject')return {ok:true};
  if(row.draw.type==='toy'){let capsule=state.snapshot.capsules.find(c=>c.id===id);if(!capsule){capsule={id:id!,toy_id:row.draw.toyId!,obtained_at:new Date(now).toISOString(),synced:true};state.snapshot.capsules.unshift(capsule)}return {ok:true,patch:{ownerId:PLAY_OWNER,capsules:[capsule]}}}
  const story=state.stories.find(s=>s.id===row.draw.story?.id);if(!story)throw Error('故事记录暂时没有找到。');story.collected=true;const {kind,eventId,collected,...card}=story;return {ok:true,patch:{ownerId:PLAY_OWNER,stories:[card]}};
 }
 const layout=state.snapshot.documents.nest;
 if(operation==='leave'){state.event=undefined;return {ok:true}}
 if(options.revision!==layout.revision)return {};
 if(operation==='visit')return {trace:state.trace&&Date.parse(state.trace.until)>now?state.trace:null};
 if(operation==='start'){
  if(state.event&&now-Date.parse(state.event.startedAt!)<30000)return {};
  if(state.lastEvent&&now-state.lastEvent<90000)return {};
  const eligible=eligibleMoments(layout.value.placements),pairs=eligible.filter(e=>e.actors.length===2),pool=pairs.length?pairs:eligible;
  const next=pool[Math.floor(random()*pool.length)];if(!next)return {};
  state.event={id:crypto.randomUUID(),kind:next.id,startedAt:new Date(now).toISOString()};state.lastEvent=now;return {event:state.event};
 }
 if(operation==='complete'){
  const event=state.event,direction=event&&lifeDirection(event.kind);
  if(!event||event.id!==id||now-Date.parse(event.startedAt!)<12000||!direction||!eligibleMoments(layout.value.placements).some(e=>e.id===event.kind))return {};
  state.trace={kind:direction.prop,toyId:direction.speaker,until:new Date(now+600000).toISOString()};
  let story=state.stories.find(s=>s.kind===event.kind);const repeated=!!story;
  if(!story){story={id:crypto.randomUUID(),source:'nest',kind:event.kind,eventId:event.id,text:copy[event.kind],createdAt:new Date(now).toISOString(),media:null};state.stories.push(story)}
  else if(!story.media)story.eventId=event.id;
  state.event=undefined;return {ok:true,trace:state.trace,capture:!story.media,captureEventId:story.eventId,captureRepeated:repeated};
 }
 throw Error('本地试玩没有这个操作。');
}
export function attachPlayPhoto(state:State,eventId:string,media:PostcardMedia){const row=state.stories.find(s=>s.eventId===eventId);if(!row)throw Error('这个场景还没有完成。');row.media??=media;return row.collected?{ownerId:PLAY_OWNER,stories:snapshotOf(state).stories}:undefined}
export async function playTransaction<T>(run:(state:State,files:IDBObjectStore)=>T):Promise<T>{
 return new Promise((resolve,reject)=>{
  const opening=indexedDB.open(PLAY_DB,1);let db:IDBDatabase|undefined,tx:IDBTransaction|undefined,finished=false;
  const fail=(error:unknown)=>{if(finished)return;finished=true;clearTimeout(timer);try{tx?.abort()}catch{}db?.close();reject(error)};
  const timer=setTimeout(()=>fail(Error('本地保存暂未完成，请重试；不要清除浏览器数据。')),5000);
  opening.onupgradeneeded=()=>{opening.result.createObjectStore('state');opening.result.createObjectStore('files')};
  opening.onerror=()=>fail(opening.error);opening.onblocked=()=>fail(Error('请先关闭其他本地试玩页，再重新打开。'));
  opening.onsuccess=()=>{
   db=opening.result;if(finished){db.close();return}tx=db.transaction(['state','files'],'readwrite');let result:T;
   tx.onabort=()=>fail(tx?.error||Error('本地保存失败，请检查浏览器存储设置。'));tx.onerror=()=>fail(tx?.error);
   tx.oncomplete=()=>{if(finished)return;finished=true;clearTimeout(timer);db?.close();resolve(result)};
   const store=tx.objectStore('state'),read=store.get('play');read.onsuccess=()=>{try{const state:State=read.result??initialPlayState();if(state.snapshot?.profile?.user_id!==PLAY_OWNER)throw Error('本地试玩记录需要检查；没有覆盖原记录。');result=run(state,tx!.objectStore('files'));store.put(state,'play')}catch(error){fail(error)}};
  };
 });
}
export async function readPlayFile(path:string):Promise<Blob>{
 const request=await playTransaction((_state,files)=>files.get(path));
 if(!(request.result instanceof Blob))throw Error('本地照片暂时没有找到。');return request.result;
}
