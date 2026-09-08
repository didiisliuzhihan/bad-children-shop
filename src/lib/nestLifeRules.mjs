// Public performance directions only. Unrevealed story copy lives on the server.
export const LIFE_DURATION=12000;
export const LIFE_PAIRS=[
 {id:'soup',actors:['miss_popcorn','tired_crow'],speaker:'tired_crow',line:'鸦已经在精神上帮忙了。',prop:'cup'},
 {id:'tea',actors:['jimao','kuku_sunflower'],speaker:'kuku_sunflower',line:'没有聊出什么解决办法，不过一起坐了会儿。',prop:'cups'},
 {id:'book',actors:['stressed_jimao','tired_crow'],speaker:'stressed_jimao',line:'翻了三页，决定明天再努力。',prop:'book'},
];
export const LIFE_SOLOS=[
 ['solo_jimao','jimao','cup','这一杯，给好好待着的自己。'],
 ['solo_kuku','kuku_sunflower','cup','今天先不急着开花。'],
 ['solo_stressed','stressed_jimao','book','这页先夹着，雷也歇一会儿。'],
 ['solo_popcorn','miss_popcorn','cup','这次真的只煮自己的份。'],
 ['solo_crow','tired_crow','book','休息这件事，鸦很认真。'],
].map(([id,speaker,prop,line])=>({id,speaker,actors:[speaker],prop,line}));
export function eligibleMoments(placements){return [...eligibleLife(placements),...LIFE_SOLOS.filter(e=>placements.some(p=>p.toyId===e.speaker))];}
export function eligibleLife(placements){
 return LIFE_PAIRS.filter(event=>{const [a,b]=event.actors.map(id=>placements.find(p=>p.toyId===id));return a&&b&&[a.x,a.z,b.x,b.z].every(Number.isFinite)&&Math.hypot(a.x-b.x,a.z-b.z)<=4.6;});
}
export function lifeDirection(kind){return [...LIFE_PAIRS,...LIFE_SOLOS].find(e=>e.id===kind);}
export function idlePose(id,t,reduced=false){
 if(reduced)return {y:0,roll:0,turn:0};
 const wave=(speed,phase=0)=>Math.sin(t*speed+phase);
 switch(id){
  case 'jimao':return {y:Math.max(0,wave(.9))*.025,roll:wave(.7)*.012,turn:0};
  case 'kuku_sunflower':return {y:0,roll:wave(.6,1)*.025,turn:wave(.4)*.015};
  case 'stressed_jimao':return {y:Math.max(0,wave(.65,2))*.018,roll:wave(.8)*.014,turn:wave(.3)*.025};
  case 'miss_popcorn':return {y:0,roll:wave(.7,3)*.009,turn:wave(.45)*.025};
  default:return {y:0,roll:wave(.35)*.006,turn:wave(.3,2)*.012};
 }
}
export function eventEnvelope(seconds){const smooth=t=>t*t*(3-2*t);return smooth(Math.min(1,Math.max(0,(seconds-2)/2)))*(1-smooth(Math.min(1,Math.max(0,(seconds-9)/3))));}
