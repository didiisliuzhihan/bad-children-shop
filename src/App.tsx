import {useCallback,useEffect,useRef,useState} from 'react';
import gsap from 'gsap';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {asset,fallbackToys,loadModel} from './assets';
import {MachineScene,RevealScene} from './components/Scene';
import {BrandMark,Icon} from './components/Icon';
import {Collection} from './components/Collection';
import {Modal} from './components/Modal';
import {Tagline} from './components/Tagline';
import {canTransition,chooseToy,dragProgress,shouldCommitDrag} from './flow.mjs';
import {initializeCloud,readLocal,syncCapsule,writeLocal} from './lib/collection';
import {setMuted as muteAudio,sound,startBackground,installAudioStart,observeAudioReady,isAudioReady} from './lib/audio';
import type {Capsule,Phase,Toy} from './types';

const phaseCopy:Partial<Record<Phase,string>>={IDLE:'向右滑动，遇见你的坏小孩',SPINNING:'抽取中…',LOCKING:'抽取中…',DROPPING:'扭蛋正在落下…',PAUSE:'准备开蛋…'};

export default function App(){
  const[machine,setMachine]=useState<GLTF|null>(null),[loadPercent,setLoadPercent]=useState(0),[loadError,setLoadError]=useState(false),[retry,setRetry]=useState(0);
  const[phase,setPhase]=useState<Phase>('IDLE'),[drag,setDrag]=useState(0),[muted,setMuted]=useState(false);
  const[audioReady,setAudioReady]=useState(isAudioReady);
  const[toys,setToys]=useState<Toy[]>(fallbackToys),[items,setItems]=useState<Capsule[]>(readLocal),[mode,setMode]=useState<'local'|'cloud'>('local');
  const[bag,setBag]=useState(false),[guide,setGuide]=useState(false),[selected,setSelected]=useState<Toy|null>(null);
  const[toyReady,setToyReady]=useState(false),[toyError,setToyError]=useState(false),[toastText,setToastText]=useState('');
  const reduced=useRef(matchMedia('(prefers-reduced-motion: reduce)').matches).current;
  const phaseRef=useRef<Phase>('IDLE'),locked=useRef(false),dragStart=useRef<number|null>(null);
  const tapAllowed=useRef(true);
  const timeouts=useRef<ReturnType<typeof setTimeout>[]>([]),toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const bagButton=useRef<HTMLButtonElement>(null),flyingCard=useRef<HTMLDivElement>(null),revealRef=useRef<HTMLElement>(null);
  const overlay=['SEALED','REVEALED','DECISION','COLLECTED','REJECTED'].includes(phase);
  const later=useCallback((fn:()=>void,ms:number)=>{timeouts.current.push(setTimeout(fn,ms))},[]);
  const transition=useCallback((next:Phase)=>{if(!canTransition(phaseRef.current,next))return false;phaseRef.current=next;setPhase(next);return true},[]);
  const toast=useCallback((message:string)=>{setToastText(message);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToastText(''),3500)},[]);
  const closeGuide=useCallback(()=>setGuide(false),[]);
  useEffect(()=>()=>{timeouts.current.forEach(clearTimeout);if(toastTimer.current)clearTimeout(toastTimer.current)},[]);
  useEffect(()=>{const unobserve=observeAudioReady(setAudioReady),uninstall=installAudioStart(asset('studio-loop.wav'));return()=>{unobserve();uninstall()}},[]);
  // Load directly in the main view. There is no entrance or login screen.
  useEffect(()=>{
    let alive=true;setLoadError(false);setLoadPercent(0);
    loadModel(asset('gashapon_machine_v3.glb'),p=>{if(alive)setLoadPercent(Math.round(Math.min(p,96)))})
      .then(model=>{if(alive){setMachine(model);setLoadPercent(100)}})
      .catch(error=>{console.warn('Machine model could not load',error);if(alive)setLoadError(true)});
    return()=>{alive=false};
  },[retry]);
  useEffect(()=>{
    let alive=true;
    const sync=()=>initializeCloud().then(result=>{if(alive){setToys(result.toys);setItems(result.items);setMode(result.mode)}});
    const offline=()=>setMode('local');
    void sync();window.addEventListener('online',sync);window.addEventListener('offline',offline);
    return()=>{alive=false;window.removeEventListener('online',sync);window.removeEventListener('offline',offline)};
  },[]);
  useEffect(()=>{
    if(!overlay)return;const panel=revealRef.current;if(!panel)return;
    const focusable=()=>Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]),[tabindex="0"]')).filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
    (focusable()[0]||panel).focus();
    const trap=(event:KeyboardEvent)=>{
      if(event.key!=='Tab')return;const buttons=focusable();
      if(!buttons.length){event.preventDefault();panel.focus();return}
      if(event.shiftKey&&(document.activeElement===buttons[0]||document.activeElement===panel)){event.preventDefault();buttons.at(-1)?.focus()}
      else if(!event.shiftKey&&(document.activeElement===buttons.at(-1)||document.activeElement===panel)){event.preventDefault();buttons[0].focus()}
    };
    document.addEventListener('keydown',trap);return()=>document.removeEventListener('keydown',trap);
  },[overlay,phase]);
  const spin=useCallback(()=>{
    if(locked.current||phaseRef.current!=='IDLE'||!machine)return;
    locked.current=true;
    setSelected(chooseToy(toys));setToyReady(false);setToyError(false);transition('SPINNING');setDrag(1);sound('roll');
    later(()=>{transition('LOCKING');sound('lock')},2000);later(()=>transition('DROPPING'),3000);later(()=>sound('drop'),3800);later(()=>transition('PAUSE'),4500);later(()=>transition('SEALED'),5500);
  },[machine,toys,transition,later]);
  const reset=useCallback(()=>{transition('IDLE');setSelected(null);setDrag(0);setToyReady(false);locked.current=false;timeouts.current.forEach(clearTimeout);timeouts.current=[]},[transition]);
  const open=()=>{if(phaseRef.current==='SEALED'){transition('REVEALED');sound('open')}};
  const ready=useCallback(()=>{setToyReady(true);later(()=>transition('DECISION'),1900)},[later,transition]);
  const modelError=useCallback(()=>{setToyError(true);later(()=>transition('DECISION'),150)},[later,transition]);
  const adopt=()=>{
    if(!selected||phaseRef.current!=='DECISION')return;transition('COLLECTED');sound('keep');
    const item:Capsule={id:crypto.randomUUID(),toy_id:selected.id,obtained_at:new Date().toISOString(),synced:false};
    setItems(previous=>{const next=[item,...previous];if(!writeLocal(next))toast('浏览器未能保存收藏，请检查存储设置。');return next});
    void syncCapsule(item).then(ok=>{if(ok)setItems(previous=>{const next=previous.map(x=>x.id===item.id?{...x,synced:true}:x);writeLocal(next);return next})});
    requestAnimationFrame(()=>{
      const card=flyingCard.current,target=bagButton.current;
      if(card&&target&&!reduced){
        const a=card.getBoundingClientRect(),b=target.getBoundingClientRect();
        gsap.timeline({onComplete:()=>{gsap.fromTo(target,{scale:1.15},{scale:1,duration:.4});reset();toast('已收入扭蛋包')}})
          .fromTo(card,{scale:.65,opacity:0},{scale:1,opacity:1,duration:.4,ease:'back.out(1.3)'})
          .to(card,{x:b.left+b.width/2-a.left-a.width/2,y:b.top+b.height/2-a.top-a.height/2,scale:.08,opacity:0,duration:.8,ease:'power3.in'},'+=.15');
      }else later(()=>{reset();toast('已收入扭蛋包')},450);
    });
  };
  const reject=()=>{if(phaseRef.current==='DECISION'){transition('REJECTED');sound('reject');later(reset,1000)}};
  const toggleAudio=()=>{const value=audioReady?!muted:false;setMuted(value);muteAudio(value);if(!value)void startBackground(asset('studio-loop.wav'))};
  return <main className={'shop is-entered '+(bag?'has-bag ':'')+(overlay?'is-revealing':'')} data-phase={phase} data-audio-ready={audioReady}>
    <div className="grain" aria-hidden="true"/>
    <header className="topbar" inert={overlay?true:undefined}>
      <button className="brand" onClick={()=>{if(phase==='IDLE')setBag(false)}} aria-label="Bad Children Shop 首页"><BrandMark/><span>BAD CHILDREN<br/>SHOP</span></button>
      <div className="top-actions">
        <button className="icon-button" onClick={()=>setGuide(true)} aria-label="使用说明"><Icon name="info"/></button>
        <button className="icon-button" data-audio-toggle onClick={toggleAudio} aria-label={muted?'打开音乐':audioReady?'静音音乐':'开启声音'} aria-pressed={!muted&&audioReady}><Icon name={muted?'mute':'sound'} size={20}/></button>
        <button ref={bagButton} className="bag-button" onClick={()=>setBag(true)} disabled={phase!=='IDLE'} aria-label={'我的扭蛋包，'+items.length+'个收藏'}><Icon name="bag" size={20}/><span>扭蛋包</span><b>{items.length}</b></button>
      </div>
    </header>
    <section className={'machine-page '+(bag?'behind-bag':'')} aria-hidden={bag||overlay} inert={bag||overlay?true:undefined}>
      <div className="studio-halo" aria-hidden="true"/><div className="background-type" aria-hidden="true">BAD<br/>CHILDREN</div>
      <div className="canvas-wrap">{machine&&<MachineScene model={machine} phase={phase} progress={drag} onProgress={setDrag} onTurn={spin} reduced={reduced}/>}</div>
      {!machine&&<div className="machine-loading" role="status">{loadError?<><p>模型暂时未能加载</p><button className="pill-button dark" onClick={()=>setRetry(value=>value+1)}>重新加载<Icon name="arrow"/></button></>:<><span className="loading-ring"/><p>加载模型 <span>{loadPercent}%</span></p></>}</div>}
      <div className="interaction-dock">
        <p className="gesture-label" aria-live="polite">{phaseCopy[phase]||phaseCopy.IDLE}</p>
        <button className={'turn-control '+(phase!=='IDLE'?'busy':'')} disabled={!machine||phase!=='IDLE'} aria-label="轻点或向右滑动旋钮，或按回车抽取扭蛋"
          onClick={event=>{if(event.detail===0||tapAllowed.current)spin()}}
          onKeyDown={event=>{if(['Enter',' ','ArrowRight'].includes(event.key)){event.preventDefault();spin()}}}
          onPointerDown={event=>{if(phase!=='IDLE')return;tapAllowed.current=true;dragStart.current=event.clientX;event.currentTarget.setPointerCapture(event.pointerId)}}
          onPointerMove={event=>{if(dragStart.current===null||phaseRef.current!=='IDLE')return;if(Math.abs(event.clientX-dragStart.current)>8)tapAllowed.current=false;const p=dragProgress(dragStart.current,event.clientX,innerWidth);setDrag(p);if(shouldCommitDrag(p,event.pointerType)){dragStart.current=null;spin()}}}
          onPointerUp={event=>{const p=dragStart.current===null?0:dragProgress(dragStart.current,event.clientX,innerWidth);dragStart.current=null;if(phaseRef.current==='IDLE'){if(shouldCommitDrag(p,event.pointerType,true))void spin();else setDrag(0)}try{event.currentTarget.releasePointerCapture(event.pointerId)}catch{}}}
          onPointerCancel={()=>{tapAllowed.current=false;dragStart.current=null;if(phaseRef.current==='IDLE')setDrag(0)}}>
          <span className="turn-fill" style={{width:drag*100+'%'}}/><span className="dial-mini" style={{transform:'translateX('+drag*170+'px) rotate('+drag*180+'deg)'}}><i/></span>
          <span className="turn-copy">{phase==='IDLE'?(!audioReady&&!muted?'轻点开始 · 开启声音':'抽取扭蛋'):'抽取中'}</span><Icon name="arrow" size={19}/>
        </button>
      </div>
    </section>
    {overlay&&selected&&<section ref={revealRef} tabIndex={-1} className={'reveal-overlay phase-'+phase.toLowerCase()+(toyReady?' toy-ready':'')} role="dialog" aria-modal="true" aria-label={phase==='SEALED'?'打开扭蛋':'玩偶详情'}>
      <div className="reveal-portrait"><div className="portrait-glow"/><RevealScene toy={selected} opened={phase!=='SEALED'} decision={phase} reduced={reduced} onReady={ready} onError={modelError}/>
        {toyError&&<div className="model-fallback"><img src={selected.icon_url} alt={selected.name_zh}/><small>暂时显示收藏图片</small></div>}
      </div>
      {phase==='SEALED'?<div className="sealed-copy"><button className="pill-button cream" onClick={open}>打开扭蛋<Icon name="arrow"/></button></div>:<div className="reveal-copy">
        <h1>{selected.name_zh}</h1><p className="toy-name-en">{selected.name_en}</p><Tagline toy={selected}/><p className="tagline-en">{selected.tagline_en.replace(/\s*\(quest\)/gi,'')}</p>
        {!toyReady&&!toyError&&<small className="toy-loading-label">加载玩偶中…</small>}
        <div className="decision-actions" style={{visibility:phase==='DECISION'?'visible':'hidden'}}>
          <button className="pill-button cream" onClick={adopt}><Icon name="heart" size={19}/>收留并疼爱它</button><button className="pill-button cast-button" onClick={reject}>赶出去<Icon name="arrow" size={18}/></button>
        </div>
      </div>}
      {phase==='COLLECTED'&&<div className={'flying-card'+(selected.card_image_url?' has-artwork':'')} ref={flyingCard}><div><img src={selected.card_image_url||selected.icon_url} alt=""/></div><span className="card-series">THE LITTLE MISFITS</span><h3>{selected.name_zh}</h3><Tagline toy={selected}/></div>}
    </section>}
    {bag&&<Collection items={items} toys={toys} mode={mode} onClose={()=>setBag(false)} toast={toast}/>}
    {guide&&<Modal label="使用说明" onClose={closeGuide} className="guide-modal"><h2>使用说明</h2><ol><li>轻点抽取按钮或红色旋钮即可开启声音并抽取，也可以向右拖动或按回车。</li><li>落蛋后点击“打开扭蛋”，查看玩偶。</li><li>收留后可在扭蛋包里听故事、读故事和保存卡片。</li></ol><p>部分手机需一次轻点才能允许出声。收藏跟随当前浏览器的匿名身份，清除浏览器数据可能失去收藏访问权限。</p></Modal>}
    <div className={'toast '+(toastText?'show':'')} role="status"><Icon name="check" size={17}/>{toastText}</div>
  </main>;
}
