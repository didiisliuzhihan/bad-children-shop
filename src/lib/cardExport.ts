import type {Capsule,Toy} from '../types';
import {ensureQuestFont,QUEST_FONT_FAMILY} from './questFont';

export const CARD_SIZE={width:1080,height:1440};
export const collectibleCardKey=(toy:Toy,item:Capsule)=>JSON.stringify([toy.id,toy.card_image_url,toy.icon_url,toy.name_zh,toy.name_en,toy.tagline_zh,toy.color,toy.number,new Date(item.obtained_at).toLocaleDateString('zh-CN')]);
const exportsCache=new Map<string,{promise:Promise<Blob>;blob?:Blob}>();
export function cachedCollectibleCard(key:string){return exportsCache.get(key)?.blob}
export function prepareCollectibleCard(toy:Toy,item:Capsule):Promise<Blob>{
 const key=collectibleCardKey(toy,item),existing=exportsCache.get(key);if(existing){exportsCache.delete(key);exportsCache.set(key,existing);return existing.promise}
 const entry:{promise:Promise<Blob>;blob?:Blob}={promise:renderCollectibleCard(toy,item)};exportsCache.set(key,entry);
 entry.promise=entry.promise.then(blob=>{entry.blob=blob;let bytes=[...exportsCache.values()].reduce((sum,value)=>sum+(value.blob?.size||0),0);
  for(const [old,value] of exportsCache){if(exportsCache.size<=8&&bytes<=16*1024*1024)break;if(value.blob){bytes-=value.blob.size;exportsCache.delete(old)}}return blob;
 }).catch(error=>{if(exportsCache.get(key)===entry)exportsCache.delete(key);throw error});return entry.promise;
}

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
        objectUrl=URL.createObjectURL(blob);const img=new Image();img.decoding='async';img.src=objectUrl;
        await new Promise<void>((resolve,reject)=>{
          const cancel=()=>reject(Error('Image decode timed out'));
          if(abort.signal.aborted){cancel();return}abort.signal.addEventListener('abort',cancel,{once:true});
          img.decode().then(resolve,reject).finally(()=>abort.signal.removeEventListener('abort',cancel));
        });if(!img.naturalWidth||!img.naturalHeight)throw Error('Image has no pixels');
        return img;
      }catch(error){failure=error}
      finally{clearTimeout(timer);if(objectUrl)URL.revokeObjectURL(objectUrl)}
    }
    throw failure;
  })().catch(error=>{imageCache.delete(url);throw error}));
  while(imageCache.size>6)imageCache.delete(imageCache.keys().next().value!);
  return imageCache.get(url)!;
}
function rounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function encodeCard(canvas:HTMLCanvasElement):Promise<Blob>{
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('PNG encoding timed out')),12000);
  try{canvas.toBlob(blob=>{clearTimeout(timer);blob?.size?resolve(blob):reject(Error('PNG encoding failed'))},'image/png')}
  catch(error){clearTimeout(timer);reject(error)}
 });
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
  const [img]=await Promise.all([decodedImage(toy.card_image_url||toy.icon_url),ensureQuestFont(1800).catch(()=>{})]);
  // A slow optional font cannot prevent viewing or exporting the actual card.
  const canvas=document.createElement('canvas');canvas.width=CARD_SIZE.width;canvas.height=CARD_SIZE.height;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas is unavailable');
  ctx.fillStyle='#f0f2ea';ctx.fillRect(0,0,1080,1440);
  const color=/^#[0-9a-f]{6}$/i.test(toy.color)?toy.color:'#d6e3e5';
  if(toy.card_image_url){
    // Full scene artwork: preserve every edge of the supplied render; never crop.
    rounded(ctx,36,36,1008,1008,42);ctx.fillStyle=color;ctx.fill();ctx.save();ctx.clip();
    const scale=Math.min(1008/img.naturalWidth,1008/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;
    ctx.drawImage(img,540-w/2,540-h/2,w,h);ctx.restore();
    rounded(ctx,64,62,305,53,25);ctx.fillStyle='rgba(242,247,240,.85)';ctx.fill();
    ctx.fillStyle='#284550';ctx.font='500 22px Inter,sans-serif';ctx.fillText('THE LITTLE MISFITS',82,96);
    rounded(ctx,945,62,70,53,25);ctx.fillStyle='rgba(242,247,240,.85)';ctx.fill();
    ctx.fillStyle='#284550';ctx.textAlign='center';ctx.fillText(toy.number,980,96);ctx.textAlign='left';
    ctx.fillStyle='#173846';fitFont(ctx,toy.name_zh,52,35,920);ctx.fillText(toy.name_zh,80,1116);
    ctx.fillStyle='#70838a';fitFont(ctx,toy.name_en,30,22,920,450,'Fredoka,Inter,sans-serif');ctx.fillText(toy.name_en,80,1162);
    ctx.strokeStyle='#24495424';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(80,1195);ctx.lineTo(1000,1195);ctx.stroke();
    const [statement,...task]=toy.tagline_zh.replace(/（任务）|\(任务\)/g,'').split(/——|--/);
    ctx.fillStyle='#284653';fitFont(ctx,statement,34,24,920,500);ctx.fillText(statement,80,1246);
    const quest=task.join('——').trim();ctx.fillStyle='#b84635';fitFont(ctx,quest,43,27,920,400,QUEST_FONT_FAMILY);ctx.fillText(quest,80,1312);
    ctx.font='400 25px Inter,sans-serif';ctx.fillStyle='#899b9d';ctx.fillText(new Date(item.obtained_at).toLocaleDateString('zh-CN'),80,1380);
    return encodeCard(canvas);
  }
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
  return encodeCard(canvas);
}
