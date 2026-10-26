const fs=require('fs'),assert=require('assert/strict'),Module=require('module'),crypto=require('crypto');
const ts=require('typescript');
function compile(file,mocks={}){const result=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});assert.equal(result.diagnostics?.filter(d=>d.category===1).length,0);const m=new Module(file,module);m.require=name=>mocks[name]||require(name);m._compile(result.outputText,file);return m.exports;}
const pngModule=compile('server/sticker-png.mjs');
const recoveryModule=compile('server/sticker-recovery.mjs');
const core=compile('server/sticker-core.ts',{'./sticker-png.mjs':pngModule});
const raw=Buffer.from('{"event":"test"}'),now=Date.now(),timestamp=Math.floor(now/1000),secret='whsec_test';
const sig=crypto.createHmac('sha256',secret).update(timestamp+'.').update(raw).digest('hex');
assert(core.verifySignature(raw,`t=${timestamp},v1=${sig}`,secret,now));
assert(!core.verifySignature(Buffer.from('changed'),`t=${timestamp},v1=${sig}`,secret,now));
assert(!core.verifySignature(raw,`t=${timestamp},v1=${sig}`,secret,now+301000));
assert(!core.verifySignature(raw,'t=bad,v1=00',secret,now));
const order={id:'00000000-0000-4000-8000-000000000001',stripe_session_id:'cs_test_1',amount_total:1111,stripe_mode:'test'};
const session={id:'cs_test_1',client_reference_id:order.id,metadata:{sticker_order_id:order.id},currency:'usd',amount_total:1111,livemode:false,payment_status:'paid'};
assert(core.validPaidSession(session,order));
for(const patch of [{id:'other'},{amount_total:1},{currency:'eur'},{livemode:true},{payment_status:'unpaid'},{metadata:{sticker_order_id:'other'}},{client_reference_id:'other'}])assert(!core.validPaidSession({...session,...patch},order));
assert.equal(core.totalFor('mail'),1111);assert.equal(core.totalFor('pickup'),1000);assert.equal(core.totalFor('invalid'),0);
assert.throws(()=>core.validateArtwork(Buffer.from('<svg/>').toString('base64')));
const png=Buffer.alloc(33);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.write('IHDR',12);png.writeUInt32BE(1200,16);png.writeUInt32BE(1200,20);assert.throws(()=>core.validateArtwork(png.toString('base64')));
png.writeUInt32BE(999999,16);assert.throws(()=>core.validateArtwork(png.toString('base64')));
let existing=null,updates=[],uploadCount=0;
const db={from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:existing,error:null}),update(value){updates.push(value);return {eq(){return this},then(resolve){resolve({error:null})}}}})};
const handler=compile('server/sticker-handler.ts',{'./sticker-recovery.mjs':recoveryModule,'@supabase/supabase-js':{createClient:()=>db},'./sticker-core.js':core,'./sticker-generator.js':{generatorReady:()=>false,generateSticker:()=>{throw Error('unexpected generation')}}}).default;
async function call(body,headers={},method='POST'){let status,data;const req={method,headers,async *[Symbol.asyncIterator](){yield Buffer.from(typeof body==='string'?body:JSON.stringify(body))}};const res={setHeader(){},status(n){status=n;return this},json(v){data=v}};await handler(req,res);return {status,data};}
(async()=>{
 delete process.env.STRIPE_SECRET_KEY;delete process.env.SUPABASE_SERVICE_ROLE_KEY;
 assert.equal((await call({}, {},'GET')).data.enabled,false);
 assert.equal((await call({})).status,503);
 process.env.SUPABASE_SERVICE_ROLE_KEY='server-test-only';process.env.VITE_SUPABASE_URL='https://example.supabase.co';process.env.STRIPE_WEBHOOK_SECRET=secret;
 assert.equal((await call({action:'checkout',id:order.id,token:'a'.repeat(64)},{origin:'https://evil.example'})).status,403);
 assert.equal((await call({action:'checkout',id:order.id,token:'a'.repeat(64)},{origin:'https://www.slapwrapz.com'})).status,503);
 existing={...order,token_hash:'wrong'};assert.equal((await call({action:'status',id:order.id,token:'a'.repeat(64)},{origin:'https://www.slapwrapz.com'})).status,404);
 assert.equal((await call('{}',{'stripe-signature':'t=0,v1=bad'})).status,400);
 existing={...order,status:'pending'};
 const event={type:'checkout.session.completed',data:{object:session}},body=JSON.stringify(event),t=Math.floor(Date.now()/1000);
 const sign=b=>`t=${t},v1=${crypto.createHmac('sha256',secret).update(t+'.'+b).digest('hex')}`;
 assert.equal((await call(body,{'stripe-signature':sign(body)})).status,200);assert.equal(updates.length,1);assert.equal(updates[0].status,'paid');
 const invalid=JSON.stringify({...event,data:{object:{...session,amount_total:1}}});assert.equal((await call(invalid,{'stripe-signature':sign(invalid)})).status,400);assert.equal(updates.length,1);
 for(const file of ['src/components/admin/StickerOrders.tsx','src/components/admin/StickerStoreSettings.tsx']){
 const r=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});assert.equal(r.diagnostics?.filter(d=>d.category===1).length,0);}
 new (require('vm').Script)(fs.readFileSync('public/stickers/checkout.js','utf8'));
 console.log('PASS: signature freshness/tampering, payment binding/amount/currency/mode, artwork limits, disabled checkout, origin and token access, webhook confirmation and mismatch; TS/JS syntax.');
})().catch(e=>{console.error(e);process.exitCode=1});
