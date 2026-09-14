import type {ReactNode} from 'react';
import {useLanguage} from '../lib/i18n';

/** English glosses support the Chinese view; never repeat the English copy. */
export function ChineseOnly({children}:{children:ReactNode}){
 return useLanguage()==='zh'?children:null;
}
