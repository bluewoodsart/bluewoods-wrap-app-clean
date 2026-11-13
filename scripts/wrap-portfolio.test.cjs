const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const photos=JSON.parse(fs.readFileSync(path.join(root,'src/data/wrapPortfolio.json')));
test('all portfolio images are distinct, available WebP assets with descriptive alt text',()=>{
 assert.equal(photos.length,29);
 assert.equal(new Set(photos.map(p=>p.src)).size,29);
 assert.equal(new Set(photos.map(p=>p.alt)).size,29);
 for(const p of photos){
  assert.ok(p.alt.length>40);
  const image=fs.readFileSync(path.join(root,'public',p.src));
  assert.equal(image.toString('ascii',8,12),'WEBP');
 }
 assert.equal(photos.filter(p=>p.featured).length,6);
});
test('crawlable vehicle-wraps HTML includes every photo and exact alt text',()=>{
 const html=fs.readFileSync(path.join(root,'public/services/vehicle-wraps.html'),'utf8');
 const escape=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
 for(const p of photos)assert.ok(html.includes(`src="${p.src}" alt="${escape(p.alt)}"`),p.id);
 assert.match(html,/<title>Vehicle Wraps in Fayetteville, GA \| SlapWrapz<\/title>/);
 assert.match(html,/id="completed-wraps"/);
 assert.match(html,/\/service-quote\?service=vehicle-wraps/);
});
