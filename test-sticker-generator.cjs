const fs=require('fs'),assert=require('assert/strict'),Module=require('module'),vm=require('vm');
const ts=require('typescript');
const source=fs.readFileSync('server/sticker-generator.ts','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});assert.equal(compiled.diagnostics?.filter(x=>x.category===1).length,0);
const m=new Module('generator',module);m.require=require;m._compile(compiled.outputText,'generator');const generate=m.exports.generateSticker;
process.env.OPENAI_API_KEY='sk-test-fixture';process.env.STICKER_GENERATOR_QUOTA_SECRET='a'.repeat(64);process.env.VITE_SUPABASE_URL='https://example.supabase.co';process.env.VITE_SUPABASE_ANON_KEY='anon-fixture';
let calls=[];let quota=true;let serviceStatus=200;let serviceBody={data:[{b64_json:'iVBORtest'}]};
global.fetch=async(url,opts)=>{calls.push({url,body:JSON.parse(opts.body)});return url.includes('/rpc/')?{ok:true,json:async()=>quota}:{ok:serviceStatus===200,status:serviceStatus,json:async()=>serviceBody};};
async function run(body,origin='https://www.slapwrapz.com'){let status,data;await generate(body,{headers:{origin,'x-real-ip':'192.0.2.10'}},{status(v){status=v;return this},json(v){data=v}});return {status,data};}
(async()=>{
 const valid={prompt:'A cheerful frog with a tiny crown',style:'Playful'};
 assert.equal((await run(valid,'https://evil.example')).status,403);assert.equal(calls.length,0);
 assert.equal((await run({...valid,prompt:'a'})).status,400);assert.equal(calls.length,0);
 assert.equal((await run({...valid,style:'unlimited expensive'})).status,400);
 quota=false;assert.equal((await run(valid)).status,429);assert.equal(calls.length,1);assert(!JSON.stringify(calls).includes('192.0.2.10'));
 quota=true;calls=[];let r=await run(valid);assert.equal(r.status,200);assert.equal(r.data.image,'data:image/png;base64,iVBORtest');assert.equal(calls.length,2);assert.equal(calls[1].body.n,1);assert.equal(calls[1].body.quality,'low');assert.equal(calls[1].body.size,'1024x1024');
 serviceStatus=429;serviceBody={error:{code:'insufficient_quota'}};assert.equal((await run(valid)).status,503);
 serviceStatus=401;assert.equal((await run(valid)).status,503);
 serviceStatus=200;serviceBody={data:[]};assert.equal((await run(valid)).status,502);
 delete process.env.OPENAI_API_KEY;assert.equal((await run(valid)).status,503);
 for(const file of ['public/stickers/generator.js','public/stickers/checkout.js'])new vm.Script(fs.readFileSync(file,'utf8'));
 console.log('PASS: origin, prompt, style, hashed visitor, quota before API, bounded image settings, billing/access errors, invalid output, missing credentials, frontend syntax.');
})().catch(e=>{console.error(e);process.exitCode=1});
