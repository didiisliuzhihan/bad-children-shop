export function Icon({name,size=20,...props}:{name:string;size?:number;className?:string}){
 const paths:Record<string,React.ReactNode>={
  edit:<><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14v6Z"/></>,
  camera:<><path d="M8 6 9.5 3h5L16 6h4a2 2 0 0 1 2 2v11H2V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12.5" r="4"/></>,
  lock:<><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></>,
  bag:<><path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></>,
  sound:<><path d="m11 4-5 4H3v8h3l5 4V4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>,
  mute:<><path d="m11 4-5 4H3v8h3l5 4V4Z"/><path d="m16 9 5 6m0-6-5 6"/></>,
  arrow:<path d="M4 12h16m-6-6 6 6-6 6"/>,close:<path d="m6 6 12 12M6 18 18 6"/>,
  heart:<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
  book:<><path d="M3 4h6l3 2 3-2h6v15h-6l-3 2-3-2H3V4Zm9 2v15"/></>,
  headphones:<><path d="M3 13v-1a9 9 0 0 1 18 0v1"/><rect x="2" y="11" width="4" height="9" rx="2"/><rect x="18" y="11" width="4" height="9" rx="2"/></>,
  download:<><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
  check:<path d="m5 12 5 5L20 7"/>,info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></>,
  back:<path d="M20 12H4m6-6-6 6 6 6"/>,play:<path d="m8 4 12 8-12 8V4Z"/>,pause:<><path d="M8 5v14M16 5v14"/></>
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]||paths.heart}</svg>
}
export function BrandMark(){return <svg className="brand-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true"><mask id="face-cutout"><rect width="48" height="48" fill="white"/><path d="M16 24v5m16-5v5m-15 6c4 3 10 3 14 0" stroke="black" strokeWidth="3" strokeLinecap="round"/></mask><g fill="currentColor" mask="url(#face-cutout)"><path d="M12 16C6 13 7 5 8 4c4 6 8 4 9 8m14 0c1-4 5-2 9-8 1 1 2 9-4 12"/><path d="M7 26c0-12 7-16 17-16s17 4 17 16c0 12-8 18-17 18S7 38 7 26Z"/></g></svg>}
