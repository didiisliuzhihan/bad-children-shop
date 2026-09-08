// Toys and stamps have separate ownership/display domains. No loot-table change.
export type StampDefinition={id:string;name:string;imageUrl?:string;isDefault:boolean};
export type StampOwnership={stampId:string;obtainedAt:string};
export type HomePlacement={toyId:string;x:number;z:number;rotation:number};
export type TicketDraft={id:string;text:string;signature:string;stampId:string;status:'local-draft';createdAt:string};
export const defaultStamp:StampDefinition={id:'shop-default',name:'羊女孩默认戳',imageUrl:'./assets/delivery/default-stamp-white.png',isDefault:true};
export type CommunityTab='cards'|'nest'|'notes';
