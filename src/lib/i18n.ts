import {useSyncExternalStore} from 'react';
import {translateText} from './locale/en.mjs';
export type Language='zh'|'en';
const KEY='bc-language-v1',listeners=new Set<()=>void>();
function initial():Language{try{const value=localStorage.getItem(KEY);return value==='en'?'en':'zh'}catch{return 'zh'}}
let language:Language=initial();
export const getLanguage=()=>language;
const subscribe=(callback:()=>void)=>{listeners.add(callback);return()=>{listeners.delete(callback)}};
export function useLanguage(){return useSyncExternalStore(subscribe,getLanguage,()=> 'zh' as Language)}
export function setLanguage(next:Language){if(next!=='zh'&&next!=='en')return;if(next===language)return;language=next;try{localStorage.setItem(KEY,next)}catch{};syncDocument();listeners.forEach(callback=>callback())}
function syncDocument(){if(typeof document!=='undefined'){document.documentElement.lang=language==='en'?'en':'zh-CN';document.documentElement.dataset.language=language;}}
if(typeof window!=='undefined')window.addEventListener('storage',event=>{if(event.key===KEY){const next=event.newValue==='en'?'en':'zh';if(next!==language){language=next;syncDocument();listeners.forEach(callback=>callback())}}});
syncDocument();
/** Presentation only. Never pass player-authored messages or nicknames here. */
export function tx<T>(value:T):T{return (typeof value==='string'?translateText(value,language):value) as T}
export function dateLabel(date:string|number|Date,locale:Language=language){const value=new Date(date);return Number.isNaN(value.getTime())?'':value.toLocaleDateString(locale==='en'?'en-US':'zh-CN');}
