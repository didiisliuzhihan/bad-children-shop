import type {AccountSnapshot,AccountDocument} from './AccountContext';
import type {Capsule} from '../types';
import type {PrivateStory} from './nestLifeTypes';

export type AccountPatch={ownerId:string;capsules?:Capsule[];stories?:PrivateStory[];document?:AccountDocument};
/** Client response-isolation key only; the server still verifies tokens and epochs. */
export function accountSessionKey(session:{user:{id:string};access_token:string}|null){
 if(!session)return '';
 try{const claims=JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(typeof claims.session_id==='string')return session.user.id+':'+claims.session_id}
 catch{}return session.user.id+':'+session.access_token;
}
/** Only server-confirmed records enter the collection. Stable IDs make retries safe. */
export function applyAccountPatch(previous:AccountSnapshot|null,patch:AccountPatch):AccountSnapshot|null{
 if(!previous||previous.profile.user_id!==patch.ownerId)return previous;
 const append=<T extends {id:string}>(old:T[],incoming:T[])=>{const values=new Map(old.map(item=>[item.id,item]));for(const item of incoming)values.set(item.id,item);return [...values.values()]};
 const documents={...previous.documents},doc=patch.document;
 if(doc&&doc.revision>=(documents[doc.key]?.revision??-1))documents[doc.key]=doc;
 return {...previous,documents,
  capsules:patch.capsules?append(previous.capsules,patch.capsules.map(item=>({...item,synced:true}))).sort((a,b)=>b.obtained_at.localeCompare(a.obtained_at)):previous.capsules,
  stories:patch.stories?append(previous.stories||[],patch.stories):previous.stories};
}
