import {translateText} from '../../src/lib/locale/en.mjs';
import {wrapCanvasText} from '../../src/lib/locale/wrapText.mjs';
import {Fragment} from 'react';
// Isolated VM harnesses strip imports. Supply the presentation dependency;
// locale behavior itself is exercised separately in language.test.mjs.
export const localeMocks={
 useLanguage:()=> 'zh',getLanguage:()=> 'zh',tx:value=>value,translateText,wrapCanvasText,
 dateLabel:(date,language='zh')=>new Date(date).toLocaleDateString(language==='en'?'en-US':'zh-CN'),
 LanguageSwitch:()=>null,ChineseOnly:({children})=>children,_Fragment:Fragment,
};
