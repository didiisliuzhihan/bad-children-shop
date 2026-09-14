import {setLanguage,useLanguage} from '../lib/i18n';
import '../language.css';
export function LanguageSwitch(){
 const language=useLanguage();
 return <div className="language-switch" role="group" aria-label={language==='en'?'Language':'语言'}>
  <button type="button" lang="zh-CN" aria-pressed={language==='zh'} onClick={()=>setLanguage('zh')}>中文</button>
  <button type="button" lang="en" aria-pressed={language==='en'} onClick={()=>setLanguage('en')}>EN</button>
 </div>;
}
