import test from 'node:test';import assert from 'node:assert/strict';
import {shouldCommitDrag,dragProgress} from '../src/flow.mjs';
test('touch and pen commit on release only; desktop still commits at threshold',()=>{
 for(const kind of ['touch','pen']){assert.equal(shouldCommitDrag(1,kind),false);assert.equal(shouldCommitDrag(1,kind,true),true);assert.equal(shouldCommitDrag(.99,kind,true),false)}
 assert.equal(shouldCommitDrag(1,'mouse'),true);assert.equal(shouldCommitDrag(.8,'mouse'),false);
});
test('a touch moved back below threshold or cancelled must not trigger',()=>{
 assert.equal(shouldCommitDrag(dragProgress(0,150,390),'touch'),false);
 assert.equal(shouldCommitDrag(dragProgress(0,10,390),'touch',true),false);
 assert.equal(shouldCommitDrag(0,'touch',true),false);
});
