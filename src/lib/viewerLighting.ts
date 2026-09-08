export type ViewerLighting={id:string;tone:'neutral'|'agx';exposure:number;environment:number;hemisphere:number;key:number;fill:number};
// Keep the GLB palette intact. Softer ambient fill gives the coloured vinyl
// room for shape; Neutral preserves midtone hues without boosting materials.
export const viewerLighting:ViewerLighting=Object.freeze({id:'soft-color-v1',tone:'neutral',exposure:1.02,environment:.5,hemisphere:.28,key:1.8,fill:.5});
