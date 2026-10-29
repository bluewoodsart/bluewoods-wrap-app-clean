const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const root=__dirname;
const html=fs.readFileSync(root+'/public/stickers/index.html','utf8').replace(/<script src=[^>]+><\/script>/g,'');
const tick=()=>new Promise(r=>setTimeout(r,10));
(async()=>{
 const dom=new JSDOM(html,{url:'http://localhost/stickers',runScripts:'dangerously',beforeParse(w){
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.TextEncoder=TextEncoder;Object.defineProperty(w,'crypto',{value:webcrypto});
 }});const w=dom.window,$=s=>w.document.querySelector(s);let calls=[],pending;
 w.fetch=async(url,opts)=>{if(!opts)return {ok:true,json:async()=>({enabled:true,mode:'test',generatorEnabled:true})};const body=JSON.parse(opts.body);calls.push(body);return new Promise(r=>{pending=r})};
 Object.defineProperty(w.HTMLImageElement.prototype,'complete',{get:()=>true});Object.defineProperty(w.HTMLImageElement.prototype,'naturalWidth',{get:()=>1200});Object.defineProperty(w.HTMLImageElement.prototype,'naturalHeight',{get:()=>1200});let finishDecode;w.HTMLImageElement.prototype.decode=async()=>{};w.URL.createObjectURL=()=> 'blob:mock-upload';w.URL.revokeObjectURL=()=>{};
 w.HTMLCanvasElement.prototype.getContext=()=>({fillRect(){},save(){},beginPath(){},arc(){},clip(){},drawImage(){},restore(){}});
 w.HTMLCanvasElement.prototype.toBlob=function(cb){cb(new w.Blob(['mock-canvas-png'],{type:'image/png'}))};
 w.eval(fs.readFileSync(root+'/public/stickers/checkout.js','utf8'));w.eval(fs.readFileSync(root+'/public/stickers/generator.js','utf8'));await tick();
 function approval(){ $('#artApproval').checked=true;$('#artApproval').dispatchEvent(new w.Event('change')); }
 const original=w.document.createElement('img');original.src='data:image/png;base64,aGVsbG8=';$('#preview').replaceChildren(original);await tick();$('#review').click();approval();assert(!$('#checkout').disabled);assert.equal($('#total').textContent,'$11.11');
 $('#delivery').value='pickup';$('#delivery').dispatchEvent(new w.Event('change'));assert.equal($('#total').textContent,'$10.00');
 $('#prompt').value='A cheerful frog';$('#generate').click();$('#generate').click();await tick();assert.equal(calls.length,1);assert($('#checkout').disabled);assert($('#upload').disabled);assert(!$('#artApproval').checked);
 pending({ok:false,json:async()=>({error:'Blocked by content rules.',attemptStatus:'reserved'})});await tick();assert.equal($('#preview img'),original);assert($('#status').textContent.includes('used one daily preview attempt'));assert($('#status').textContent.includes('previous selection'));assert($('#checkout').disabled);assert(!$('#generate').disabled);
 approval();$('#checkout').click();$('#checkout').click();await tick();assert($('#generate').disabled);assert($('#delivery').disabled);assert.equal(calls.length,2);const saved=JSON.parse(w.localStorage.getItem('bwb-sticker-order'));assert.equal(calls[1].id,saved.id);
 pending({ok:false,json:async()=>({error:'Simulated interrupted save.'})});await tick();assert(!$('#generate').disabled);assert(!$('#checkout').disabled);assert($('#checkoutStatus').textContent.includes('interrupted'));
 $('#checkout').click();await tick();assert.equal(calls.length,3);assert.equal(calls[2].id,saved.id);assert.equal(calls[2].token,saved.token);
 pending({ok:false,json:async()=>({error:'Draft expired.',restart:true})});await tick();assert.equal(w.localStorage.getItem('bwb-sticker-order'),null);
 $('#prompt').value='Another cheerful frog';$('#generate').click();await tick();pending({ok:true,json:async()=>({image:'data:image/png;base64,dGVzdA=='})});await tick();assert.notEqual($('#preview img'),original);assert(!$('#artApproval').checked);assert($('#checkout').disabled);assert.equal($('#cartThumb img').src,$('#preview img').src);
 assert($('.demo').textContent.includes('TEST CHECKOUT'));
 assert($('#checkoutStatus').textContent.includes('testing only'));
 approval();const beforeUpload=$('#preview img');
 w.HTMLImageElement.prototype.decode=()=>new Promise(resolve=>{finishDecode=resolve});
 Object.defineProperty($('#upload'),'files',{value:[new w.File(['image'],'art.png',{type:'image/png'})],configurable:true});
 const uploadDone=$('#upload').onchange({target:$('#upload')});
 assert($('#checkout').disabled);assert($('#generate').disabled);assert($('#artApproval').disabled);assert(!$('#artApproval').checked);
 const count=calls.length;$('#generate').click();$('#checkout').click();await tick();assert.equal(calls.length,count);assert.equal($('#preview img'),beforeUpload);
 finishDecode();await uploadDone;await tick();assert.notEqual($('#preview img'),beforeUpload);assert(!$('#artApproval').checked);assert(!$('#generate').disabled);assert($('#checkout').disabled);
 // A failed decode preserves the old image but never its approval.
 approval();const validUpload=$('#preview img');w.HTMLImageElement.prototype.decode=async()=>{throw Error('bad image')};await $('#upload').onchange({target:$('#upload')});await tick();assert.equal($('#preview img'),validUpload);assert(!$('#artApproval').checked);assert($('#uploadStatus').textContent.includes('previous selection'));
 const admin=fs.readFileSync(root+'/src/components/admin/StickerOrders.tsx','utf8');assert(admin.includes('TEST ONLY — do not print or fulfill'));assert(admin.includes('TEST-DO-NOT-PRINT-'));
 console.log('PASS offline DOM mocks: generation/checkout exclusion, repeated clicks, preserved old art + honest reserved-attempt error, approval reset, mail/pickup totals, interrupted checkout retry identity, expired draft reset, new preview thumbnail, test-mode messaging, delayed/failed upload decoding locks and TEST admin labels. Image decode/canvas and all API calls mocked; not a browser/payment test.');dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1});
