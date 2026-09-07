export type Phase='IDLE'|'SPINNING'|'LOCKING'|'DROPPING'|'PAUSE'|'SEALED'|'REVEALED'|'DECISION'|'COLLECTED'|'REJECTED';
export type Toy={id:string;name_en:string;name_zh:string;tagline_en:string;tagline_zh:string;story_text:string;story_note?:string;story_en:string;model_url:string;icon_url:string;audio_url:string;story_image_url:string;color:string;number:string};
export type Capsule={id:string;toy_id:string;obtained_at:string;synced:boolean};
