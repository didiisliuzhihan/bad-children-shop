/** Continuous world-space placement. Spawn search is not a placement grid. */
export const NEST_ROOM_ID='furnished-nest-v2';
// A new room keeps the earlier temporary-room draft intact under its old key.
export const NEST_LAYOUT_KEY='bc-shop:nest-layout:preview:furnished-v2';
const PREVIOUS_LAYOUT_KEY='bc-shop:nest-layout:preview:initial-v1';
export const NEST_BOUNDS=Object.freeze({minX:-4.5,maxX:4.5,minZ:-4.5,maxZ:4.5});
export const NEST_OBSTACLES=Object.freeze([
 Object.freeze({id:'sofa',x:-3.59,z:-.55,halfX:1.06,halfZ:2.18}),
 Object.freeze({id:'stove',x:-3.64,z:3.6,halfX:1.10,halfZ:.99}),
 Object.freeze({id:'bookcase',x:2.63,z:-4.02,halfX:1.9,halfZ:.63}),
 Object.freeze({id:'floor-lamp',x:-3,z:-3.28,radius:.38}),
 Object.freeze({id:'stairs',x:1.875,z:4.21,halfX:1.30,halfZ:.90}),
 Object.freeze({id:'landing-rail',x:-.90,z:4.70,halfX:1.55,halfZ:.10}),
]);
export const RESIDENT_BASE_RADIUS=.94;
export const RESIDENT_SCALE=1.5;
export const RESIDENT_RADIUS=RESIDENT_BASE_RADIUS*RESIDENT_SCALE;
export const RESIDENT_GAP=.08;
const forbidden=new Set(['__proto__','prototype','constructor']);
export function rotationAngle(value){if(value>=0&&value<Math.PI*2)return value;return ((value%(Math.PI*2))+Math.PI*2)%(Math.PI*2);}
export function constrainPosition(x,z,radius=RESIDENT_RADIUS){return {x:Math.max(NEST_BOUNDS.minX+radius,Math.min(NEST_BOUNDS.maxX-radius,x)),z:Math.max(NEST_BOUNDS.minZ+radius,Math.min(NEST_BOUNDS.maxZ-radius,z))};}
export function placementFits(candidate,placements){
 if(!Number.isFinite(candidate.x)||!Number.isFinite(candidate.z))return false;
 const p=constrainPosition(candidate.x,candidate.z);
 if(Math.abs(candidate.x-p.x)>1e-7||Math.abs(candidate.z-p.z)>1e-7)return false;
 if(NEST_OBSTACLES.some(obstacle=>{
  if('radius' in obstacle)return Math.hypot(candidate.x-obstacle.x,candidate.z-obstacle.z)<RESIDENT_RADIUS+obstacle.radius+RESIDENT_GAP;
  const dx=Math.max(0,Math.abs(candidate.x-obstacle.x)-obstacle.halfX),dz=Math.max(0,Math.abs(candidate.z-obstacle.z)-obstacle.halfZ);
  return Math.hypot(dx,dz)<RESIDENT_RADIUS+RESIDENT_GAP;
 }))return false;
 return placements.every(other=>other.toyId===candidate.toyId||Math.hypot(candidate.x-other.x,candidate.z-other.z)>=RESIDENT_RADIUS*2+RESIDENT_GAP-1e-7);
}
export function moveResident(placements,toyId,x,z){
 const current=placements.find(p=>p.toyId===toyId);if(!current||!Number.isFinite(x)||!Number.isFinite(z))return placements;
 const candidate={...current,...constrainPosition(x,z)};if(!placementFits(candidate,placements))return placements;
 return placements.map(p=>p.toyId===toyId?candidate:p);
}
export function rotateResident(placements,toyId,delta){if(!Number.isFinite(delta))return placements;return placements.map(p=>p.toyId===toyId?{...p,rotation:rotationAngle(p.rotation+delta)}:p);}
function freePosition(toyId,placements,origin={x:0,z:.8,rotation:0}){
 const start={toyId,...origin,...constrainPosition(origin.x,origin.z)};if(placementFits(start,placements))return start;
 const candidates=[],low=constrainPosition(-Infinity,-Infinity),high=constrainPosition(Infinity,Infinity);
 const columns=Math.ceil((high.x-low.x)/.2),rows=Math.ceil((high.z-low.z)/.2);
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++)candidates.push({toyId,x:low.x+(high.x-low.x)*i/columns,z:low.z+(high.z-low.z)*j/rows,rotation:origin.rotation});
 candidates.sort((a,b)=>Math.hypot(a.x-origin.x,a.z-origin.z)-Math.hypot(b.x-origin.x,b.z-origin.z));return candidates.find(p=>placementFits(p,placements));
}
export function placeResident(placements,toyId,eligible){
 if(!eligible.includes(toyId)||forbidden.has(toyId)||placements.some(p=>p.toyId===toyId))return placements;
 const next=freePosition(toyId,placements);return next?[...placements,next]:placements;
}
export function validateLayout(value,ownedIds,relocate=false){
 if(!value||value.version!==1||value.roomId!==NEST_ROOM_ID||!Array.isArray(value.placements))return null;
 const result=[];const seen=new Set();
 for(const entry of value.placements){
  if(!entry||typeof entry.toyId!=='string'||forbidden.has(entry.toyId)||seen.has(entry.toyId)||!ownedIds.includes(entry.toyId))continue;
  if(!Number.isFinite(entry.x)||!Number.isFinite(entry.z)||!Number.isFinite(entry.rotation))continue;
  const p={toyId:entry.toyId,...constrainPosition(entry.x,entry.z),rotation:rotationAngle(entry.rotation)};
  const fitted=placementFits(p,result)?p:relocate?freePosition(entry.toyId,result,p):null;
  if(fitted){seen.add(entry.toyId);result.push(fitted);}
 }return result;
}
export function readLayout(storage,ownedIds){try{
 let raw=storage.getItem(NEST_LAYOUT_KEY),migrated=false;
 if(!raw){raw=storage.getItem(PREVIOUS_LAYOUT_KEY);migrated=!!raw;}
 if(!raw)return {placements:[],error:false,adjusted:false,unplaced:0};
 const original=JSON.parse(raw),value=migrated&&original.roomId==='initial-nest-v1'?{...original,roomId:NEST_ROOM_ID}:original;
 const placements=validateLayout(value,ownedIds,true);
 const validIds=new Set((Array.isArray(value.placements)?value.placements:[]).filter(p=>p&&ownedIds.includes(p.toyId)&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(p.rotation)).map(p=>p.toyId));
 return {placements:placements||[],error:!placements,unplaced:placements?Math.max(0,validIds.size-placements.length):0,adjusted:!!placements&&(migrated||placements.some(p=>{const old=value.placements.find(entry=>entry?.toyId===p.toyId);return old.x!==p.x||old.z!==p.z;}))};
 }catch{return {placements:[],error:true,adjusted:false,unplaced:0};}}
export function saveLayout(storage,placements,eligibleIds){const value={version:1,roomId:NEST_ROOM_ID,placements},validated=validateLayout(value,eligibleIds);if(!validated||validated.length!==placements.length)return false;try{storage.setItem(NEST_LAYOUT_KEY,JSON.stringify({...value,placements:validated}));return true;}catch{return false;}}
