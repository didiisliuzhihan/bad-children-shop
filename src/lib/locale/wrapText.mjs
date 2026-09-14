/** Wrap English at word boundaries; preserve CJK and split genuinely long words.
 * @param {string} text @param {number} width @param {(text:string)=>number} measure
 * @returns {string[]} */
export function wrapCanvasText(text,width,measure){
 const lines=[];
 for(const paragraph of text.split('\n')){let line='';const tokens=/\s/.test(paragraph)?paragraph.match(/\S+\s*/g)||[]:Array.from(paragraph);
  for(const token of tokens){if(measure(line+token.trimEnd())<=width){line+=token;continue;}if(line.trim()){lines.push(line.trimEnd());line='';}
   if(measure(token.trimEnd())<=width){line=token;continue;}for(const c of Array.from(token)){if(line&&measure(line+c)>width){lines.push(line);line='';}line+=c;}
  }if(line.trim()||!paragraph)lines.push(line.trimEnd());
 }return lines;
}
