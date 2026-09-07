import fs from 'node:fs/promises';
await fs.mkdir('docs',{recursive:true});
await fs.copyFile('dist/index.html','docs/index.html');
await fs.writeFile('docs/.nojekyll','');
console.log('GitHub Pages entry ready: docs/index.html');
