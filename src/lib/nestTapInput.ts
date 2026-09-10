type Contact={pointerId:number;isPrimary:boolean;button:number;clientX:number;clientY:number};
type Options={enabled:()=>boolean;hit:(x:number,y:number)=>string|null;play:(target:string)=>void;now?:()=>number};
/** Passive contact tracking only. A scroll/pinch/drag never becomes a sound. */
export function createNestTapInput(options:Options){
 const now=options.now||(()=>performance.now());
 let contact:{id:number;target:string;x:number;y:number;at:number}|null=null;
 const cancel=()=>{contact=null};
 return {cancel,down(event:Contact){
  if(!event.isPrimary||event.button!==0){cancel();return;}
  if(!options.enabled())return;const target=options.hit(event.clientX,event.clientY);
  contact=target?{id:event.pointerId,target,x:event.clientX,y:event.clientY,at:now()}:null;
 },move(event:Contact){
  if(contact&&event.pointerId===contact.id&&Math.hypot(event.clientX-contact.x,event.clientY-contact.y)>8)cancel();
 },up(event:Contact){
  const previous=contact;cancel();
  if(!previous||event.pointerId!==previous.id||!options.enabled()||!event.isPrimary||now()-previous.at>600||Math.hypot(event.clientX-previous.x,event.clientY-previous.y)>8)return;
  if(options.hit(event.clientX,event.clientY)===previous.target)options.play(previous.target);
 }};
}
