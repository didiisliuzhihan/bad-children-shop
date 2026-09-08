import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {ToyViewer} from '../src/components/ToyViewer';import {fallbackToys} from '../src/assets';
import type {ViewerLighting} from '../src/lib/viewerLighting';
import '../src/styles.css';import '../src/collection-room.css';import './lighting.css';
const legacy:ViewerLighting={id:'v5.4-original',tone:'agx',exposure:1.1,environment:.75,hemisphere:.65,key:2,fill:.75};
function Review(){const[id,setId]=useState('stressed_jimao');const toy=fallbackToys.find(t=>t.id===id)!;return <><header className="lighting-toolbar"><h1>同模型 · 同角度 · 色彩对照</h1><nav>{fallbackToys.map(t=><button key={t.id} aria-pressed={id===t.id} onClick={()=>setId(t.id)}>{t.name_zh}</button>)}</nav></header><div className="lighting-grid">{[false,true].map(fresh=><section key={String(fresh)}><h2>{fresh?'修复后 · 柔和原色':'修复前 · V5.4'}</h2><div className="room-model-panel"><div className="room-model-heading"><span>THE LITTLE MISFITS / {toy.number}</span><h2>{toy.name_en}</h2><p>{toy.name_zh}</p></div><ToyViewer toy={toy} lighting={fresh?undefined:legacy}/></div></section>)}</div></>};
createRoot(document.getElementById('root')!).render(<Review/>);
