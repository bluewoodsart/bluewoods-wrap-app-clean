import { getOrCreateStickerOrder, ensureStickerArtwork, bindStickerSession } from './sticker-recovery.mjs';
import {generateSticker,generatorReady} from './sticker-generator.js';
import { createClient } from '@supabase/supabase-js';
import { createHash, createHmac } from 'node:crypto';
import { totalFor, verifySignature, validPaidSession, validateArtwork } from './sticker-core.js';

export const config = { api: { bodyParser: false } };
const origin = 'https://www.slapwrapz.com';
const hash = (v: string | Buffer) => createHash('sha256').update(v).digest('hex');
const mode = () => process.env.STICKER_STRIPE_MODE === 'live' ? 'live' : 'test';
function ready() {
 return process.env.STICKER_CHECKOUT_ENABLED === 'true' && !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
 !!process.env.STRIPE_WEBHOOK_SECRET && !!process.env.VITE_SUPABASE_URL &&
 !!process.env.STRIPE_SECRET_KEY?.startsWith(mode() === 'live' ? 'sk_live_' : 'sk_test_');
}
async function stripe(path: string, form?: URLSearchParams, idempotencyKey?: string) {
 const response = await fetch('https://api.stripe.com/v1/' + path, {method:form ? 'POST':'GET', headers:{
  Authorization:'Bearer ' + process.env.STRIPE_SECRET_KEY, 'Stripe-Version':'2024-06-20',
  ...(form ? {'Content-Type':'application/x-www-form-urlencoded'}:{}), ...(idempotencyKey ? {'Idempotency-Key':idempotencyKey}:{}),
 }, body:form?.toString(), signal:AbortSignal.timeout(20000)});
 const body = await response.json(); if (!response.ok) throw Error('Stripe request failed.'); return body;
}
async function rawBody(req: any) {
 const chunks: Buffer[]=[]; let size=0;
 for await (const chunk of req) {const b=Buffer.from(chunk); size+=b.length;if(size>3000000)throw Error('Request too large.');chunks.push(b);}
 return Buffer.concat(chunks);
}
export default async function handler(req: any,res: any) {
 res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method==='GET')return res.status(200).json({enabled:ready(),mode:mode(),generatorEnabled:generatorReady()});
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
 try {
  const raw=await rawBody(req); const signature=req.headers['stripe-signature'];
  if(!signature){const input=JSON.parse(raw.toString());if(input.action==='generate')return generateSticker(input,req,res);}
  const dbKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!dbKey || !process.env.VITE_SUPABASE_URL)return res.status(503).json({error:'Checkout setup is still in progress.'});
  const db=createClient(process.env.VITE_SUPABASE_URL,dbKey,{auth:{persistSession:false,autoRefreshToken:false}});
  async function find(id:string){const {data,error}=await db.from('bwb_sticker_orders').select('*').eq('id',id).maybeSingle();if(error)throw error;return data;}
  async function confirm(session:any,order:any){
   if(!validPaidSession(session,order))return false;
   const shipping=session.shipping_details || session.collected_information?.shipping_details;
   const {error}=await db.from('bwb_sticker_orders').update({status:'paid',paid_at:order.paid_at || new Date().toISOString(),
    customer_email:session.customer_details?.email || null,customer_name:shipping?.name || session.customer_details?.name || null,
    shipping_address:shipping?.address || null}).eq('id',order.id).eq('stripe_session_id',session.id);
   if(error)throw error; return true;
  }
  if(signature){
   if(!process.env.STRIPE_WEBHOOK_SECRET || !verifySignature(raw,String(signature),process.env.STRIPE_WEBHOOK_SECRET))return res.status(400).json({error:'Invalid signature.'});
   const event=JSON.parse(raw.toString());
   if(['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.expired'].includes(event.type)){
    const session=event.data.object; const id=session.metadata?.sticker_order_id;
    if(id){const order=await find(id);if(!order)return res.status(503).json({error:'Order not available. Retry delivery.'});
     if(event.type==='checkout.session.expired'){
      if(session.id===order.stripe_session_id && order.status==='pending'){const {error}=await db.from('bwb_sticker_orders').update({status:'expired'}).eq('id',id).eq('status','pending');if(error)throw error;}
     }else if(session.payment_status==='paid' && !await confirm(session,order))return res.status(400).json({error:'Order payment mismatch.'});
    }
   }
   return res.status(200).json({received:true});
  }
  if(req.headers.origin!==origin)return res.status(403).json({error:'Please use the sticker store.'});
  const body=JSON.parse(raw.toString());
  if(!/^[0-9a-f-]{36}$/i.test(body.id||'') || !/^[a-f0-9]{64}$/.test(body.token||''))return res.status(400).json({error:'Invalid order reference.'});
  let order=await find(body.id); const tokenHash=hash(body.token);
  if(order && order.token_hash!==tokenHash)return res.status(404).json({error:'Order not found.'});
  if(body.action==='status'){
   if(!order)return res.status(404).json({error:'Order not found.'});
   if(order.status!=='paid' && order.stripe_session_id){const session=await stripe('checkout/sessions/'+order.stripe_session_id);await confirm(session,order);order=await find(body.id);}
   return res.status(200).json({id:order.id,status:order.status,mode:order.stripe_mode});
  }
  if(body.action!=='checkout')return res.status(400).json({error:'Invalid action.'});
  if(!ready())return res.status(503).json({error:'Checkout setup is still in progress. Please try again later.'});
  if(order && order.stripe_mode!==mode())return res.status(409).json({error:'Checkout settings changed. Please click payment again to start a new order.',restart:true});
  if(order?.stripe_session_id){
   const session=await stripe('checkout/sessions/'+order.stripe_session_id);
   if(session.status==='open')return res.status(200).json({id:order.id,url:session.url});
   return res.status(409).json({error:order.status==='paid'?'This order is already paid.':'This checkout has ended. Click payment again to start a new order.',restart:order.status!=='paid'});
  }
  if(!order){
   if(body.approved!==true || !totalFor(body.delivery))return res.status(400).json({error:'Approve your artwork and choose delivery.'});
   const image=validateArtwork(body.artwork);
   // Vercel supplies x-real-ip; never trust a user-supplied forwarded-for chain.
   const ip=String(req.headers['x-real-ip'] || 'unknown');
   const rateKey=createHmac('sha256',dbKey).update(ip+':'+Math.floor(Date.now()/3600000)).digest('hex');
   const {data:allowed,error:rateError}=await db.rpc('bwb_sticker_rate_limit',{rate_key:rateKey});
   if(rateError)throw rateError;if(!allowed)return res.status(429).json({error:'Too many checkout attempts. Please try again in an hour.'});
   const artworkPath=body.id+'/approved.png';
   order=await getOrCreateStickerOrder(db,{id:body.id,token_hash:tokenHash,artwork_path:artworkPath,
    artwork_sha256:hash(image),delivery:body.delivery,amount_total:totalFor(body.delivery),stripe_mode:mode()});
  }
  if(Date.now()-new Date(order.created_at).getTime()>1800000)return res.status(409).json({error:'This draft has expired. Click payment again to start a new order.',restart:true});
  // An interrupted upload can be retried only with the exact originally approved bytes.
  const retryImage=validateArtwork(body.artwork);
  if(body.approved!==true || body.delivery!==order.delivery || hash(retryImage)!==order.artwork_sha256)
   return res.status(409).json({error:'Approved artwork or delivery changed. Please review your artwork and start a new order.',restart:true});
  await ensureStickerArtwork(db.storage.from('sticker-artwork'),order.artwork_path,retryImage,order.artwork_sha256,(bytes:Uint8Array)=>hash(Buffer.from(bytes)));
  // Immutable stored artwork and delivery are reused on retry; the browser cannot change price.
  const form=new URLSearchParams({mode:'payment',client_reference_id:order.id,
   'metadata[sticker_order_id]':order.id,'line_items[0][price_data][currency]':'usd',
   'line_items[0][price_data][unit_amount]':'1000','line_items[0][quantity]':'1',
   'line_items[0][price_data][product_data][name]':'Custom 4-inch Circle Stickers - 10-Pack',
   'line_items[0][price_data][product_data][description]':'Ten identical white low-tack vinyl stickers. No lamination. Customer-approved artwork; design services not included.',
   success_url:origin+'/stickers?payment=return',cancel_url:origin+'/stickers?payment=cancelled',
   billing_address_collection:'required',expires_at:String(Math.floor(new Date(order.created_at).getTime()/1000)+3600)});
  if(order.delivery==='mail'){
   form.set('shipping_address_collection[allowed_countries][0]','US');
   form.set('shipping_options[0][shipping_rate_data][type]','fixed_amount');
   form.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]','111');
   form.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]','usd');
   form.set('shipping_options[0][shipping_rate_data][display_name]','US letter mail — one 10-pack (untracked)');
  }
  const session=await stripe('checkout/sessions',form,'sticker-'+order.id);
  await bindStickerSession(db,order.id,session.id);
  return res.status(200).json({id:order.id,url:session.url});
 }catch(error){
  // Never return Stripe, database, address or key details to the browser/logs.
  return res.status(400).json({error:error instanceof Error && /^(Artwork must|Invalid artwork|Request too large)/.test(error.message)?error.message:'We could not complete that request. Please retry; your existing order will be reused.'});
 }
}

