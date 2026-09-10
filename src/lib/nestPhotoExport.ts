import {ensureQuestFont,QUEST_FONT_FAMILY} from './questFont';
import {canvasBlob} from './postcardMedia';

export type NestKeepsakeInput={photo:Blob;nickname?:string;text:string;date:string;layout?:'portrait'|'landscape'};
function wrap(ctx:CanvasRenderingContext2D,text:string,width:number){
 const lines:string[]=[];let line='';
 for(const char of Array.from(text)){if(char==='\n'){lines.push(line);line='';continue}if(line&&ctx.measureText(line+char).width>width){lines.push(line);line=char}else line+=char}
 if(line)lines.push(line);return lines;
}
/** A blank capture must not become a successfully exported postcard. */
export function hasNestPhotoDetail(pixels:Uint8ClampedArray){
 let varied=0;
 for(let i=4;i<pixels.length;i+=4)if(pixels[i+3]>200&&Math.abs(pixels[i]-pixels[0])+Math.abs(pixels[i+1]-pixels[1])+Math.abs(pixels[i+2]-pixels[2])>24)varied++;
 return varied>4;
}
async function decodePhoto(blob:Blob){
 if(!blob.size||!['image/png','image/jpeg'].includes(blob.type))throw Error('小窝照片没有准备好，请返回小窝重新拍一张。');
 const url=URL.createObjectURL(blob),image=new Image();image.decoding='sync';
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  image.src=url;
  await Promise.race([image.decode(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('小窝照片加载超时，请重新拍一张。')),12000)})]);
  if(!image.naturalWidth||!image.naturalHeight)throw Error('小窝照片没有像素，请重新拍一张。');
  return {image,release:()=>URL.revokeObjectURL(url)};
 }catch(error){URL.revokeObjectURL(url);throw error}finally{clearTimeout(timer)}
}
/** Direct composition from decoded scene pixels, without DOM/SVG foreignObject.
 * Preview, download and Web Share all use the same PNG. */
export async function renderNestKeepsake(input:NestKeepsakeInput):Promise<Blob>{
 const decoded=await decodePhoto(input.photo);
 try{
  await ensureQuestFont().catch(()=>{throw Error('留念字体暂时没有加载好，请点重新生成。')});
  const check=document.createElement('canvas');check.width=16;check.height=16;
  const checkCtx=check.getContext('2d');if(!checkCtx)throw Error('浏览器暂时无法生成明信片。');
  checkCtx.drawImage(decoded.image,0,0,16,16);
  if(!hasNestPhotoDetail(checkCtx.getImageData(0,0,16,16).data))throw Error('这次没有拍到小窝画面，请返回小窝再拍一张。');
  const landscape=input.layout==='landscape',width=landscape?900:540,pad=32,photoSize=landscape?400:476;
  const x=landscape?496:pad,letterWidth=landscape?372:476,start=landscape?pad:610;
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw Error('浏览器暂时无法生成明信片。');
  const titleSize=landscape?40:44,bodySize=landscape?25:28,lineHeight=bodySize*1.8;
  ctx.font='400 '+titleSize+'px '+QUEST_FONT_FAMILY;const title=wrap(ctx,input.nickname?.trim()||'一个坏小孩',letterWidth);
  ctx.font='400 '+bodySize+'px '+QUEST_FONT_FAMILY;const message=wrap(ctx,input.text,letterWidth);
  const titleY=start+35,sourceY=titleY+title.length*titleSize*1.35+14,messageY=sourceY+64;
  const footerY=messageY+message.length*lineHeight+42,height=Math.ceil(Math.max(pad+photoSize+64,footerY+80));
  canvas.width=width*2;canvas.height=height*2;ctx.scale(2,2);ctx.textBaseline='top';
  ctx.fillStyle='#f6ecd7';ctx.fillRect(0,0,width,height);
  ctx.strokeStyle='#fff5de';ctx.lineWidth=1;ctx.strokeRect(.5,.5,width-1,height-1);
  const scale=Math.min(photoSize/decoded.image.naturalWidth,photoSize/decoded.image.naturalHeight),w=decoded.image.naturalWidth*scale,h=decoded.image.naturalHeight*scale;
  ctx.fillStyle='#e8e3d7';ctx.fillRect(pad,pad,photoSize,photoSize);
  ctx.drawImage(decoded.image,pad+(photoSize-w)/2,pad+(photoSize-h)/2,w,h);
  ctx.strokeStyle='#ad9e7d33';ctx.strokeRect(pad,pad,photoSize,photoSize);
  ctx.fillStyle='#827768';ctx.font='400 14px Arial,sans-serif';ctx.fillText('A LITTLE MOMENT AT HOME',pad,pad+photoSize+22);
  ctx.strokeStyle='#9f8d6c52';ctx.beginPath();
  if(landscape){ctx.moveTo(464,pad);ctx.lineTo(464,height-pad)}else{ctx.moveTo(pad,570);ctx.lineTo(width-pad,570)}ctx.stroke();
  ctx.fillText('BAD CHILDREN SHOP',x,start);
  ctx.font='400 '+titleSize+'px '+QUEST_FONT_FAMILY;ctx.fillStyle='#9e6551';title.forEach((line,i)=>ctx.fillText(line,x,titleY+i*titleSize*1.35));
  ctx.font='400 18px "PingFang SC","Microsoft YaHei",sans-serif';ctx.fillStyle='#827768';ctx.fillText('来自你的小窝',x,sourceY);
  ctx.font='400 '+bodySize+'px '+QUEST_FONT_FAMILY;ctx.fillStyle='#594c43';
  message.forEach((line,i)=>{const y=messageY+i*lineHeight;ctx.fillText(line,x,y);ctx.strokeStyle='#b7a48552';ctx.beginPath();ctx.moveTo(x,y+lineHeight-7);ctx.lineTo(x+letterWidth,y+lineHeight-7);ctx.stroke()});
  ctx.fillStyle='#827768';ctx.font='400 18px "PingFang SC","Microsoft YaHei",sans-serif';ctx.fillText('把这一刻，留给你。',x,footerY);
  ctx.font='400 14px Arial,sans-serif';ctx.fillText(new Date(input.date).toLocaleDateString('zh-CN'),x,footerY+32);
  return await canvasBlob(canvas,'image/png');
 }finally{decoded.release()}
}
