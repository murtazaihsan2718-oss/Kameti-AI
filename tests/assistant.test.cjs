const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const handler=require('../api/chatWithAssistant');
async function contextBuilder(){const mod=new vm.SourceTextModule(fs.readFileSync('js/services/assistantContext.js','utf8'),{context:vm.createContext({})});await mod.link(()=>{});await mod.evaluate();return mod.namespace.buildAssistantContext;}

test('context scopes memberships, computes current dues and preserves unknowns',async()=>{
 const build=await contextBuilder();
 const make=(id,extra={})=>({id,name:id,status:'active',contributionAmount:250,numberOfMembers:3,currentCycle:1,members:[{id:'me',name:'Test User'},{id:'sara',name:'Sara Noor'},{id:'third',name:'Third Member'}],currentRecipientId:'sara',...extra});
 const data={user:{id:'me',name:'Test User',phone:'03001234567',accountNumber:'SECRET'},committees:[make('pending'),make('paid'),make('proof',{members:[{id:'me',paymentStatus:'submitted'},{id:'sara'},{id:'third'}]}),make('recipient',{currentRecipientId:'me'}),make('forming',{status:'recruiting',members:[{id:'me'}]}),make('completed',{status:'completed'}),make('other',{creatorId:'other',members:[{id:'someone',name:'Test User'}]}),make('weekly',{frequency:'weekly'}),make('missing',{contributionAmount:null})],payments:[{committeeId:'paid',payerUserId:'me',cycleIndex:1,status:'verified'},{committeeId:'pending',payerUserId:'me',cycleIndex:2,status:'verified'}]};
 const ctx=build(data),find=id=>ctx.committees.find(c=>c.committeeId===id);
 assert.equal(find('other'),undefined);assert.equal(find('pending').userPayment.amountDue,250);assert.equal(find('pending').payout.currentRecipientName,'Sara Noor');assert.equal(find('pending').totalPool,750);
 for(const id of ['paid','proof','recipient','forming','completed'])assert.equal(find(id).userPayment.amountDue,0,id);
 assert.equal(find('missing').contributionAmount,null);assert.equal(ctx.totalMonthlyContributionDue,null);
 data.committees=data.committees.filter(c=>c.id!=='missing');assert.equal(build(data).totalMonthlyContributionDue,250);
 assert.equal(JSON.stringify(ctx).includes('SECRET'),false);assert.equal(JSON.stringify(ctx).includes('03001234567'),false);
 assert.equal(build({...data,user:null}).committees.length,0);
});

test('backend returns Gemini provenance only for real provider success; errors never become canned answers',async()=>{
 const originalFetch=global.fetch,oldKey=process.env.GEMINI_API_KEY,oldGoogle=process.env.GOOGLE_API_KEY;let captured;
 const invoke=async body=>{const res={code:200,setHeader(){},status(c){this.code=c;return this;},json(d){this.body=d;return this;},end(){}};await handler({method:'POST',body},res);return res;};
 try{
  delete process.env.GEMINI_API_KEY;delete process.env.GOOGLE_API_KEY;
  assert.equal((await invoke({message:'Hello'})).code,503);process.env.GEMINI_API_KEY='test-only';
  global.fetch=async(url,opts)=>{captured=JSON.parse(opts.body);assert.equal(opts.headers['x-goog-api-key'],'test-only');return{ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'hidden reasoning'},{text:'Sara Noor receives PKR 750.'}]}}]})};};
  const ok=await invoke({message:'Who receives the pool?',userContext:{committees:[{committeeName:'Test circle',totalPool:750,payout:{currentRecipientName:'Sara Noor'}}]},conversationHistory:[{sender:'user',text:'Hello'},{sender:'assistant',text:'Hi'}]});
  assert.equal(ok.body.source,'gemini');assert.equal(ok.body.response,'Sara Noor receives PKR 750.');assert.ok(captured.systemInstruction.parts[0].text.includes('Sara Noor'));assert.equal(captured.contents.length,3);
  let tries=0;global.fetch=async()=>++tries===1?{ok:false,status:503}:{ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Recovered'}]}}]})};
  assert.equal((await invoke({message:'Hello'})).body.response,'Recovered');assert.equal(tries,2);
  global.fetch=async()=>({ok:false,status:429});const failed=await invoke({message:'Who is next?'});assert.equal(failed.code,429);assert.equal(failed.body.success,false);assert.equal(failed.body.source,'unavailable');assert.equal(failed.body.response,undefined);
  global.fetch=async()=>({ok:true,json:async()=>({candidates:[]})});assert.equal((await invoke({message:'Hello'})).code,502);
  assert.equal((await invoke('{bad')).code,400);
 }finally{global.fetch=originalFetch;for(const [key,value]of [['GEMINI_API_KEY',oldKey],['GOOGLE_API_KEY',oldGoogle]])if(value===undefined)delete process.env[key];else process.env[key]=value;}
});

test('web service sends fresh context and history to the backend and refuses unmarked fallbacks',async()=>{
 const fakeStore={getCommittees:()=>[],getMembers:()=>[],getMonths:()=>[],getPayments:()=>[],getUsers:()=>[]};let payload;let fail=false;
 const sandbox=vm.createContext({AbortController,setTimeout,clearTimeout,console,fetch:async(url,opts)=>{assert.equal(url,'https://kameti-ai-ten.vercel.app/api/chatWithAssistant');payload=JSON.parse(opts.body);return{ok:true,json:async()=>fail?{success:true,response:'Canned'}:{success:true,source:'gemini',model:'test-model',response:'No committees',language:'en'}};}});
 const service=new vm.SourceTextModule(fs.readFileSync('js/services/voiceAssistantService.js','utf8'),{context:sandbox});
 await service.link(spec=>{if(spec.includes('assistantContext'))return new vm.SourceTextModule(fs.readFileSync('js/services/assistantContext.js','utf8'),{context:sandbox});const name=spec.includes('authService')?'authService':'storageService';return new vm.SyntheticModule([name],function(){this.setExport(name,name==='storageService'?fakeStore:{getCurrentUser:()=>({id:'me',name:'Test User'})});},{context:sandbox});});await service.evaluate();
 assert.equal((await service.namespace.voiceAssistantService.processQuery('My committees',[{sender:'user',text:'Previous question'}])).source,'gemini');assert.equal(payload.userContext.user.name,'Test User');assert.equal(payload.conversationHistory[0].text,'Previous question');
 fail=true;await assert.rejects(service.namespace.voiceAssistantService.processQuery('Who is next?'),/unavailable/);
});
