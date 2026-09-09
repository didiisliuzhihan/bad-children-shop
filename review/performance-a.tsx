// Local component acceptance only. No accounts, cloud writes, rewards or shop entry.
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {fallbackToys} from '../src/assets';
import {CollectibleCard} from '../src/components/CollectibleCard';
import {CollectibleCardPreview} from '../src/components/CollectibleCardPreview';
import '../src/styles.css';
import '../src/v3.css';
import '../src/v4.css';
import '../src/v5.css';
import '../src/collection-room.css';
const item={id:'local-card-qa',toy_id:'stressed_jimao',obtained_at:'2026-09-08T12:00:00Z',synced:false};
function Acceptance(){
 const [index,setIndex]=useState(2),[mode,setMode]=useState('preview'),[visible,setVisible]=useState(true),[message,setMessage]=useState('');
 const original=fallbackToys[index],toy=mode==='failure'?{...original,card_image_url:'/missing-test-card.png',icon_url:'/missing-test-card.png'}:original;
 return <main style={{padding:18,maxWidth:520,margin:'auto'}}>
  <h1 style={{fontSize:20}}>A 方案 · 本地卡片验收</h1><p style={{fontSize:12}}>仅检查组件，不连接账户，不保存收藏。</p>
  <nav style={{display:'flex',gap:8,flexWrap:'wrap',margin:'16px 0'}}>
   <select aria-label="玩具" value={index} onChange={event=>setIndex(Number(event.target.value))}>{fallbackToys.map((toy,n)=><option key={toy.id} value={n}>{toy.name_zh}</option>)}</select>
   <select aria-label="验收模式" value={mode} onChange={event=>setMode(event.target.value)}><option value="preview">原生预览（不生成高清）</option><option value="full">完整卡片与高清准备</option><option value="failure">卡面失败</option></select>
   <button className="room-pill" onClick={()=>setVisible(value=>!value)}>{visible?'隐藏卡片':'显示卡片'}</button>
  </nav>
  <section className="room-companion" hidden={!visible}>
   {mode==='preview'?<div className="export-preview"><CollectibleCardPreview key={toy.id} toy={toy} item={item} active={visible} onImageReady={()=>{}}/></div>:<CollectibleCard key={mode} toy={toy} item={item} active={visible} toast={setMessage} onConfirmSaved={()=>{setMessage('测试组件：未写入任何账户');return true}} questStage="unsaved"/>}
  </section><p role="status">{message}</p>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Acceptance/>);
