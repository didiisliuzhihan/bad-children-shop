import {useState} from 'react';
import {useAccount} from '../lib/AccountContext';

export function AccountSyncNotice(){
 const account=useAccount(),[busy,setBusy]=useState(false);
 if(!account?.profile||!account.syncError)return null;
 return <aside className="account-sync-banner" role="status"><span>{account.syncError}</span><button disabled={busy} onClick={async()=>{setBusy(true);try{await account.reload()}catch{}finally{setBusy(false)}}}>{busy?'同步中…':'重试同步'}</button></aside>;
}
