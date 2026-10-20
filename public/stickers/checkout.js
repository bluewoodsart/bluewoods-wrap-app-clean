(() => {
 const $=s=>document.querySelector(s);
 const message=document.createElement('p');message.className='notice';message.setAttribute('role','status');
 $('#studio').prepend(message);
 let available=false,busy=false;
 const banner=$('.demo');
 const approval=$('#artApproval'),button=$('#checkout');
 $('#packQty').value='1';$('#packQty').min='1';$('#packQty').max='1';$('#packQty').disabled=true;
 $('#packQty').previousElementSibling.textContent='One ten-pack · 10 identical stickers';
 $('#delivery').options[0].textContent='U.S. letter mail — $1.11 (untracked)';
 $('#checkoutStatus').previousElementSibling.previousElementSibling.textContent='One pack per order. U.S. letter mail is untracked. Local pickup has no postage charge.';
 $('#uploadPanel .notice').textContent='PNG, JPG, or WebP, up to 10 MB. Your approved circular crop is saved securely when you continue to checkout. Keep important details near the center.';
 const faq=[...document.querySelectorAll('details')].find(d=>d.querySelector('summary')?.textContent.includes('today'));
 if(faq)faq.querySelector('p').textContent='Upload your own artwork to order a ten-pack when checkout is available. The AI generator is still a demonstration. You approve the circular crop and spelling before paying.';
 function refresh(){
  ['upload','artApproval','delivery','example'].forEach(id=>$('#'+id).disabled=busy);
  $('#packQty').value='1';
  const img=$('#preview img');
  const valid=!!img?.complete && img.naturalWidth>0;
  button.disabled=busy||!available||!valid||!approval.checked;
  button.textContent=busy?'Saving artwork…':available?'Continue to secure payment':'Checkout setup in progress';
  $('#checkoutStatus').textContent=available?'We save your approved crop with an order number, then send you to Stripe. Your order enters production after payment is confirmed.':'Checkout is being connected. You can preview your artwork now.';
  $('#totalLabel').textContent='Total';$('#postage').textContent=$('#delivery').value==='mail'?'$1.11':'$0.00';
 }
 // Run after the existing cart listener, which manages crop approval and totals.
 ['artApproval','delivery'].forEach(id=>$('#'+id).addEventListener('change',refresh));
 new MutationObserver(refresh).observe($('#preview'),{childList:true});
 $('#review').addEventListener('click',refresh);
 const readSaved=()=>{try{return JSON.parse(localStorage.getItem('bwb-sticker-order')||'null')}catch{return null}};
 async function api(body){const r=await fetch('/api/sticker-store',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok){if(data.restart)localStorage.removeItem('bwb-sticker-order');throw Error(data.error||'Please try again.');}return data;}
 async function crop(){
  const img=$('#preview img');if(!img?.complete||!img.naturalWidth)throw Error('Upload your artwork first.');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1200;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,1200,1200);ctx.save();ctx.beginPath();ctx.arc(600,600,600,0,Math.PI*2);ctx.clip();
  const side=Math.min(img.naturalWidth,img.naturalHeight);
  ctx.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,1200,1200);ctx.restore();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!blob||blob.size>2097152)throw Error('The print file is over 2 MB. Please upload a simpler image.');
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Artwork could not be prepared.'));reader.readAsDataURL(blob)});
 }
 button.onclick=async()=>{
  if(button.disabled)return;busy=true;refresh();
  try{
   const artwork=await crop(),delivery=$('#delivery').value;
   const bytes=new TextEncoder().encode(artwork+delivery);
   const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
   let order=readSaved();
   if(!order||order.fingerprint!==fingerprint){order={id:crypto.randomUUID(),token:Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''),fingerprint};localStorage.setItem('bwb-sticker-order',JSON.stringify(order));}
   const result=await api({action:'checkout',id:order.id,token:order.token,artwork,delivery,approved:true});
   const url=new URL(result.url);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw Error('Checkout could not be opened.');
   location.assign(url.href);
  }catch(e){busy=false;refresh();$('#checkoutStatus').textContent=e.message;}
 };
 async function checkReturn(){
  const params=new URLSearchParams(location.search);if(!params.has('payment'))return;
  const order=readSaved();if(!order){message.textContent='For order help, contact BWB with your Stripe receipt. This browser has no saved order reference.';return;}
  if(params.get('payment')==='cancelled'){message.textContent='Payment was cancelled. Your artwork is saved; no paid order has been confirmed.';return;}
  message.textContent='Checking payment confirmation…';
  for(let attempt=0;attempt<5;attempt++){
   try{const data=await api({action:'status',id:order.id,token:order.token});
    if(data.status==='paid'){message.textContent=(data.mode==='test'?'TEST PAYMENT — no real order. ':'Payment confirmed. Thank you! ')+ 'Order '+data.id+'.';return;}
    message.textContent='Order '+data.id+': '+data.status+'. We will only print after payment is confirmed.';
   }catch{message.textContent='Payment confirmation is not available yet. Please keep your Stripe receipt and contact BWB if needed.';return;}
   await new Promise(resolve=>setTimeout(resolve,2000));
  }
 }
 fetch('/api/sticker-store').then(r=>r.json()).then(data=>{
  available=data.enabled===true;
  banner.textContent=available?(data.mode==='test'?'TEST CHECKOUT — no real payments or production orders. AI generation is a demo.':'Custom ten-packs — $10 + postage. Upload your artwork to order. AI generation is a demo.'):'STOREFRONT PREVIEW — checkout setup in progress. AI generation is a demo.';
  refresh();
 }).catch(refresh);
 refresh();checkReturn();
})();
