export const ACCOUNT_PREVIEW_SESSION='bc-shop:account-session:preview:v1';
export const ACCOUNT_FALLBACK_NAME='一个坏小孩';
export function accountName(input){
 if(typeof input!=='string')throw Error('给自己取一个名字吧。');
 const display=input.normalize('NFKC').trim().replace(/ +/g,' '),length=Array.from(display).length;
 if(length<2||length>16||! /^[\p{L}\p{N}_· -]+$/u.test(display))throw Error('名字用 2–16 个字，可以用中文、字母、数字、空格或下划线。');
 const canonical=display.toLowerCase();
 if(['admin','administrator','官方','管理员','bad children shop'].includes(canonical))throw Error('这个名字留给店里使用，换一个属于你的吧。');
 return {display,canonical};
}
export function accountPassword(input){
 if(typeof input!=='string'||Array.from(input).length<6||new TextEncoder().encode(input).length>72)throw Error('密码至少 6 个字符，最长 72 字节。');
 return input;
}
export function recoveryToken(input){
 if(typeof input!=='string')throw Error('请填写找回码。');
 const value=input.replace(/[-\s]/g,'').toLowerCase();
 if(!/^[a-f0-9]{64}$/.test(value))throw Error('名字或找回码不正确。');return value;
}
export function validCapsules(input,knownIds,now=Date.now()){
 if(!Array.isArray(input)||input.length>2000)throw Error('一次最多带上 2000 枚收藏。');
 const seen=new Set();return input.map(item=>{
  if(!item||typeof item.id!=='string'||! /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(item.id)||!knownIds.includes(item.toy_id)||!Number.isFinite(Date.parse(item.obtained_at))||Date.parse(item.obtained_at)>now+60000)throw Error('这份收藏记录无法识别，原记录没有改动。');
  if(seen.has(item.id))return null;seen.add(item.id);return {id:item.id,toy_id:item.toy_id,obtained_at:new Date(item.obtained_at).toISOString()};
 }).filter(Boolean);
}
export function safeDocument(key,value){
 if(!['nest','postcards'].includes(key)||!value||typeof value!=='object'||JSON.stringify(value).length>250000)throw Error('保存内容不符合要求。');
 return value;
}
