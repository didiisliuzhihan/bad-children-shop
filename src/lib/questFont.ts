import {asset} from '../assets';

export const QUEST_FONT_FAMILY='"BC Quest","PingFang SC","Microsoft YaHei",sans-serif';
// Register but do not eagerly load: the first visible task triggers the font request.
function register(){const font=new FontFace('BC Quest',`url("${asset('zcool-kuaile.woff2')}")`,{weight:'400',style:'normal',display:'swap'});document.fonts.add(font);return font}
let face=register();

/** Callers choose their font deadline; card exports permit a system-font fallback. */
export async function ensureQuestFont(timeoutMs=15000){
 if(face.status==='error'){document.fonts.delete(face);face=register()}
 if(face.status==='loaded')return;
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{await Promise.race([face.load(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Task font could not load')),timeoutMs)})])}
 finally{if(timer)clearTimeout(timer)}
}
