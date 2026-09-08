import type {PostcardMedia} from './postcardTypes';
export type NestMoment={id:string;kind:string;startedAt?:string};
export type NestTrace={kind:string;toyId:string;until:string};
export type PrivateStory={id:string;source:'nest';text:string;createdAt:string;media?:PostcardMedia|null};
export type NestLifeReply={event?:NestMoment|null;trace?:NestTrace|null;ok?:boolean;capture?:boolean;captureEventId?:string;captureRepeated?:boolean};
export type AccountDraw={id:string;type:'toy'|'story';toyId?:string;story?:PrivateStory};

