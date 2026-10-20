import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

type Order={id:string;status:string;stripe_mode:string;created_at:string;amount_total:number;delivery:string;artwork_path:string;customer_email:string|null;customer_name:string|null;shipping_address:Record<string,string>|null};
export default function StickerOrders(){
 const [orders,setOrders]=useState<Order[]>([]),[message,setMessage]=useState(''),[loading,setLoading]=useState(false);
 async function load(){setLoading(true);const {data,error}=await supabase.from('bwb_sticker_orders').select('id,status,stripe_mode,created_at,amount_total,delivery,artwork_path,customer_email,customer_name,shipping_address').order('created_at',{ascending:false}).limit(100);setLoading(false);if(error)setMessage('Orders could not be loaded. Check owner access and database setup.');else{setOrders(data||[]);setMessage('');}}
 useEffect(()=>{load();},[]);
 async function download(order:Order){
  const {data,error}=await supabase.storage.from('sticker-artwork').createSignedUrl(order.artwork_path,60,{download:order.id+'-approved.png'});
  if(error||!data){setMessage('Artwork could not be downloaded.');return;}
  const link=document.createElement('a');link.href=data.signedUrl;link.rel='noopener';link.target='_blank';link.click();
 }
 return <section className="space-y-4"><div className="flex items-center justify-between"><h3 className="text-xl font-semibold">Sticker orders</h3><Button disabled={loading} onClick={load}>{loading?'Loading…':'Refresh orders'}</Button></div><p className="text-sm text-slate-600">Latest 100 orders. Print only LIVE orders marked PAID. Artwork is the customer-approved 1200 × 1200 PNG with the circular crop baked in. Set the circle to 4 inches in Flexi and add your cut path.</p><p role="status">{message}</p>{!loading&&!orders.length&&<p>No sticker orders yet.</p>}
 {orders.map(order=><article key={order.id} className="rounded-md border p-4 space-y-2"><div className="flex flex-wrap justify-between gap-2"><strong>{order.stripe_mode.toUpperCase()} · {order.status.toUpperCase()}</strong><span>${(order.amount_total/100).toFixed(2)} · {order.delivery}</span></div><p className="break-all text-sm">Order {order.id}</p><p className="text-sm">{new Date(order.created_at).toLocaleString()} · 10 × 4-inch circles</p>{order.customer_name&&<p>{order.customer_name}</p>}{order.customer_email&&<p>{order.customer_email}</p>}{order.shipping_address&&<p className="whitespace-pre-line">{['line1','line2','city','state','postal_code','country'].map(k=>order.shipping_address?.[k]).filter(Boolean).join('\n')}</p>}<Button variant="outline" onClick={()=>download(order)}>Download approved artwork</Button>{order.status!=='paid'&&<p className="text-sm text-amber-700">Do not print: payment has not been confirmed.</p>}</article>)}
 </section>;
}
