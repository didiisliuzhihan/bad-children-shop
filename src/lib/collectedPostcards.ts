import type {PrivateStory} from './nestLifeTypes';
import type {PostcardMedia} from './postcardTypes';

/** Receipt from a future shared-pool draw, never an editable/outgoing draft. */
export type ReceivedPostcard={
 id:string;source:'player';status:'collected';text:string;signature:string;
 stampId:string;createdAt:string;obtainedAt:string;media?:PostcardMedia|null;
};
export type CollectedPostcard=PrivateStory|ReceivedPostcard;
export function collectedPostcards(stories:PrivateStory[],received:ReceivedPostcard[]=[]):CollectedPostcard[]{
 // Keep namespaces distinct: a private event and a player receipt may share an id.
 const seen=new Set<string>();
 return [...stories.filter(card=>card.source==='nest'),...received.filter(card=>card.source==='player'&&card.status==='collected')]
  .filter(card=>{const key=card.source+':'+card.id;if(seen.has(key))return false;seen.add(key);return true;})
  .sort((a,b)=>{const date=(card:CollectedPostcard)=>Date.parse(card.source==='player'?card.obtainedAt:card.createdAt)||0;return date(b)-date(a);});
}
