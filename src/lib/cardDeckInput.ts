/** Shared gesture policy: ambiguous/vertical gestures always belong to the page. */
export type DeckAxis='pending'|'horizontal'|'vertical';
export function deckAxis(dx:number,dy:number,current:DeckAxis='pending'):DeckAxis{
 if(current!=='pending')return current;
 if(Math.max(Math.abs(dx),Math.abs(dy))<10)return 'pending';
 return Math.abs(dx)>Math.abs(dy)*1.3?'horizontal':'vertical';
}
export function deckStep(dx:number,width:number):number{
 const threshold=Math.max(42,Math.min(88,width*.22));
 return Math.abs(dx)>=threshold?(dx<0?1:-1):0;
}
export function deckIndex(index:number,step:number,count:number):number{
 return count>0?((index+step)%count+count)%count:0;
}
export function deckWindow(index:number,count:number,direction=1):number[]{
 return Array.from({length:Math.min(3,Math.max(0,count))},(_,depth)=>deckIndex(index,depth*direction,count));
}
