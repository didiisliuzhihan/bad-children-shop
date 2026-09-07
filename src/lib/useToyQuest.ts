import {useCallback,useEffect,useState} from 'react';
import {QUEST_KEY,QUEST_WAIT_MS,questStage,readQuest,remainingQuestMs,updateQuest} from './questProgress.mjs';
const CHANGED='bc-quest-changed';
export const questPreview=['127.0.0.1','localhost'].includes(location.hostname)&&!!document.querySelector('meta[name="bc-quest-preview"]');
const storageKey=questPreview?QUEST_KEY+':preview':QUEST_KEY;
const storage={getItem:()=>localStorage.getItem(storageKey),setItem:(_key:string,value:string)=>localStorage.setItem(storageKey,value)};
export function useToyQuest(toyId:string){
 const read=()=>{try{return readQuest(storage,toyId)}catch{return null}};
 const [record,setRecord]=useState(read),[now,setNow]=useState(Date.now);
 const refresh=useCallback(()=>{setRecord(read());setNow(Date.now())},[toyId]);
 useEffect(()=>{
  refresh();const changed=(e:StorageEvent)=>{if(e.key===storageKey||e.key===null)refresh()};
  const visible=()=>{if(document.visibilityState==='visible')refresh()};
  window.addEventListener('storage',changed);window.addEventListener(CHANGED,refresh);window.addEventListener('pageshow',refresh);document.addEventListener('visibilitychange',visible);
  return()=>{window.removeEventListener('storage',changed);window.removeEventListener(CHANGED,refresh);window.removeEventListener('pageshow',refresh);document.removeEventListener('visibilitychange',visible)};
 },[refresh]);
 const stage=questStage(record,now);
 useEffect(()=>{if(stage!=='waiting')return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[stage]);
 const commit=useCallback((action:'save'|'unlock')=>{
  let ok=false;try{ok=updateQuest(storage,toyId,action)}catch{/* Storage can be disabled. Never claim durable success. */}
  if(ok){refresh();window.dispatchEvent(new Event(CHANGED))}return ok;
 },[toyId,refresh]);
 const skipPreviewWait=()=>{
  if(!questPreview)return;
  try{const current=read();if(questStage(current)!=='waiting')return;const all=JSON.parse(localStorage.getItem(storageKey)||'{}');all[toyId]={savedAt:Date.now()-QUEST_WAIT_MS-1};localStorage.setItem(storageKey,JSON.stringify(all));refresh();window.dispatchEvent(new Event(CHANGED))}catch{/* Preview cannot modify real quest storage. */}
 };
 return {record,stage,remaining:remainingQuestMs(record,now),confirmSaved:()=>commit('save'),unlock:()=>commit('unlock'),skipPreviewWait};
}
