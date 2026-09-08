import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// Source guards supplement real-browser elementFromPoint and coordinate-click
// checks. Component onClick tests alone cannot detect CSS hit-target blockers.
const css=fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');

test('oversized decorative reveal glow cannot intercept real pointer clicks',()=>{
 assert(css.includes('.portrait-glow{pointer-events:none}'));
});
test('portrait visual layers are isolated below opening and decision controls',()=>{
 assert(css.includes('.reveal-portrait{isolation:isolate}'));
 assert(css.includes('.sealed-copy,.reveal-copy{position:relative;z-index:2}'));
});
