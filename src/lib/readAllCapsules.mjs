/** Stable UUID cursor: avoids the API row cap and offset shifts during draws. */
export async function readAllCapsules(query,pageSize=500){
 const rows=[];let after;
 for(;;){const {data,error}=await query(after,pageSize);if(error)throw error;
  const page=data||[];rows.push(...page);if(page.length<pageSize)return rows;
  const next=page.at(-1)?.id;if(!next||next===after)throw Error('收藏分页没有前进，请重试。');after=next;
 }
}
