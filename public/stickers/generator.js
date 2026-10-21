(() => {
 const $=s=>document.querySelector(s),button=$('#generate');
 let busy=false,currentImage=null;
 button.textContent='Generate my sticker';
 $('#ideaPanel .notice').textContent='Two free preview attempts per day, subject to store availability. AI can misspell words—review your image carefully. Checkout is not open yet.';
 $('#how article:nth-child(2) p').textContent='Generate a preview, choose your favorite, and check every word. You can also upload your own artwork.';
 const download=document.createElement('button');download.type='button';download.textContent='Download generated image';download.className='example';download.hidden=true;
 $('#previewLabel').after(download);
 download.onclick=()=>{if(!currentImage)return;const a=document.createElement('a');a.href=currentImage;a.download='bwb-sticker-artwork.png';a.click();};
 fetch('/api/sticker-store').then(r=>r.json()).then(data=>{
  if(data.generatorEnabled){$('.demo').textContent='AI STICKER PREVIEWS ARE LIVE · Ordering is being connected.';const faq=[...document.querySelectorAll('details')].find(d=>d.querySelector('summary')?.textContent.includes('today'));if(faq)faq.querySelector('p').textContent='Yes—describe an idea to generate an AI sticker preview, or upload your own artwork. You can download generated images. Ordering is not open yet.';}
 });
 button.onclick=async()=>{
  if(busy)return;const prompt=$('#prompt').value.trim();
  if(prompt.length<5||prompt.length>1200){$('#status').textContent='Describe your sticker using 5–1,200 characters.';$('#prompt').focus();return;}
  busy=true;button.disabled=true;button.textContent='Creating your sticker…';download.hidden=true;
  ['upload','example','ideaTab','uploadTab'].forEach(id=>$('#'+id).disabled=true);
  $('#status').textContent='Creating your image. This can take a minute or two. Please keep this page open.';
  try{
   const response=await fetch('/api/sticker-store',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'generate',prompt,style:$('.style.active').textContent.trim()})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Your image could not be created.');
   if(typeof data.image!=='string'||!data.image.startsWith('data:image/png;base64,'))throw Error('The preview could not be opened.');
   const img=new Image();img.alt='AI-generated sticker artwork';img.src=data.image;await img.decode();
   currentImage=data.image;$('#preview').replaceChildren(img);$('#previewLabel').textContent='YOUR AI ARTWORK · REVIEW SPELLING AND CROP';
   $('#status').textContent='Your image is ready. Review the circular crop and every word. Download it below the preview.';download.hidden=false;
  }catch(e){$('#status').textContent=e.message;}
  finally{busy=false;button.disabled=false;button.textContent='Generate my sticker';['upload','example','ideaTab','uploadTab'].forEach(id=>$('#'+id).disabled=false);}
 };
})();
