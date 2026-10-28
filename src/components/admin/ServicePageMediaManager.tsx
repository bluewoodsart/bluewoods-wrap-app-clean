import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { servicePages, serviceAssetUrl, type ServiceMedia } from '@/lib/servicePages';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export default function ServicePageMediaManager() {
 const [rows,setRows]=useState<ServiceMedia[]>([]);
 const [busy,setBusy]=useState('');
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const lock=useRef(false);
 const load=async()=> {
  const {data,error}=await supabase.from('bwb_service_media').select('service_slug,video_path,image_path,captions_path');
  if(error) {setError('Could not load service media. Please reload.');return;}
  setRows(data || []);
 };
 useEffect(()=>{void load();},[]);
 const save=async(slug:string,patch:Partial<ServiceMedia>)=>{
  const {data,error}=await supabase.from('bwb_service_media').update({...patch,updated_at:new Date().toISOString()}).eq('service_slug',slug).select('service_slug,video_path,image_path,captions_path').single();
  if(error || !data) throw error || new Error('Update was not confirmed.');
  setRows(current=>current.map(row=>row.service_slug===slug?data:row));
 };
 const upload=async(slug:string,kind:'video'|'image'|'captions',file:File)=>{
  if(lock.current)return;
  const types={video:['video/mp4','video/webm'],image:['image/jpeg','image/png','image/webp'],captions:['text/vtt']};
  const mime=kind==='captions' && file.name.toLowerCase().endsWith('.vtt')?'text/vtt':file.type;
  const max=kind==='video'?50:kind==='image'?10:1;
  if(!types[kind].includes(mime) || file.size>max*1024*1024) {setError('Choose a supported '+kind+' file under '+max+' MB.');return;}
  lock.current=true;setBusy(slug);setError('');setMessage('');
  const extension:Record<string,string>={'video/mp4':'mp4','video/webm':'webm','image/jpeg':'jpg','image/png':'png','image/webp':'webp','text/vtt':'vtt'};
  const path=slug+'/'+crypto.randomUUID()+'.'+extension[mime];
  try {
   const {error:uploadError}=await supabase.storage.from('bwb-service-media').upload(path,file,{contentType:mime,upsert:false,cacheControl:'3600'});
   if(uploadError)throw uploadError;
   await save(slug,{[kind+'_path']:path,...(kind==='video'?{captions_path:null}:{})});
   setMessage('Published. Open the service page to review your '+kind+'.');
  } catch {setError('Upload or publishing failed. The previous published media is unchanged. Please retry.');}
  finally {lock.current=false;setBusy('');}
 };
 const remove=async(slug:string,kind:'video'|'image'|'captions')=>{
  if(lock.current)return;
  lock.current=true;setBusy(slug);setError('');setMessage('');
  try {await save(slug,{[kind+'_path']:null,...(kind==='video'?{captions_path:null}:{})});setMessage('Page updated.');}
  catch {setError('Could not update the page. Please retry.');}
  finally {lock.current=false;setBusy('');}
 };
 return <Card><CardHeader><CardTitle>Service page videos & photos</CardTitle><p className="text-sm text-slate-600">Upload a video for each page whenever you’re ready. Publishing takes effect immediately. Until then, visitors see the service image. Use MP4 (H.264) for broad device support or WebM, up to 50 MB. Caption files are optional English WebVTT (.vtt). Keep this screen open until publishing finishes.</p></CardHeader><CardContent>
  {message && <p role="status" className="mb-4 rounded bg-emerald-50 p-3 text-emerald-800">{message}</p>}
  {error && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-800">{error}</p>}
  <div className="grid gap-5 xl:grid-cols-2">{servicePages.map(service=>{
   const row=rows.find(item=>item.service_slug===service.slug);
   return <section key={service.slug} className="min-w-0 rounded-xl border p-4">
    <h3 className="font-bold">{service.name}</h3>
    <a href={'/services/'+service.slug} target="_blank" rel="noreferrer" className="my-2 inline-block text-sm text-blue-700 underline">Open service page ↗</a>
    {row?.video_path ? <video className="mb-3 aspect-video w-full rounded bg-black" controls playsInline preload="metadata" crossOrigin="anonymous" src={serviceAssetUrl(row.video_path)}>{row.captions_path && <track kind="captions" src={serviceAssetUrl(row.captions_path)} srcLang="en" label="English" default />}</video> : <img className="mb-3 aspect-video w-full rounded object-cover" src={serviceAssetUrl(row?.image_path)||'/services/images/'+service.slug+'.png'} alt={service.alt} loading="lazy" />}
    {!row && <p className="text-sm text-slate-600">Loading media controls…</p>}
    {(['video','image','captions'] as const).map(kind=><div key={kind} className="mt-3">
     <label className="block text-sm font-semibold">{kind==='video'?'Upload / replace video':kind==='image'?'Upload / replace photo':'Upload captions for current video'}
      <input className="mt-1 block w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:p-2" type="file" disabled={Boolean(busy)||!row||(kind==='captions'&&!row.video_path)} accept={kind==='video'?'video/mp4,video/webm':kind==='image'?'image/jpeg,image/png,image/webp':'.vtt'} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void upload(service.slug,kind,file);}} />
     </label>
     {row?.[(kind+'_path') as keyof ServiceMedia] && <Button className="mt-1" size="sm" variant="ghost" disabled={Boolean(busy)} onClick={()=>void remove(service.slug,kind)}>{kind==='image'?'Restore sample image':'Remove '+kind+' from page'}</Button>}
    </div>)}
    {busy===service.slug && <p role="status" className="mt-3 text-sm">Uploading / publishing…</p>}
   </section>;
  })}</div>
 </CardContent></Card>;
}
