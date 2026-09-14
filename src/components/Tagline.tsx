import {tx,useLanguage} from '../lib/i18n';
import type {Toy} from '../types';
import '../lib/questFont';

/** Preserve the supplied slogan and highlight its task in the brand accent. */
export function Tagline({toy}:{toy:Toy}){
 useLanguage();
  const text=toy.tagline_zh.replace(/[（(]任务[）)]/g,'').trim();
  const parts=text.split(/——|--/);
  return <p className="tagline-zh"><span>{tx(parts[0])}</span>{tx(parts.length>1&&<strong className="quest-text">{tx(parts.slice(1).join('——').replace(/[。.]$/,''))}</strong>)}</p>;
}
