/** Local UI foundation only. These selectors never change capsule ownership. */
export const TICKET_LIMIT=80;
export const STOCK_NOTES=Object.freeze([
 '这张明信片，替我陪你坐一会儿。',
 '今天不太想长大，也可以。',
 '你不用很厉害，也值得被好好收留。',
 '如果今天没电了，就先充一会儿自己。',
 '把眉头松开一点，坏小孩也有休息日。',
 '没有标准答案，要不一起发会儿呆？',
 '今天的小事：给自己留一口喜欢的甜。',
 '不知道说什么，就偷偷祝你开心。',
]);
/** @template {{id:string,toy_id:string,obtained_at:string}} C
 * @template {{id:string}} T
 * @param {C[]} capsules @param {T[]} toys */
export function homeResidents(capsules,toys){
 const owned=new Map();
 for(const item of capsules){
  const current=owned.get(item.toy_id);
  if(!current)owned.set(item.toy_id,{item,count:1});
  else {current.count++;if(item.obtained_at<current.item.obtained_at)current.item=item;}
 }
 // Catalog order keeps positions stable when a duplicate is collected.
 return toys.filter((toy,index)=>owned.has(toy.id)&&toys.findIndex(t=>t.id===toy.id)===index)
  .map(toy=>({toy,...owned.get(toy.id)}));
}
export function noteLength(text){return Array.from(text).length;}
export function validateNote(text){
 if(typeof text!=='string'||!text.trim())return '先留下一句话吧。';
 if(noteLength(text.trim())>TICKET_LIMIT)return `明信片最多写 ${TICKET_LIMIT} 个字。`;
 return '';
}
export function chooseNotes(previous=[],random=Math.random){
 const candidates=STOCK_NOTES.filter(note=>!previous.includes(note));
 for(let i=candidates.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
 return candidates.slice(0,3);
}
/** Stored as literal text, never interpreted as markup or an instruction. */
export function makeTicketDraft(text,signature,stampId,id,now){
 const error=validateNote(text);if(error)throw new Error(error);
 return {id,text:text.trim(),signature:Array.from(signature.trim()).slice(0,16).join('')||'一个坏小孩',stampId,status:'local-draft',createdAt:now};
}
