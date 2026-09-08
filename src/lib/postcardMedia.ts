import type {PostcardMedia} from './postcardTypes';

const MB=1024*1024;
export const POSTCARD_MEDIA_LIMITS={photo:12*MB,gif:8*MB,video:20*MB,videoSeconds:15,maxPixels:24_000_000};
export function localMediaKind(file:{type:string;size:number;name:string}):PostcardMedia['kind']{
 const kind=file.type==='image/gif'?'gif':['image/jpeg','image/png','image/webp'].includes(file.type)?'photo':['video/mp4','video/webm'].includes(file.type)?'video':null;
 if(!kind)throw Error('请使用 JPG、PNG、WebP、GIF 或 MP4 / WebM。原生实况、HEIC 请先导出为照片或 MP4。');
 if(file.size<=0||file.size>POSTCARD_MEDIA_LIMITS[kind])throw Error(`${kind==='video'?'短视频':kind==='gif'?'GIF':'照片'}请控制在 ${POSTCARD_MEDIA_LIMITS[kind]/MB} MB 以内。`);
 return kind;
}
export function fittedMediaSize(width:number,height:number,edge=1440){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||width*height>POSTCARD_MEDIA_LIMITS.maxPixels)throw Error('影像尺寸无法读取或过大，请换一份较小的文件。');
 const scale=Math.min(1,edge/Math.max(width,height));return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
export function canvasBlob(canvas:HTMLCanvasElement,type='image/jpeg',quality=.9):Promise<Blob>{
 return new Promise((resolve,reject)=>{try{canvas.toBlob(blob=>blob?resolve(blob):reject(Error('照片没有生成成功，请再试一次。')),type,quality)}catch{reject(Error('这张影像暂时不能生成，请换一份文件。'))}});
}
function waitForMedia(target:HTMLImageElement|HTMLVideoElement,event:string,signal?:AbortSignal){
 return new Promise<void>((resolve,reject)=>{
  let timer:ReturnType<typeof setTimeout>;
  const cleanup=()=>{clearTimeout(timer);target.removeEventListener(event,done);target.removeEventListener('error',bad);signal?.removeEventListener('abort',abort)};
  const done=()=>{cleanup();resolve()},bad=()=>{cleanup();reject(Error('浏览器无法读取这份影像，请换成常见的照片或 MP4 文件。'))},abort=()=>{cleanup();reject(new DOMException('Cancelled','AbortError'))};
  if(signal?.aborted){abort();return}target.addEventListener(event,done,{once:true});target.addEventListener('error',bad,{once:true});signal?.addEventListener('abort',abort,{once:true});timer=setTimeout(bad,15000);
 });
}
/** Everything stays on this device. Photos are resized/re-encoded; no file upload. */
export async function prepareLocalPostcardMedia(file:File,signal?:AbortSignal):Promise<{media:PostcardMedia;release:()=>void}>{
 const kind=localMediaKind(file),urls=new Set<string>();
 const urlFor=(blob:Blob)=>{const url=URL.createObjectURL(blob);urls.add(url);return url};
 const release=()=>{for(const url of urls)URL.revokeObjectURL(url);urls.clear()};
 const original=urlFor(file);let video:HTMLVideoElement|undefined;
 try{
  let visual:CanvasImageSource,width:number,height:number,duration:number|undefined;
  if(kind==='video'){
   video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
   const ready=waitForMedia(video,'loadeddata',signal);video.src=original;video.load();await ready;
   width=video.videoWidth;height=video.videoHeight;duration=video.duration;
   if(!Number.isFinite(duration)||duration<=0||duration>POSTCARD_MEDIA_LIMITS.videoSeconds)throw Error('先选一段 15 秒以内的短视频吧。');
   visual=video;
  }else{
   const img=new Image(),ready=waitForMedia(img,'load',signal);img.src=original;await ready;width=img.naturalWidth;height=img.naturalHeight;visual=img;
  }
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  const size=fittedMediaSize(width,height,kind==='photo'?1440:960),canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('影像预览暂时无法打开。');ctx.fillStyle='#eee6d6';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(visual,0,0,canvas.width,canvas.height);
  const still=urlFor(await canvasBlob(canvas));if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  if(kind==='photo'){URL.revokeObjectURL(original);urls.delete(original)}
  return {media:{id:crypto.randomUUID(),kind,url:kind==='photo'?still:original,posterUrl:kind==='photo'?undefined:still,width:kind==='photo'?size.width:width,height:kind==='photo'?size.height:height,duration,label:file.name,origin:'local-file'},release};
 }catch(error){release();throw error}finally{if(video){video.pause();video.removeAttribute('src');video.load()}}
}
