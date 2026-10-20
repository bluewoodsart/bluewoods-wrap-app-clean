import StickerOrders from './StickerOrders';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function validStripePaymentLink(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'buy.stripe.com' &&
      !url.username && !url.password && !url.port && /^\/[A-Za-z0-9_]+$/.test(url.pathname) && !url.search && !url.hash;
  } catch { return false; }
}

export default function StickerStoreSettings() {
  const [pickupLink, setPickupLink] = useState('');
  const [mailLink, setMailLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [connection, setConnection] = useState('Checking checkout connection…');
  useEffect(() => { fetch('/api/sticker-store').then(r=>r.json()).then(data=>setConnection(data.enabled ? (data.mode==='live'?'Live checkout enabled':'Test checkout enabled — no production orders') : 'Checkout is off. Add the server credentials in Vercel and complete a test order before enabling sales.')).catch(()=>setConnection('Checkout connection unavailable.')); }, []);
  useEffect(() => {
    let current = true;
    supabase.from('bwb_sticker_store_settings').select('pickup_payment_link,mail_payment_link').eq('id', 'default').single()
      .then(({ data, error }) => {
        if (!current) return;
        setLoading(false);
        if (error) { setMessage('Sticker settings are not available yet. The database setup must be installed before settings can be saved.'); return; }
        setPickupLink(data.pickup_payment_link || ''); setMailLink(data.mail_payment_link || ''); setReady(true);
      });
    return () => { current = false; };
  }, []);
  async function save() {
    if (!validStripePaymentLink(pickupLink.trim()) || !validStripePaymentLink(mailLink.trim())) {
      setMessage('Use a Stripe Payment Link starting with https://buy.stripe.com/. Do not paste API keys or dashboard links.'); return;
    }
    setSaving(true); setMessage('');
    const { data, error } = await supabase.from('bwb_sticker_store_settings').update({
      pickup_payment_link: pickupLink.trim(), mail_payment_link: mailLink.trim(),
      updated_at: new Date().toISOString(),
    }).eq('id', 'default').select('id').single();
    setSaving(false);
    setMessage(error || !data ? 'Settings were not saved. Check owner access and database setup, then retry.' : 'Stripe links saved. Checkout remains off until artwork, order matching, and payment confirmation are connected and tested.');
  }
  return <Card><CardHeader><CardTitle>Sticker Store</CardTitle><p className="text-sm text-slate-600">You create. We print. Ten for $10.</p></CardHeader><CardContent className="space-y-6">
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4"><strong>Setup mode — customer checkout is off</strong><p className="mt-1 text-sm">The storefront uses server-created checkout sessions to match each payment with its approved artwork. Legacy payment links below are saved for reference only. Checkout remains off until server credentials and testing are complete.</p></div>
    <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Product</dt><dd>Ten matching 4-inch circle stickers</dd></div><div><dt className="text-slate-500">Price</dt><dd>$10 per ten-pack, plus postage and applicable tax</dd></div><div><dt className="text-slate-500">Material</dt><dd>White low-tack vinyl, no lamination</dd></div><div><dt className="text-slate-500">Postage estimate</dt><dd>$1.11 for one pack; verify packed weight and mail eligibility</dd></div></dl>
    <div className="space-y-2"><label htmlFor="stickerPickupLink" className="block font-medium">Stripe checkout link — local pickup</label><input id="stickerPickupLink" type="url" autoComplete="off" value={pickupLink} onChange={e => setPickupLink(e.target.value)} disabled={loading || !ready || saving} placeholder="https://buy.stripe.com/..." className="w-full rounded-md border p-3"/><p className="text-sm text-slate-500">Create a one-time $10 product in Stripe. No shipping fee for pickup.</p></div>
    <div className="space-y-2"><label htmlFor="stickerMailLink" className="block font-medium">Stripe checkout link — mailed orders</label><input id="stickerMailLink" type="url" autoComplete="off" value={mailLink} onChange={e => setMailLink(e.target.value)} disabled={loading || !ready || saving} placeholder="https://buy.stripe.com/..." className="w-full rounded-md border p-3"/><p className="text-sm text-slate-500">Use the $10 product, collect the shipping address, and configure postage separately in Stripe. The final Stripe total must match the cart.</p></div>
    <p className="text-sm text-slate-600">These are public checkout links, not secret API keys. Payment methods are managed in Stripe. Never enter a Stripe secret key in these fields.</p>
    <div className="flex flex-wrap gap-3"><Button type="button" onClick={save} disabled={loading || !ready || saving}>{saving ? 'Saving...' : 'Save Stripe links'}</Button><a className="rounded-md border px-4 py-2 text-sm" href="https://dashboard.stripe.com/payment-links" target="_blank" rel="noopener noreferrer">Open Stripe Payment Links</a></div>
    <p role="status" className="text-sm">{loading ? 'Loading settings...' : message}</p>
    <div className="rounded-lg bg-slate-50 p-4 text-sm"><strong>Before enabling checkout</strong><ul className="mt-2 list-disc space-y-1 pl-5"><li>Save approved artwork with a permanent order number.</li><li>Match the Stripe payment to that order.</li><li>Confirm payment from Stripe on the server.</li><li>Test a complete order through BWB production.</li></ul></div>
    <div className="rounded-md border p-4 text-sm"><strong>{connection}</strong><p className="mt-2">Server settings: SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STICKER_STRIPE_MODE, STICKER_CHECKOUT_ENABLED. Keep secrets out of these public link fields.</p><a className="underline" href="https://vercel.com/ashley-bussey-s-projects/bluewoods-wrap-app-clean/settings/environment-variables" target="_blank" rel="noopener noreferrer">Open secure Vercel environment settings</a></div><StickerOrders /></CardContent></Card>;
}
