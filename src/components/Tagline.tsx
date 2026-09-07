import type {Toy} from '../types';

/** Preserve the supplied slogan and highlight its task in the brand accent. */
export function Tagline({toy}:{toy:Toy}){
  const text=toy.tagline_zh.replace(/[（(]任务[）)]/g,'').trim();
  const parts=text.split(/——|--/);
  return <p className="tagline-zh"><span>{parts[0]}</span>{parts.length>1&&<strong className="quest-text">{parts.slice(1).join('——').replace(/[。.]$/,'')}</strong>}</p>;
}
