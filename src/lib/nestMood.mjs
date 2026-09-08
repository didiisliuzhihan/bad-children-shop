// Local decorative state only. This never calls life/reward/account APIs.
export const NEST_MOODS=Object.freeze({tired_crow:'sleep',kuku_sunflower:'confused',miss_popcorn:'confused'});
export function createNestMoodSchedule(random=Math.random){
 let next=0,current=null,last=null;
 return {update(now,placed,blocked=false){
  const eligible=placed.filter(id=>NEST_MOODS[id]);
  if(last===null||now-last>5000){current=null;next=now+8000+random()*8000;}last=now;
  if(blocked||!eligible.length){current=null;next=now+8000+random()*8000;return null;}
  if(current&&!eligible.includes(current.toyId))current=null;
  if(current&&now>=current.until){current=null;next=now+30000+random()*25000;}
  if(!current&&now>=next){const toyId=eligible[Math.floor(random()*eligible.length)];current={toyId,kind:NEST_MOODS[toyId],id:'mood-'+now,until:now+6500+random()*2000};}
  return current?{...current,leaving:now>current.until-800}:null;
 }};
}
