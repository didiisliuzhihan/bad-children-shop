import {useAccount} from '../lib/AccountContext';
import {useCallback,useEffect,useRef,useState} from 'react';
import {asset} from '../assets';
import {chooseNotes,noteLength,TICKET_LIMIT,validateNote} from '../lib/communityDraft.mjs';
import {defaultStamp} from '../lib/communityTypes';
import {makePlayerPostcard} from '../lib/postcardDraft';
import {prepareLocalPostcardMedia} from '../lib/postcardMedia';
import type {PostcardDraft,PostcardMedia} from '../lib/postcardTypes';
import {Icon} from './Icon';
import {Postcard} from './Postcard';
import {Modal} from './Modal';
import '../postcard-editor.css';

const exampleMedia:PostcardMedia={id:'postcard-layout-example',kind:'photo',url:asset('toy_tired_crow_card.png'),width:1024,height:1024,label:'我没招了鸦官方卡面 · 版式示例',origin:'example'};
type View='write'|'drafts';
type Editor='media'|'message'|'signature'|'stamp'|null;
type PlayerDraft=Extract<PostcardDraft,{source:'player'}>;
export function TicketStudio({toast,active=true}:{toast:(message:string)=>void;active?:boolean}){
 const account=useAccount();
 const [saving,setSaving]=useState(false),[draftRevision,setDraftRevision]=useState(account?.documents.postcards?.revision||0);
 const [suggestions,setSuggestions]=useState<string[]>(()=>chooseNotes()),[text,setText]=useState(''),[signature,setSignature]=useState(account?.profile?.nickname||''),[stamped,setStamped]=useState(false),[error,setError]=useState('');
 const [media,setMedia]=useState<PostcardMedia|null>(exampleMedia),[loading,setLoading]=useState(false),[drafts,setDrafts]=useState<PlayerDraft[]>(()=>account?.profile?account.documents.postcards?.value.drafts||[]:[]),[view,setView]=useState<View>('write');
 const [editor,setEditor]=useState<Editor>(null),[pendingText,setPendingText]=useState(''),[pendingSignature,setPendingSignature]=useState('');
 const owned=useRef(new Map<string,()=>void>()),request=useRef<AbortController|null>(null),fileInput=useRef<HTMLInputElement>(null),busy=useRef(false);
 const closeEditor=useCallback(()=>{request.current?.abort();request.current=null;setLoading(false);setEditor(null);setError('')},[]);
 useEffect(()=>{if(!active)closeEditor()},[active,closeEditor]);
 useEffect(()=>{const keep=new Set([media?.id,...drafts.map(d=>d.media?.id)]);for(const [id,release] of owned.current)if(!keep.has(id)){release();owned.current.delete(id)}},[media,drafts]);
 useEffect(()=>()=>{request.current?.abort();for(const release of owned.current.values())release();owned.current.clear()},[]);
 useEffect(()=>{if(account?.profile&&!saving){setDrafts(account.documents.postcards?.value.drafts||[]);setDraftRevision(account.documents.postcards?.revision||0)}},[account?.documents.postcards,saving]);
 const openEditor=(field:Exclude<Editor,null>)=>{if(busy.current)return;setPendingText(text);setPendingSignature(signature);setError('');setEditor(field)};
 const removeDraft=async(id:string)=>{if(busy.current)return;busy.current=true;setSaving(true);try{const next=drafts.filter(d=>d.id!==id);if(account?.profile)await account.saveDocument('postcards',{drafts:next},draftRevision);setDrafts(next)}catch(e){toast((e as Error).message)}finally{busy.current=false;setSaving(false)}};
 const selectFile=async(file:File|undefined)=>{
  if(!file)return;request.current?.abort();const controller=new AbortController();request.current=controller;setLoading(true);setError('');
  try{
   const prepared=await prepareLocalPostcardMedia(file,controller.signal);
   if(controller.signal.aborted){prepared.release();return}owned.current.set(prepared.media.id,prepared.release);setMedia(prepared.media);setEditor(null);
  }catch(e){if(!controller.signal.aborted)setError((e as Error).message)}finally{if(request.current===controller){setLoading(false);request.current=null}if(fileInput.current)fileInput.current.value=''}
 };
 const replaceMedia=(next:PostcardMedia|null)=>{request.current?.abort();request.current=null;setLoading(false);setMedia(next);setEditor(null);setError('')};
 const applyText=(event:React.FormEvent)=>{event.preventDefault();const message=validateNote(pendingText);if(message){setError(message);return}setText(pendingText.trim());closeEditor()};
 const savePlayer=async()=>{
  if(loading||busy.current)return;
  const message=validateNote(text);if(message){openEditor('message');setError(message);return}
  if(!stamped){openEditor('stamp');return}
  busy.current=true;setSaving(true);setError('');
  try{if(drafts.length>=12)throw Error('草稿夹最多放 12 张，先移除不需要的草稿吧。');
   const uploaded=account?.profile&&media?await account.uploadMedia(media):media;if(uploaded!==media)setMedia(uploaded);
   const draft=makePlayerPostcard(text,signature,uploaded,crypto.randomUUID(),new Date().toISOString()),next=[draft,...drafts];if(account?.profile)await account.saveDocument('postcards',{drafts:next},draftRevision);setDrafts(next);setView('drafts');toast(account?.profile?'彩蛋草稿已保存到账户，尚未投进扭蛋池。':'彩蛋草稿已暂存，刷新会清除；尚未投进扭蛋池。');
  }catch(e){setError((e as Error).message)}finally{busy.current=false;setSaving(false)}
 };
 return <div className="ticket-studio postcard-studio postcard-direct-studio" inert={saving} aria-busy={saving}>
  <header className="postcard-studio-heading"><div><h2>制作彩蛋明信片</h2><p>先留好一枚小彩蛋。现在可以保存私人草稿；投进公共扭蛋池、让别人抽到的功能暂未开放。</p></div><div className="notes-switch" role="group" aria-label="彩蛋明信片工作台">{([['write','制作彩蛋'],['drafts','我的草稿']] as const).map(([key,label])=><button key={key} aria-pressed={view===key} onClick={()=>{closeEditor();setView(key)}}>{label}{key==='drafts'&&drafts.length>0&&' · '+drafts.length}</button>)}</div></header>
  <div hidden={view!=='write'} className="postcard-direct-workbench">
   <p className="postcard-touch-hint">点图片、文字或印章，就能把它变成你的。</p>
   <section className="postcard-preview-pane" aria-label="直接编辑彩蛋明信片">
    <Postcard source="player" text={text} signature={signature} media={media} stamped={stamped} active={active&&view==='write'&&!editor} editor={{onMedia:()=>openEditor('media'),onMessage:()=>openEditor('message'),onSignature:()=>openEditor('signature'),onStamp:()=>openEditor('stamp')}}/>
   </section>
   <div className="postcard-compose-actions"><button className="room-pill ticket-primary" disabled={saving||loading} onClick={()=>void savePlayer()}>{saving?'正在保存…':'保存彩蛋草稿'}<Icon name="check" size={17}/></button></div>
  </div>
  <section hidden={view!=='drafts'} aria-label="彩蛋明信片草稿夹">
   {drafts.length?<div className="postcard-draft-grid">{drafts.map(draft=><div key={draft.id} className="postcard-draft-item"><Postcard source={draft.source} text={draft.text} signature={draft.signature} media={draft.media} stamped date={draft.createdAt} active={active&&view==='drafts'}/><div className="postcard-draft-meta"><span>{account?.profile?'账户草稿 · 未投进扭蛋池':'临时草稿 · 未投进扭蛋池'}</span><button className="text-button" disabled={saving} onClick={()=>void removeDraft(draft.id)}>移除草稿</button></div></div>)}</div>:<div className="community-empty"><Icon name="book" size={32}/><p>先做一枚能被偶然遇见的小彩蛋。</p><button className="room-pill" onClick={()=>setView('write')}>制作第一枚彩蛋</button></div>}
  </section>
  {!editor&&error&&<p className="postcard-compose-error" role="alert">{error}</p>}
  <p className="postcard-save-disclosure">{account?.profile?'保存时会上传所选影像，仅自己可见。':'未登录时只临时保存，刷新会清除；登录后可保存到账户。'}<br/>内测中：目前仅可存草稿，投进扭蛋池的功能尚未开放。</p>
  {editor&&active&&<Modal className="postcard-edit-sheet" label={editor==='media'?'编辑明信片图片':editor==='message'?'编辑明信片文字':editor==='signature'?'修改落款':'选择明信片印章'} onClose={closeEditor}>
   <span className="postcard-sheet-eyebrow">YOUR LITTLE SURPRISE</span>
   {editor==='media'?<><h2>放一张你喜欢的画面</h2><div className="postcard-media-options"><button type="button" disabled={loading} onClick={()=>fileInput.current?.click()}><Icon name="camera" size={23}/><span><strong>{loading?'正在准备影像…':'添加 / 更换影像'}</strong><small>照片、GIF 或静音短视频</small></span><Icon name="arrow" size={17}/></button><button type="button" onClick={()=>replaceMedia(null)}><Icon name="edit" size={23}/><span><strong>只留文字</strong><small>一句话也能成为小彩蛋</small></span><Icon name="arrow" size={17}/></button></div>
    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" hidden aria-label="选择照片、GIF 或短视频" onChange={e=>void selectFile(e.target.files?.[0])}/>
    <p className="postcard-sheet-help">照片 ≤ 12 MB · GIF ≤ 8 MB<br/>短视频 ≤ 15 秒 / 20 MB，实况请先导出 MP4。<br/>不要放地址、电话或私密照片。</p>
   </>:editor==='message'?<><h2>给抽到它的人，一句话</h2><form onSubmit={applyText}><div className="suggestion-heading"><span>选一句，再改改也可以</span><button type="button" className="text-button" onClick={()=>setSuggestions(old=>chooseNotes(old))}>换几句<Icon name="arrow" size={15}/></button></div><div className="note-suggestions">{suggestions.map(note=><button type="button" key={note} aria-pressed={pendingText===note} onClick={()=>{setPendingText(note);setError('')}}>{note}</button>)}</div>
    <label className="note-field"><span>或者，自己写</span><textarea value={pendingText} rows={3} maxLength={160} onChange={e=>{setPendingText(e.target.value);setError('')}} placeholder="让某个还不认识的人，开心一下。" aria-describedby="postcard-word-count postcard-edit-error"/></label><div className="note-field-foot"><span>不留联系方式，把偶遇留在扭蛋里。</span><span id="postcard-word-count">{noteLength(pendingText)} / {TICKET_LIMIT}</span></div>
    <button type="submit" className="room-pill postcard-sheet-done">放到明信片上<Icon name="check" size={17}/></button></form>
   </>:editor==='signature'?<><h2>想留下什么名字？</h2><form onSubmit={e=>{e.preventDefault();setSignature(pendingSignature.trim());closeEditor()}}><label className="note-field"><span>明信片落款</span><input value={pendingSignature} maxLength={32} onChange={e=>setPendingSignature(Array.from(e.target.value).slice(0,16).join(''))} placeholder="一个坏小孩" autoComplete="off"/></label><p className="postcard-sheet-help">可以用昵称，也可以不留名；不会更改账户名字。</p><button type="submit" className="room-pill postcard-sheet-done">用这个落款<Icon name="check" size={17}/></button></form>
   </>:<><h2>给小彩蛋盖个戳</h2><p className="postcard-sheet-help">只有玩家制作的彩蛋明信片，才会盖上印章。</p><div className="postcard-stamp-options" role="group" aria-label="已拥有的印章"><button type="button" aria-pressed={stamped} onClick={()=>{setStamped(true);closeEditor()}}><img src={defaultStamp.imageUrl} alt="羊女孩默认印章"/><span><strong>羊女孩的戳</strong><small>默认赠送 · 点击盖上</small></span>{stamped&&<Icon name="check" size={19}/>}</button></div><p className="postcard-sheet-help">目前拥有 1 枚印章。</p></>}
   <p id="postcard-edit-error" className="postcard-sheet-error" role="alert">{error}</p>
  </Modal>}
 </div>;
}
