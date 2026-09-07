import type {Capsule,Toy} from '../types';
import {ensureQuestFont,QUEST_FONT_FAMILY} from './questFont';

export const CARD_SIZE={width:1080,height:1440};
const imageCache=new Map<string,Promise<HTMLImageElement>>();
async function decodedImage(url:string):Promise<HTMLImageElement>{
  if(!imageCache.has(url))imageCache.set(url,(async()=>{
    let failure:unknown;
    for(let attempt=0;attempt<2;attempt++){
      const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
      let objectUrl:string|undefined;
      try{
        const response=await fetch(url,{mode:'cors',credentials:'omit',signal:abort.signal,cache:attempt?'reload':'default'});
        if(!response.ok)throw Error(`Image HTTP ${response.status}`);
        const blob=await response.blob();if(!blob.size)throw Error('Image is empty');
        objectUrl=URL.createObjectURL(blob);const img=new Image();img.decoding='sync';img.src=objectUrl;
        await img.decode();if(!img.naturalWidth||!img.naturalHeight)throw Error('Image has no pixels');
        return img;
      }catch(error){failure=error}
      finally{clearTimeout(timer);if(objectUrl)URL.revokeObjectURL(objectUrl)}
    }
    throw failure;
  })().catch(error=>{imageCache.delete(url);throw error}));
  return imageCache.get(url)!;
}
function rounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function lines(ctx:CanvasRenderingContext2D,text:string,width:number){
  const result:string[]=[];let line='';
  for(const char of Array.from(text)){if(line&&ctx.measureText(line+char).width>width){result.push(line);line=char}else line+=char}
  if(line)result.push(line);return result;
}
function fitFont(ctx:CanvasRenderingContext2D,text:string,max:number,min:number,width:number,weight=600,family='Inter,"Microsoft YaHei","PingFang SC",sans-serif'){
  let size=max;ctx.font=`${weight} ${size}px ${family}`;
  while(size>min&&ctx.measureText(text).width>width){size--;ctx.font=`${weight} ${size}px ${family}`}
}
/** Independent 3:4 canvas composition: never screenshots a responsive/lazy DOM node.
 * Image download and decode must succeed before any PNG can be offered to the user.
 */
export async function renderCollectibleCard(toy:Toy,item:Capsule):Promise<Blob>{
  const [img]=await Promise.all([decodedImage(toy.icon_url),ensureQuestFont()]);
  await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,4000))]);
  const canvas=document.createElement('canvas');canvas.width=CARD_SIZE.width;canvas.height=CARD_SIZE.height;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas is unavailable');
  ctx.fillStyle='#f0f2ea';ctx.fillRect(0,0,1080,1440);
  const color=/^#[0-9a-f]{6}$/i.test(toy.color)?toy.color:'#d6e3e5';
  rounded(ctx,36,36,1008,790,42);ctx.fillStyle=color;ctx.fill();ctx.save();ctx.clip();
  const light=ctx.createRadialGradient(505,310,20,510,390,760);light.addColorStop(0,'rgba(255,255,255,.62)');light.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=light;ctx.fillRect(36,36,1008,790);
  ctx.fillStyle='#284550';ctx.font='500 23px Inter,sans-serif';ctx.fillText('THE LITTLE MISFITS',80,91);ctx.textAlign='right';ctx.fillText(toy.number,998,91);ctx.textAlign='left';
  const scale=Math.min(890/img.naturalWidth,665/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;
  ctx.shadowColor='rgba(48,63,61,.13)';ctx.shadowBlur=23;ctx.shadowOffsetY=15;ctx.drawImage(img,540-w/2,145+(640-h)/2,w,h);ctx.restore();
  ctx.fillStyle='#173846';fitFont(ctx,toy.name_zh,58,39,908);ctx.fillText(toy.name_zh,80,915);
  ctx.fillStyle='#70838a';fitFont(ctx,toy.name_en,32,23,908,450,'Fredoka,Inter,sans-serif');ctx.fillText(toy.name_en,80,969);
  ctx.strokeStyle='#24495424';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(80,1011);ctx.lineTo(1000,1011);ctx.stroke();
  const parts=toy.tagline_zh.replace(/（任务）|\(任务\)/g,'').split(/——|—|--/);
  const statement=parts.shift()?.trim().replace(/[。！!]$/,'')||'',quest=parts.join('——').trim().replace(/[。！!]$/,'');
  ctx.font='500 36px Inter,"Microsoft YaHei","PingFang SC",sans-serif';ctx.fillStyle='#284653';
  let y=1077;for(const line of lines(ctx,statement,910)){ctx.fillText(line,80,y);y+=54}
  y+=24;ctx.font=`400 43px ${QUEST_FONT_FAMILY}`;ctx.fillStyle='#ba1200';
  for(const line of lines(ctx,quest,910)){ctx.fillText(line,80,y);y+=62}
  if(y>1330)throw Error('Card copy is too long for this template');
  ctx.font='400 26px Inter,sans-serif';ctx.fillStyle='#899b9d';ctx.fillText(new Date(item.obtained_at).toLocaleDateString('zh-CN'),80,1365);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?.size?resolve(blob):reject(Error('PNG encoding failed')),'image/png'));
}
