export type PostcardMedia={
 id:string;kind:'photo'|'gif'|'video';url:string;posterUrl?:string;
 width:number;height:number;duration?:number;label:string;sceneMoment?:'repeat';capturedAt?:string;
 origin:'local-file'|'nest-capture'|'example'|'account-file';storagePath?:string;posterStoragePath?:string;
};
export type NestSnapshot={id:string;media:PostcardMedia;createdAt:string;timeOfDay:'day'|'night';residentIds:string[]};
type DraftBase={id:string;text:string;media:PostcardMedia|null;createdAt:string;status:'local-draft'};
export type PostcardDraft=(DraftBase&{source:'player';signature:string;stampId:string})|(DraftBase&{source:'nest';snapshotId:string;stampId?:never});

