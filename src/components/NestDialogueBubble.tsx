import {useState} from 'react';
export type NestBubble={x:number;y:number;line:string;id:string};
export function NestDialogueBubble({bubble}:{bubble:NestBubble}){
 const [expanded,setExpanded]=useState(false);
 return <div className="nest-life-anchor" style={{left:bubble.x+'%',top:bubble.y+'%'}}>
  <button type="button" className="nest-life-bubble" onClick={()=>setExpanded(value=>!value)} aria-expanded={expanded} aria-label={expanded?'收起小住客的话':'看看小住客想说什么'}>
   <svg className="nest-life-outline" viewBox="0 0 88 72" preserveAspectRatio="none" aria-hidden="true"><path d="M12 61C10 53 7 43 9 32C11 17 24 7 39 6C52 5 68 11 76 21C84 31 83 44 75 52C65 62 48 61 34 59C24 57 19 58 12 61Z"/></svg>
   <span className="nest-life-dots" aria-hidden="true">···</span>
   <span className="nest-life-line" aria-hidden={!expanded}><span><em>{bubble.line}</em></span></span>
  </button>
 </div>;
}
