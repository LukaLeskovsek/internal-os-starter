// Actual TypeScript actions -> actual PostgREST -> isolated PostgreSQL.
// Identity context, storage upload and OCR are explicit fixtures, not live services.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import ts from 'typescript';
import * as zod from 'zod';
import { PostgrestClient } from '@supabase/postgrest-js';

const fixture=JSON.parse(process.env.INVOICE_ACTION_FIXTURE);
const client=new PostgrestClient(fixture.url,{headers:{Authorization:'Bearer '+fixture.token}});
let denied=false, badLines=false, removed=0, unavailable=false;
const storage={from(){return {
  async upload(name){
    const response=await fetch(fixture.fixtureUrl+'/object',{method:'POST',headers:{Authorization:'Bearer '+fixture.token},body:JSON.stringify({name})});
    assert.equal(response.status,200); return {error:null};
  },
  async remove(){removed++;return {error:null};},
};}};
const supabase={from:(...a)=>client.from(...a),rpc:(...a)=>unavailable?Promise.resolve({error:{message:'arbitrary SQL failure',code:'XX000'}}):client.rpc(...a),storage};
const cache=new Map();
function load(file){
  if(cache.has(file))return cache.get(file);
  const module={exports:{}};
  const require=name=>{
    if(name==='server-only'||name==='next/cache')return {revalidatePath(){}};
    if(name==='zod')return zod;
    if(name==='@/lib/module-context')return {moduleContext:async()=>denied?{ok:false,error:'Denied'}:{ok:true,user:{id:fixture.actor},supabase}};
    if(name==='@/lib/ai-budget')return {recordAiUsage:async()=>{},AiDailyLimitError:class extends Error{}};
    if(name==='@/lib/ai')return {aiErrorMessage:()=> 'Failed'};
    if(name==='./lib/ocr')return {
      emptyInvoiceFields:()=>({}),extractInvoice:async()=>({
        data:{vendor:'Adapter vendor',total_amount:123.45},raw:'synthetic',mock:true,
        lineItems:badLines?[{quantity:'bad'}]:[{description:'Adapter line',total_amount:123.45}],
      }),
    };
    if(name.startsWith('@/'))return load(name.replace('@/','')+'.ts');
    if(name.startsWith('.'))return load(path.normalize(path.join(path.dirname(file),name+'.ts')));
    throw new Error('Unexpected import: '+name);
  };
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{module,exports:module.exports,require,console,File,FormData,Buffer,crypto,Date},{filename:file});
  cache.set(file,module.exports);return module.exports;
}
const actions=load('modules/invoice_ocr/actions.ts');
assert.equal(actions.setInvoiceStatus,undefined,'arbitrary status action must be removed');
const file=()=>{const form=new FormData();form.set('file',new File(['synthetic'],'test.pdf',{type:'application/pdf'}));return form;};
const uploaded=await actions.uploadInvoice(file()); assert.equal(uploaded.ok,true,JSON.stringify(uploaded));
const inv=uploaded.data.id;
let {data:rows,error}=await client.from('invoice_ocr_line_items').select('*').eq('invoice_id',inv);
assert.equal(error,null);assert.equal(rows.length,1);
const decision=new FormData();
for(const [k,v] of Object.entries({id:inv,revision:'1',request_id:crypto.randomUUID(),decision:'approve',vendor:'Corrected adapter',total_amount:'1250,50'}))decision.set(k,v);
const approved=await actions.decideInvoice(undefined,decision);
assert.equal(approved.ok,true,JSON.stringify(approved)); assert.equal(approved.data.revision,2);
const replay=await actions.decideInvoice(undefined,decision); assert.equal(replay.ok,true);assert.equal(replay.data.revision,2);
const reopened=await actions.reopenInvoice(inv,2,crypto.randomUUID());assert.equal(reopened.ok,true);
const undo=await actions.undoInvoice(inv,3,reopened.data.requestId,crypto.randomUUID());assert.equal(undo.ok,true);assert.equal(undo.data.status,'approved');
const stale=await actions.reopenInvoice(inv,2,crypto.randomUUID());assert.equal(stale.ok,false);assert.match(stale.error,/medtem/);
badLines=true;const rejectedImport=await actions.uploadInvoice(file());assert.equal(rejectedImport.ok,false);assert.equal(removed,1);badLines=false;
({data:rows}=await client.from('invoice_ocr_invoices').select('id'));
assert.equal(rows.length,1,'bad child import must not leave a header');
unavailable=true;const failed=await actions.reopenInvoice(inv,4,crypto.randomUUID());assert.equal(failed.ok,false);assert(!failed.error.includes('SQL'));unavailable=false;
denied=true;assert.equal((await actions.reopenInvoice(inv,4,crypto.randomUUID())).ok,false);
console.log(JSON.stringify({groups:6,status:'pass',checks:['atomic upload and lines','decision/replay with Slovenian amount','reopen and revision-bound undo','stale error','failed import cleanup','infrastructure and denied access']}));
