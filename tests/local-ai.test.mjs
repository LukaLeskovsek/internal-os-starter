import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import ts from 'typescript';
import * as zod from 'zod';
import path from 'node:path';
import * as policy from '../lib/ai-backend.mjs';

function harness(env={}, options={}) {
 const calls=[], dirs=[];let apiCalls=0, inserts=0, removed=0;
 const supabase={from:()=>({select:()=>({order:()=>({limit:async()=>({data:[],error:null})})}),insert:()=>{inserts++;throw new Error("Unexpected save after AI failure");}}),storage:{from:()=>({upload:async()=>({error:null}),remove:async()=>{removed++;return{error:null};}})}};
 const cwd={...env};const cache=new Map();
 const OpenAI=class { constructor(opts) { this.opts=opts;this.chat={completions:{create:async()=>{apiCalls++;if(options.apiError)throw options.apiError;return{choices:[{message:{content:'API answer'}}]};}}}; assert.equal(opts.maxRetries,0); } };
 const spawn=(command,args,opts)=>{
  assert.equal(command,'claude');calls.push({args,env:opts.env,cwd:opts.cwd,stdin:''});const record=calls.at(-1);
  const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{child.emit('close',1);};
  child.stdin=new Writable({write(chunk,_,next){record.stdin+=chunk.toString();next();}});
  child.stdin.on('finish',()=>queueMicrotask(()=>{
   if(options.missing){child.emit('error',new Error('ENOENT'));return;}
   if(args[0]==='auth'){child.stdout.write(JSON.stringify(options.auth??{loggedIn:true,authMethod:'claude.ai',subscriptionType:'team'}));child.emit('close',0);return;}
   if(options.failure){child.emit('close',1);return;}
   child.stdout.write(args.includes('stream-json')?JSON.stringify({type:'result',is_error:false,result:'file answer'})+'\n':'local answer');child.emit('close',0);
  }));return child;
 };
 function load(file){
  if(cache.has(file))return cache.get(file);
  const result={exports:{}};cache.set(file,result.exports);
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const require=name=>{
   if(name==='server-only')return{};
   if(name==='next/cache')return{revalidatePath(){}};
   if(name==='zod')return zod;
   if(name==='@/lib/module-context')return{moduleContext:async()=>options.denied?{ok:false,error:'Do tega orodja nimaš dostopa.'}:{ok:true,user:{id:'fixture-user'},supabase}};
   if(name.startsWith('@/lib/'))return load(name.replace('@/','')+'.ts');
   if(name.startsWith('./')&&name!=='./ai-backend.mjs'&&name!=='./i18n/sl')return load(path.normalize(path.join(path.dirname(file),name+'.ts')));
   if(name.startsWith('../'))return load(path.normalize(path.join(path.dirname(file),name+'.ts')));

   if(name==='openai')return OpenAI;
   if(name==='node:child_process')return{spawn};
   if(name==='node:fs')return{mkdtempSync:prefix=>{const d=fs.mkdtempSync(prefix);dirs.push(d);return d;}};
   if(name==='node:path')return{join:(...a)=>a.join('/')};
   if(name==='node:os')return{tmpdir:()=>'/tmp'};
   if(name==='./ai-backend.mjs')return {...policy,aiBackend:env=>policy.aiBackend(env??cwd),localClaudeEnv:env=>policy.localClaudeEnv(env??cwd)};
   if(name==='./i18n/sl')return load('lib/i18n/sl.ts');
   throw new Error('Unexpected import '+name);
  };
  vm.runInNewContext(source,{exports:result.exports,module:result,require,process:{env:cwd},setTimeout,clearTimeout,File,Buffer,crypto,fetch:async()=>{throw new Error("Unexpected external API fetch");},console:{warn(){},error(){}}},{filename:file});cache.set(file,result.exports);return result.exports;
 }
 return {ai:load('lib/ai.ts'),budget:()=>load('lib/ai-budget.ts'),action:file=>load(file),inserts:()=>inserts,removed:()=>removed,calls,apiCalls:()=>apiCalls,cleanup(){for(const d of dirs)fs.rmSync(d,{recursive:true,force:true});}};
}

for(const env of [{},{NODE_ENV:'production'},{OPENROUTER_API_KEY:'test-key',ANTHROPIC_API_KEY:'test-key',ANTHROPIC_AUTH_TOKEN:'test-token',ANTHROPIC_BASE_URL:'https://example.invalid',CLAUDE_CODE_USE_BEDROCK:'1',CLAUDE_CODE_OAUTH_TOKEN:'test-token'}]){
 test('local default never calls API: '+JSON.stringify(Object.keys(env)),async()=>{const h=harness(env);try{
  assert.equal((await h.ai.generate({prompt:'-dangerous argv'})).text,'local answer');assert.equal(h.apiCalls(),0);
  assert.equal(h.calls.length,2);assert.equal(h.calls[0].args[0],'auth');assert.equal(h.calls[1].stdin,'-dangerous argv');assert(!h.calls[1].args.includes('-dangerous argv'));
  for(const c of h.calls){assert(!c.env.ANTHROPIC_API_KEY);assert(!c.env.ANTHROPIC_AUTH_TOKEN);assert(!c.env.ANTHROPIC_BASE_URL);assert(!c.env.CLAUDE_CODE_USE_BEDROCK);assert(!c.env.CLAUDE_CODE_OAUTH_TOKEN);assert(!c.env.OPENROUTER_API_KEY);}
  assert(h.calls[1].args.includes('--strict-mcp-config'));assert(h.calls[1].args.includes('--no-session-persistence'));assert.equal(h.calls[1].args[h.calls[1].args.indexOf('--tools')+1],'');
 }finally{h.cleanup();}});
}
for(const options of [{missing:true},{failure:true},{auth:{loggedIn:false}},{auth:{loggedIn:true,authMethod:'console',subscriptionType:'team'}},{auth:{loggedIn:true,authMethod:'claude.ai',subscriptionType:null}}]){
 test('local failure produces neither API nor synthetic success '+JSON.stringify(options),async()=>{const h=harness({OPENROUTER_API_KEY:'test-key'},options);try{await assert.rejects(h.ai.generate({prompt:'test'}),policy.AiSetupError);assert.equal(h.apiCalls(),0);}finally{h.cleanup();}});
}
test('images/PDF use the same auth and route',async()=>{const h=harness();try{for(const mime of ['image/png','application/pdf'])assert.equal(await h.ai.generateFromFile({system:'read',prompt:'test',file:{base64:'dGVzdA==',mime}}),'file answer');assert.equal(h.calls.filter(c=>c.args[0]==='auth').length,2);assert.equal(h.apiCalls(),0);}finally{h.cleanup();}});
test('file failure cannot fall through to API',async()=>{const h=harness({OPENROUTER_API_KEY:'test'},{failure:true});try{await assert.rejects(h.ai.generateFromFile({system:'read',prompt:'test',file:{base64:'',mime:'application/pdf'}}),policy.AiSetupError);assert.equal(h.apiCalls(),0);}finally{h.cleanup();}});
test('Vercel refuses local text and file calls',async()=>{const h=harness({VERCEL:'1',AI_BACKEND:'local-claude'});try{await assert.rejects(h.ai.generate({prompt:'test'}),policy.AiSetupError);await assert.rejects(h.ai.generateFromFile({system:'read',prompt:'test',file:{base64:'',mime:'application/pdf'}}),policy.AiSetupError);assert.equal(h.calls.length,0);}finally{h.cleanup();}});
test('explicit local API choice remains supported',async()=>{const h=harness({AI_BACKEND:'openrouter',OPENROUTER_API_KEY:'test'});try{assert.equal((await h.ai.generate({prompt:'test'})).text,'API answer');assert.equal(h.calls.length,0);assert.equal(h.apiCalls(),1);}finally{h.cleanup();}});
test('hosted without key is visibly demo, not a model',async()=>{const h=harness({VERCEL:'1'});try{const r=await h.ai.generate({prompt:'test'});assert.equal(h.ai.aiConfigured(),false);assert.equal(r.mock,true);assert(r.text.startsWith('Demo odgovor:'));assert.equal(h.apiCalls(),0);}finally{h.cleanup();}});
test('provider budget is not retried and message is safe',async()=>{const h=harness({AI_BACKEND:'openrouter',OPENROUTER_API_KEY:'test'},{apiError:{status:403,error:{metadata:{limit_source:'openrouter_key_limit'}},secret:'must-not-show'}});try{await assert.rejects(h.ai.generate({prompt:'test'}),e=>h.ai.aiErrorMessage(e).includes('omejitev porabe'));assert.equal(h.apiCalls(),1);assert(!h.ai.aiErrorMessage({status:401,secret:'test'}).includes('test'));}finally{h.cleanup();}});
test('daily cap skips local even with API key in env',async()=>{const h=harness({OPENROUTER_API_KEY:'test'});try{await h.budget().recordAiUsage({rpc(){throw new Error('should not count API');}},'test');}finally{h.cleanup();}});
test('daily cap rejects before inference',async()=>{const h=harness({AI_BACKEND:'openrouter',OPENROUTER_API_KEY:'test',AI_DAILY_LIMIT_PER_USER:'0'});try{const b=h.budget();await assert.rejects(b.recordAiUsage({rpc:async(name,args)=>{assert.equal(args.p_limit,0);return{data:false,error:null};}},'test'),b.AiDailyLimitError);assert.equal(h.apiCalls(),0);}finally{h.cleanup();}});

test('failed local text action does not save an answer',async()=>{const h=harness({}, {failure:true});try{const r=await h.action('modules/ai_assist/actions.ts').askAssistant('test');assert.equal(r.ok,false);assert(r.error.includes('Lokalni Claude'));assert.equal(h.inserts(),0);assert.equal(h.apiCalls(),0);}finally{h.cleanup();}});
test('failed local file action removes original and creates no invoice',async()=>{const h=harness({}, {failure:true});try{const form=new FormData();form.set('file',new File(['test'],'test.png',{type:'image/png'}));const r=await h.action('modules/invoice_ocr/actions.ts').uploadInvoice(form);assert.equal(r.ok,false);assert(r.error.includes('Lokalni Claude'));assert.equal(h.inserts(),0);assert.equal(h.removed(),1);assert.equal(h.apiCalls(),0);}finally{h.cleanup();}});
test('denied user cannot invoke text or file model',async()=>{const h=harness({}, {denied:true});try{assert.equal((await h.action('modules/ai_assist/actions.ts').askAssistant('test')).ok,false);const form=new FormData();form.set('file',new File(['test'],'test.png',{type:'image/png'}));assert.equal((await h.action('modules/invoice_ocr/actions.ts').uploadInvoice(form)).ok,false);assert.equal(h.calls.length,0);assert.equal(h.inserts(),0);assert.equal(h.apiCalls(),0);}finally{h.cleanup();}});
