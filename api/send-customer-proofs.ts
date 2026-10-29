import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
interface Request {method?:string;headers:Record<string,string|string[]|undefined>;body:unknown;}
interface Response {setHeader(name:string,value:string):void;status(code:number):{json(body:Record<string,unknown>):void};}
const escapeHtml=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]!));
const normalized=(value:unknown)=>typeof value==='string'?value.trim().toLowerCase():'';

export default async function handler(req:Request,res:Response) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
  const base=process.env.VITE_SUPABASE_URL;
  const anon=process.env.VITE_SUPABASE_ANON_KEY;
  const resend=process.env.RESEND_API_KEY;
  if(!base || !anon || !resend) return res.status(503).json({error:'Proof email is not configured. No email was sent.'});
  const auth=req.headers.authorization;
  if(typeof auth!=='string' || !auth.startsWith('Bearer ')) return res.status(401).json({error:'Please sign in again.'});
  let body:{quoteId?:string;expectedEmail?:string;requestId?:string};
  try {body=typeof req.body==='string'?JSON.parse(req.body):req.body as typeof body;} catch {return res.status(400).json({error:'Invalid request.'});}
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(!body || !uuid.test(body.quoteId || '') || !uuid.test(body.requestId || '') || typeof body.expectedEmail!=='string') return res.status(400).json({error:'A valid order and send request are required.'});
  const db=createClient(base,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  try {
    const {data:identity,error:authError}=await db.auth.getUser(auth.slice(7));
    if(authError || !identity.user) return res.status(401).json({error:'Please sign in again.'});
    const {data:quote,error:targetError}=await db.rpc('get_customer_proof_email_target_v1',{p_quote_id:body.quoteId});
    if(targetError || !quote) return res.status(409).json({error:targetError?.message || 'The proof is not ready to send.'});
    const email=quote.customer_email?.trim();
    if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(409).json({error:'Save a valid customer email before sending.'});
    if(normalized(email)!==normalized(body.expectedEmail)) return res.status(409).json({error:'The customer email changed. Refresh the order before sending.'});
    const token=quote.token;
    const link='https://www.slapwrapz.com/proof/'+encodeURIComponent(token);
    const name=quote.customer_name?.trim() || 'there';
    const subject='Your proofs are ready'+(quote.quote_id?' — '+quote.quote_id:'');
    const payload={from:'SlapWrapz <quotes@slapwrapz.com>',to:email,subject,
      html:'<p>Hi '+escapeHtml(name)+',</p><p>Your updated proofs are ready. Please review every view and check the spelling, phone numbers, and artwork.</p><p><a href="'+escapeHtml(link)+'">View your proofs</a></p><p>Use the proof page to approve the artwork or request changes.</p><p>Thank you,<br>Blue Woods Brands</p>',
      text:'Hi '+name+',\n\nYour updated proofs are ready: '+link+'\n\nPlease review every view and use the proof page to approve or request changes.\n\nThank you,\nBlue Woods Brands'};
    const key='proof-'+createHash('sha256').update(identity.user.id+'|'+body.requestId+'|'+quote.id+'|'+JSON.stringify(payload)).digest('hex');
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+resend,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
    if(!response.ok) return res.status(502).json({error:'The email service did not confirm sending. Retry with this button.'});
    const sent=await response.json() as {id?:string};
    if(!sent.id) return res.status(502).json({error:'Sending could not be confirmed. Retry with this button.'});
    const historyRpc=['owner_admin','staff'].includes(quote.user_role)?'add_quote_internal_note_admin':'add_quote_internal_note_rep_v1';
    const {error:historyError}=await db.rpc(historyRpc,{p_quote_request_id:quote.id,p_note_text:'Proof email sent to '+email+'. Email ID: '+sent.id});
    return res.status(200).json({ok:true,email,emailId:sent.id,historyWarning:Boolean(historyError)});
  } catch {
    return res.status(502).json({error:'Sending could not be confirmed. Retry with this button. Repeat attempts use the same request ID.'});
  }
}
