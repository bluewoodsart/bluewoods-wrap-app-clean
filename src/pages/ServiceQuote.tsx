import { useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { servicePages, serviceAssetUrl, type ServiceMedia } from '@/lib/servicePages';
import { getStoredRepSlug } from '@/lib/repTracking';
import { getRepAttributionForSlug } from '@/lib/salesReps';
const empty = () => ({ name: '', company: '', email: '', phone: '', preferredContact: 'email', notes: '' });
export default function ServiceQuote() {
 const slug = new URLSearchParams(window.location.search).get('service');
 const service = servicePages.find(item => item.slug === slug);
 if (!service) return <p>Choose a service from <a href="/#services" target="_top">SlapWrapz services</a>.</p>;
 return <ServiceIntake key={service.slug} service={service} />;
}
function ServiceIntake({service}: {service: typeof servicePages[number]}) {
 const key = 'bwb:service-quote:v1:' + service.slug;
 const [initial] = useState(() => {
  try {
   const stored = JSON.parse(localStorage.getItem(key) || 'null');
   const form = empty();
   if (stored?.form) for (const name of Object.keys(form) as Array<keyof typeof form>) {
    if (typeof stored.form[name] === 'string') form[name] = stored.form[name];
   }
   return {form, id: /^[0-9a-f-]{36}$/i.test(stored?.id || '') ? stored.id as string : crypto.randomUUID()};
  } catch { return {form: empty(), id: crypto.randomUUID()}; }
 });
 const [form,setForm] = useState(initial.form);
 const [warning,setWarning] = useState('');
 const [error,setError] = useState('');
 const [saved,setSaved] = useState('');
 const [saving,setSaving] = useState(false);
 const pending = useRef(false);
 const [media,setMedia] = useState<ServiceMedia | null>(null);
 const [videoFailed,setVideoFailed] = useState(false);
 const root = useRef<HTMLDivElement>(null);
 useEffect(() => {
  let active = true;
  supabase.from('bwb_service_media').select('service_slug,video_path,image_path,captions_path').eq('service_slug',service.slug).maybeSingle().then(({data}) => {if(active) setMedia(data);});
  return () => {active=false;};
 },[service.slug]);
 useEffect(() => {
  if (!root.current) return;
  const report = () => window.parent.postMessage({type:'bwb-service-height',height:Math.ceil(root.current?.getBoundingClientRect().height || 900)},window.location.origin);
  const observer = new ResizeObserver(report); observer.observe(root.current); report();
  return () => observer.disconnect();
 },[]);
 const update = (name: keyof ReturnType<typeof empty>, value: string) => {
  const next = {...form,[name]:value}; setForm(next);
  try {localStorage.setItem(key,JSON.stringify({form:next,id:initial.id})); setWarning('');}
  catch {setWarning('Draft storage is unavailable. Keep this page open until you submit.');}
 };
 const submit = async (event: FormEvent) => {
  event.preventDefault();
  if(pending.current) return;
  if(!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) || form.phone.replace(/\D/g,'').length<7 || form.notes.trim().length<5) {
   setError('Please add your name, valid email, phone number, and project details.');return;
  }
  pending.current=true;setSaving(true);setError('');
  try {
   const rep = getRepAttributionForSlug(getStoredRepSlug());
   const {data,error:saveError} = await supabase.rpc('submit_service_quote',{
    p_submission_id:initial.id,p_service_slug:service.slug,
    p_contact:{...form,name:form.name.trim(),email:form.email.trim(),phone:form.phone.trim()},
    p_details:{notes:form.notes.trim()},
    p_rep_slug:rep.rep_slug || null,p_rep_email:rep.rep_email || null,p_assigned_rep_name:rep.assigned_rep_name || null
   });
   if(saveError || !data) throw saveError || new Error('Save could not be confirmed.');
   setSaved(data);
   try {localStorage.removeItem(key);} catch {}
  } catch {setError('We could not confirm your request. Your details are still here. Please retry, or call 770-669-0861. Retrying will not create a second request.');}
  finally {pending.current=false;setSaving(false);}
 };
 const image = serviceAssetUrl(media?.image_path) || '/services/images/'+service.slug+'.png';
 const inputClass='mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 focus:outline-cyan-600';
 return <div ref={root} className="bg-slate-950 p-1 text-white">
  <div className="grid items-start gap-6 lg:grid-cols-2">
   <div>
    {media?.video_path && !videoFailed ? <video className="aspect-[3/2] w-full rounded-xl bg-black object-contain" controls playsInline preload="metadata" poster={image} crossOrigin="anonymous" onError={()=>setVideoFailed(true)}>
     <source src={serviceAssetUrl(media.video_path)} />
     {media.captions_path && <track kind="captions" src={serviceAssetUrl(media.captions_path)} srcLang="en" label="English" default />}
    </video> : <img src={image} alt={service.alt} width={1536} height={1024} className="aspect-[3/2] w-full rounded-xl object-cover" fetchPriority="high" />}
    <p className="mt-2 text-xs text-slate-400">{media?.video_path && !videoFailed ? service.name+' — SlapWrapz' : media?.image_path ? service.name : 'Illustrative example with fictional business branding.'}</p>
    <div className="mt-5 rounded-xl border border-slate-700 p-5">
     <p className="text-lg font-bold">Start with your idea. We’ll help with the details.</p>
     <p className="mt-2 text-sm leading-6 text-slate-300">Tell us about your project, artwork, and timing. Our team will review the request and follow up to confirm scope and pricing.</p>
     <a className="mt-3 inline-block py-2 font-bold text-cyan-200" href="tel:+17706690861">Call 770-669-0861</a>
    </div>
   </div>
   <section className="rounded-xl bg-white p-5 text-slate-950 sm:p-6" aria-labelledby="quote-heading">
    <p className="text-xs font-bold uppercase tracking-widest text-cyan-700">{service.name}</p>
    <h2 id="quote-heading" className="mt-2 text-2xl font-bold">Request your quote</h2>
    {saved ? <div role="status" className="mt-6 rounded-lg bg-emerald-50 p-5 text-emerald-950"><h3 className="font-bold">Your request is saved.</h3><p className="mt-2">Our team will review your project and contact you. No payment has been taken.</p><p className="mt-3 break-all text-xs">Reference: {saved}</p></div> :
    <form onSubmit={submit} className="mt-4 space-y-3">
     <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-2">
      <legend className="sr-only">Contact and project information</legend>
      {([['name','Name','text','name',true],['company','Company (optional)','text','organization',false],['email','Email','email','email',true],['phone','Phone','tel','tel',true]] as const).map(([name,label,type,autoComplete,required])=><label key={name} className="text-sm font-semibold">{label}{required?' *':''}<input className={inputClass} type={type} autoComplete={autoComplete} required={required} maxLength={name==='email'?320:name==='phone'?50:200} value={form[name]} onChange={e=>update(name,e.target.value)} /></label>)}
      <label className="text-sm font-semibold sm:col-span-2">Preferred contact<select className={inputClass} value={form.preferredContact} onChange={e=>update('preferredContact',e.target.value)}><option value="email">Email</option><option value="call">Call</option><option value="text">Text</option></select></label>
      <label className="text-sm font-semibold sm:col-span-2">Project details *<textarea className={inputClass} rows={3} required minLength={5} maxLength={10000} placeholder={service.hint} value={form.notes} onChange={e=>update('notes',e.target.value)} /></label>
     </fieldset>
     <p className="text-xs text-slate-600" role="status">{warning || 'Draft kept on this device until submitted. Contact details are used to respond to this request.'}</p>
     {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
     <button disabled={saving} className="min-h-12 w-full rounded-lg bg-cyan-400 px-4 py-3 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-60">{saving?'Saving your request…':'Send quote request'}</button>
    </form>}
   </section>
  </div>
 </div>;
}
