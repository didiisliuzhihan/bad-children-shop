/** A gentle, self-confirmed ritual, not an anti-cheat or album permission system.
 * Absolute timestamps survive suspension/reloads. No ticking timer is persisted.
 */
export const QUEST_WAIT_MS=10*60*1000;
export const QUEST_KEY='bc-shop:toy-quests:v1';
/** @typedef {{savedAt:number,unlockedAt?:number}} QuestRecord */
/** @param {unknown} value @returns {QuestRecord|null} */
export function validRecord(value){
 if(!value||typeof value!=='object')return null;
 const r=/** @type {QuestRecord} */(value);
 if(!Number.isFinite(r.savedAt)||r.savedAt<=0)return null;
 return {savedAt:r.savedAt,...(Number.isFinite(r.unlockedAt)&&Number(r.unlockedAt)>=r.savedAt+QUEST_WAIT_MS?{unlockedAt:r.unlockedAt}:{})};
}
/** @param {QuestRecord|null} record @param {number} [now] */
export function questStage(record,now=Date.now()){
 const r=validRecord(record);
 if(!r)return 'unsaved';
 if(r.unlockedAt)return 'unlocked';
 return now>=r.savedAt+QUEST_WAIT_MS?'ready':'waiting';
}
/** @param {QuestRecord|null} record @param {number} [now] */
export function remainingQuestMs(record,now=Date.now()){return record?Math.max(0,record.savedAt+QUEST_WAIT_MS-now):QUEST_WAIT_MS}
/** @param {Pick<Storage,'getItem'>} storage @param {string} toyId */
export function readQuest(storage,toyId){
 try{const all=JSON.parse(storage.getItem(QUEST_KEY)||'{}');return Object.hasOwn(all,toyId)?validRecord(all[toyId]):null}catch{return null}
}
/** @param {Pick<Storage,'getItem'|'setItem'>} storage @param {string} toyId @param {'save'|'unlock'} action @param {number} [now] */
export function updateQuest(storage,toyId,action,now=Date.now()){
 try{
  if(!toyId||['__proto__','constructor','prototype'].includes(toyId)||!Number.isFinite(now)||now<=0)return false;
  const raw=storage.getItem(QUEST_KEY);
  const parsed=raw?JSON.parse(raw):{};
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return false;
  /** @type {Record<string,QuestRecord>} */ const records={};
  for(const [id,value] of Object.entries(parsed)){const valid=validRecord(value);if(valid&&!['__proto__','constructor','prototype'].includes(id))records[id]=valid;}
  const current=records[toyId]||null;
  if(action==='unlock'&&!['ready','unlocked'].includes(questStage(current,now)))return false;
  records[toyId]=action==='save'?(current||{savedAt:now}):{...current,savedAt:current.savedAt,unlockedAt:current.unlockedAt||now};
  storage.setItem(QUEST_KEY,JSON.stringify(records));
  return true;
 }catch{return false}
}

/** Distinct visited brush cells prevent a stationary tap from clearing the fog. */
export class WipeCoverage{
 cells=new Set();columns=28;rows=28;
 /** @param {number} x @param {number} y @param {number} radius */
 add(x,y,radius){
  for(let row=0;row<this.rows;row++)for(let col=0;col<this.columns;col++){
   if(Math.hypot((col+.5)/this.columns-x,(row+.5)/this.rows-y)<=radius)this.cells.add(row*this.columns+col);
  }
  return this.cells.size/(this.columns*this.rows);
 }
}
