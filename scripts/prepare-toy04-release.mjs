import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const files=[
 ['assets/drafts/toy04/toy_popcorn_maid.glb','toy_popcorn_maid.glb'],
 ['previews/toy04/toy04-front.png','toy_popcorn_maid.png'],
 ['assets/source/references/toy4-popcorn-maid-card-original.png','toy_popcorn_maid_card.png'],
 ['assets/drafts/toy04/toy4-popcorn-story.jpg','toy4_popcorn_story.jpg'],
 ['assets/drafts/toy04/toy4-popcorn-voice.mp3','toy4_popcorn_voice.mp3']
];
const rows=[];
for(const [source,name] of files){
 const bytes=await fs.readFile(source);const destination='assets/delivery/'+name;
 try{const existing=await fs.readFile(destination);if(!existing.equals(bytes))throw Error('Refusing to replace a different release asset: '+destination)}catch(e){if(e.code!=='ENOENT')throw e;await fs.copyFile(source,destination)}
 rows.push({source,path:destination,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
await fs.writeFile('assets/toy04-release-manifest.json',JSON.stringify(rows,null,2));console.log(rows);
