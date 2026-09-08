export type NestMoodBubble={x:number;y:number;kind:'sleep'|'confused';id:string;leaving:boolean};
export function NestStatusBubble({mood}:{mood:NestMoodBubble}){
 return <div className={'nest-status-bubble'+(mood.leaving?' is-leaving':'')} style={{left:mood.x+'%',top:mood.y+'%'}} aria-hidden="true">
  <svg viewBox="0 0 88 72" aria-hidden="true">
   {mood.kind==='sleep'?<>
    <path className="nest-status-outline" d="M10 36C7 19 24 8 43 8C63 7 79 17 80 33C82 50 68 59 41 60L29 61L25 66L23 58C16 54 12 47 10 36Z"/>
    <path d="M20 30L29 28L23 39L33 37M38 28L48 28L40 42L51 40M58 32L65 32L60 41L68 39"/>
   </>:<>
    <path className="nest-status-outline" d="M14 48C6 32 13 15 31 9C52 1 75 13 79 32C85 54 66 67 46 66C37 66 30 64 26 61L11 65L19 52"/>
    <path d="M27 40C12 25 29 15 44 20C65 25 55 47 35 42C19 38 25 20 47 22C70 24 65 49 43 48C25 47 31 30 51 33C70 35 65 55 47 53C28 52 30 36 45 31C60 26 66 44 54 51C43 58 30 43 37 35C45 23 59 39 51 53L45 56"/>
   </>}
  </svg>
 </div>;
}
