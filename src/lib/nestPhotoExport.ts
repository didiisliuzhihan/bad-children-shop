import {toBlob} from 'html-to-image';
import {asset} from '../assets';

let embeddedFont:Promise<string>|undefined;
/** FontFace registrations are not in stylesheets; embed the same font explicitly. */
async function keepsakeFont(){
 if(!embeddedFont)embeddedFont=(async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch(asset('zcool-kuaile.woff2'),{signal:controller.signal,credentials:'omit'});
   if(!response.ok)throw Error('留念字体暂时无法读取。');
   const blob=await response.blob();if(!blob.size)throw Error('留念字体为空。');
   const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('留念字体暂时无法嵌入。'));reader.readAsDataURL(blob)});
   return `@font-face{font-family:'BC Quest';src:url("${data}") format('woff2');font-weight:400;font-style:normal;}`;
  }finally{clearTimeout(timer)}
 })().catch(error=>{embeddedFont=undefined;throw error});
 return embeddedFont;
}
export async function renderNestKeepsake(node:HTMLElement){
 return toBlob(node,{pixelRatio:2,backgroundColor:'#f6ecd7',fontEmbedCSS:await keepsakeFont()});
}
