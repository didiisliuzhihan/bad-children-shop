import {useCallback,useEffect,useState} from 'react';
import {useAccount} from '../lib/AccountContext';
import {Modal} from './Modal';
import {Icon} from './Icon';
import {readLegacyImport} from '../lib/collection';
import {localPreview} from '../assets';
import '../account.css';

export function AccountMenu({loginRequest=0}:{loginRequest?:number}={}){
 const account=useAccount();
 const [open,setOpen]=useState(false),[mode,setMode]=useState<'login'|'register'|'recover'>('register'),[name,setName]=useState(''),[password,setPassword]=useState(''),[code,setCode]=useState(''),[rescue,setRescue]=useState(''),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[hint,setHint]=useState('');
 useEffect(()=>{if(loginRequest){setMode('login');setOpen(true);setError('');setHint('')}},[loginRequest]);
 const close=useCallback(()=>{if(busy)return;if(rescue&&!saved){setError('先收好备用钥匙，再勾选「我已妥善保存」。');return}setOpen(false);setPassword('');setCode('');setRescue('');setSaved(false);setError('');setHint('')},[busy,rescue,saved]);
 if(!account)return null;
 const submit=async(e:React.FormEvent)=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{const result=await account.authenticate(mode,name,password,code);setPassword('');setCode('');if(result){setRescue(result);setSaved(false)}else setOpen(false)}catch(e){setError((e as Error).message)}finally{setBusy(false)}};
 const keepKey=()=>{
  const blob=new Blob([`BAD CHILDREN SHOP · 备用钥匙\n名字：${name}\n找回码：${rescue.match(/.{1,8}/g)?.join('-')}\n\n请放在只有你能看到的地方。找回账户后旧码失效，会领取一把新钥匙。\n`],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='小窝备用钥匙.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);setHint('下载已发起，请确认文件已保存。');
 };
 const bringLocal=async()=>{
  setBusy(true);setError('');setHint('');
  try{
   const {items,token}=await readLegacyImport();if(!items.length){setHint('这个浏览器暂时没有旧收藏。请在之前抽扭蛋的浏览器里登录，再带上它们。');return}
   if(!window.confirm(`确认将当前浏览器的 ${items.length} 枚旧收藏带入「${account.profile?.nickname}」吗？这不会删除原记录，也不会迁入其他账户的收藏。`))return;
   let added=0;for(let offset=0;offset<items.length;offset+=1000)added+=await account.importCapsules(items.slice(offset,offset+1000),token);
   setHint(`已带入 ${added} 枚收藏。重复或归属其他账户的记录没有再加入，原记录仍在。`);
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };
 return <><button className="room-pill account-entry" disabled={account.status==='loading'} onClick={()=>{if(account.status==='signed-out'&&account.error)setMode('login');setOpen(true);setError('');setHint('')}}><Icon name="lock" size={16}/><span>{account.status==='loading'?'正在认钥匙…':account.profile?.nickname||'登录 · 住下来'}</span></button>
 {open&&<Modal label={rescue?'收好账户备用钥匙':account.profile?'我的账户':'住下来 · 站内账户'} className="account-modal" onClose={close}>
  <span className="account-eyebrow">A LITTLE PLACE OF YOUR OWN</span>
  {rescue?<><h2>给你一把备用钥匙。</h2><p>不绑邮箱，也能找回小窝。只有这次会完整显示，请别交给其他人。</p><div className="account-recovery"><span>{name}</span><code>{rescue.match(/.{1,8}/g)?.join('-')}</code></div><button className="room-pill" onClick={keepKey}><Icon name="download" size={17}/>保存备用钥匙</button><label className="account-check"><input type="checkbox" checked={saved} onChange={e=>setSaved(e.target.checked)}/>我已妥善保存备用钥匙</label><button className="room-pill account-primary" disabled={!saved} onClick={close}>带着钥匙回小窝<Icon name="arrow" size={16}/></button></>:account.profile?<><h2>{account.profile.nickname}，你回来了。</h2><p>收藏和已经保存的小窝布置，会跟着这个名字一起回来。</p><dl className="account-summary"><div><dt>收留的扭蛋</dt><dd>{account.capsules.length} 枚</dd></div><div><dt>住下的日子</dt><dd>{new Date(account.profile.created_at).toLocaleDateString('zh-CN')}</dd></div></dl><div className="account-profile-actions"><button className="room-pill" disabled={busy} onClick={()=>void bringLocal()}>带上本机旧收藏</button><button className="text-button" disabled={busy} onClick={async()=>{setBusy(true);try{await account.reload();setHint('已经查看最新保存的生活。')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}>重新同步</button><button className="text-button" disabled={busy} onClick={async()=>{setBusy(true);try{await account.logout();setOpen(false);setPassword('')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}>退出当前账户</button></div><p className="account-small">退出前，记得保存正在编辑的布置和明信片。</p></>:<>
   <h2>{mode==='register'?'在这里，住下来。':mode==='login'?'带着钥匙，回家。':'备用钥匙派上用场了。'}</h2>
   <p>{mode==='recover'?'填写名字和找回码，给账户换一把新钥匙。':mode==='register'?'取一个只属于你的名字。换个浏览器，小住客也会认得你。':'名字和密码就够了，不用邮箱或微信。'}</p>
   <form onSubmit={e=>void submit(e)}>
    <label>你的名字<input value={name} onChange={e=>setName(e.target.value)} autoComplete="username" maxLength={32} required placeholder="2–16 个字，名字不能重复" disabled={busy}/></label>
    {mode==='recover'&&<label>找回码<input value={code} onChange={e=>setCode(e.target.value)} autoComplete="off" spellCheck={false} required placeholder="备用钥匙上的那串字符" disabled={busy}/></label>}
    <label>{mode==='recover'?'新密码':'密码'}<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='login'?'current-password':'new-password'} minLength={6} maxLength={72} required placeholder="至少 6 个字符" disabled={busy}/></label>
    <button className="room-pill account-primary" disabled={busy||account.status==='loading'} type="submit">{busy?'正在认钥匙…':mode==='register'?'给自己留一把钥匙':mode==='login'?'回到我的小窝':'换一把新钥匙'}<Icon name="arrow" size={17}/></button>
   </form>
   <div className="account-form-links">{mode!=='login'&&<button disabled={busy} onClick={()=>{setMode('login');setError('');setPassword('');setCode('')}}>已经住下了，去登录</button>}{mode!=='register'&&<button disabled={busy} onClick={()=>{setMode('register');setError('');setPassword('');setCode('')}}>第一次来，创建账户</button>}{mode!=='recover'&&<button disabled={busy} onClick={()=>{setMode('recover');setError('');setPassword('')}}>忘记密码了</button>}</div>
  </>}
  {(error||account.error)&&<p className="account-error" role="alert">{error||account.error}</p>}{hint&&<p className="account-small" role="status">{hint}</p>}
  <p className="account-preview-note">{localPreview?'账户功能测试版 · 暂未发布到线上商店':'站内账户 · 不绑定邮箱或微信，请妥善保存备用钥匙'}</p>
 </Modal>}
 </>;
}
