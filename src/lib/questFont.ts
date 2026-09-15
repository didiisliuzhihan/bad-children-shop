import {asset,interfaceFonts} from '../assets';
import type {Language} from './i18n';

export const QUEST_FONT_FAMILY='"BC Quest","PingFang SC","Microsoft YaHei",sans-serif';
// Keep Chinese glyphs playful too when an English postcard has a Chinese nickname.
export const EN_QUEST_FONT_FAMILY='"Fredoka","BC Quest","PingFang SC","Microsoft YaHei",sans-serif';
// Register but do not eagerly load: the first visible task triggers the font request.
function register(){const font=new FontFace('BC Quest',`url("${asset('zcool-kuaile.woff2')}")`,{weight:'400',style:'normal',display:'swap'});document.fonts.add(font);return font}
let face=register();

/** Callers choose their font deadline; card exports permit a system-font fallback. */
export async function ensureQuestFont(timeoutMs=15000,language:Language='zh'){
 let selected:FontFace;
 if(language==='en'){
  selected=interfaceFonts.get('Fredoka')!;
  if(!selected||selected.status==='error'){
   if(selected)document.fonts.delete(selected);
   selected=new FontFace('Fredoka',`url("${asset('fredoka.woff2')}")`,{weight:'300 700',display:'swap'});
   interfaceFonts.set('Fredoka',selected);document.fonts.add(selected);
  }
 }else{
  if(face.status==='error'){document.fonts.delete(face);face=register()}
  selected=face;
 }
 if(selected.status==='loaded')return;
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{await Promise.race([selected.load(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Task font could not load')),timeoutMs)})])}
 finally{if(timer)clearTimeout(timer)}
}
