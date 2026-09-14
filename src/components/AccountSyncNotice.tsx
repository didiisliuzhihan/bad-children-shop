import {tx,useLanguage} from '../lib/i18n';
import {useState} from 'react';
import {useAccount} from '../lib/AccountContext';

export function AccountSyncNotice(){
 useLanguage();
 const account=useAccount(),[busy,setBusy]=useState(false);
 if(!account?.profile||!account.syncError)return null;
 return <aside className="account-sync-banner" role="status"><span>{tx(account.syncError)}</span><button disabled={busy} onClick={async()=>{setBusy(true);try{await account.reload()}catch{}finally{setBusy(false)}}}>{tx(busy?'同步中…':'重试同步')}</button></aside>;
}
