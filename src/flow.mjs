export const NEXT={IDLE:['SPINNING'],SPINNING:['LOCKING'],LOCKING:['DROPPING'],DROPPING:['PAUSE'],PAUSE:['SEALED'],SEALED:['REVEALED'],REVEALED:['DECISION'],DECISION:['COLLECTED','REJECTED'],COLLECTED:['IDLE'],REJECTED:['IDLE']};
export function canTransition(from,to){return (NEXT[from]||[]).includes(to)}
export function dragProgress(start,current,width){return Math.max(0,Math.min(1,(current-start)/Math.max(65,Math.min(135,width*.1))))}
export function chooseToy(toys,random=Math.random){if(!toys.length)throw new Error('Empty toy catalog');return toys[Math.min(toys.length-1,Math.floor(random()*toys.length))]}
export function mergeCapsules(local,remote){const map=new Map();for(const x of [...local,...remote])map.set(x.id,x);return [...map.values()].sort((a,b)=>b.obtained_at.localeCompare(a.obtained_at))}
