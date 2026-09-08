import {validateNote} from './communityDraft.mjs';
import {defaultStamp} from './communityTypes.ts';
import type {NestSnapshot,PostcardDraft,PostcardMedia} from './postcardTypes';

export function makePlayerPostcard(text:string,signature:string,media:PostcardMedia|null,id:string,now:string):Extract<PostcardDraft,{source:'player'}>{
 const error=validateNote(text);if(error)throw Error(error);
 return {id,source:'player',text:text.trim(),signature:Array.from(signature.trim()).slice(0,16).join('')||'一个坏小孩',stampId:defaultStamp.id,media,createdAt:now,status:'local-draft'};
}
export function makeNestPostcard(text:string,snapshot:NestSnapshot,id:string):PostcardDraft{
 const error=validateNote(text);if(error)throw Error(error);
 if(snapshot.media.origin!=='nest-capture')throw Error('先拍下真实的小窝，再留住这一刻。');
 return {id,source:'nest',text:text.trim(),media:snapshot.media,snapshotId:snapshot.id,createdAt:snapshot.createdAt,status:'local-draft'};
}
export function postcardCaption(timeOfDay:'day'|'night',residentCount:number){
 if(!residentCount)return timeOfDay==='night'?'灯已经亮了，等第一位小住客回家。':'太阳先来坐了一会儿。';
 return timeOfDay==='night'?'灯还亮着，今天就慢慢收尾吧。':'今天没有大事，大家在这里待了一会儿。';
}
