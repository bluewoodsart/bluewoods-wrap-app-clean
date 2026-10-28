(() => {
 const frame=document.getElementById('service-intake');
 if(!frame)return;
 const params=new URLSearchParams(window.location.search);
 const url=new URL(frame.src);
 for(const key of ['rep','rep_slug']) if(params.has(key)) url.searchParams.set(key,params.get(key));
 frame.src=url.href;
 window.addEventListener('message',event=>{
  if(event.origin!==window.location.origin || event.source!==frame.contentWindow || event.data?.type!=='bwb-service-height')return;
  const height=Number(event.data.height);
  if(Number.isFinite(height)&&height>0&&height<10000)frame.style.height=(Math.ceil(height)+8)+'px';
 });
})();