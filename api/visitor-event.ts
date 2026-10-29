// Vercel serverless endpoint. Requires SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL.
// Never return database credentials to the browser.
import type { VercelRequest, VercelResponse } from '@vercel/node';

const allowedHosts = new Set(['slapwrapz.com', 'www.slapwrapz.com']);
const eventTypes = new Set(['page_view', 'quote_start', 'quote_complete']);
const clean = (x: unknown, max = 120) => typeof x === 'string' ? x.slice(0,max).replace(/[<>\x00-\x1f]/g,'') : null;
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'POST') return res.status(405).json({error:'method_not_allowed'});
  const origin = req.headers.origin;
  let host: string;
  try { host = new URL(origin || '').hostname.toLowerCase(); } catch { return res.status(403).end(); }
  if (!allowedHosts.has(host)) return res.status(403).end();
  const b = typeof req.body === 'string' ? (()=>{try{return JSON.parse(req.body)}catch{return {}}})() : (req.body || {});
  if (b.consent !== true || !eventTypes.has(b.event_type) || typeof b.session_id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(b.session_id)) return res.status(400).end();
  const path = clean(b.path,240);
  if (!path || !path.startsWith('/') || path.startsWith('//')) return res.status(400).end();
  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !secret) return res.status(503).json({error:'collector_not_configured'});
  const payload = {
    session_id:b.session_id, event_type:b.event_type, path,
    referrer_host:clean(b.referrer_host), utm_source:clean(b.utm_source),
    utm_medium:clean(b.utm_medium), utm_campaign:clean(b.utm_campaign),
    site_host:host
  };
  try {
    const response = await fetch(new URL('/rest/v1/bwb_visitor_events',base), {
      method:'POST',headers:{'apikey':secret,'Authorization':'Bearer '+secret,'Content-Type':'application/json','Prefer':'return=minimal'},
      body:JSON.stringify(payload)
    });
    if (!response.ok) return res.status(502).json({error:'collector_storage_failed'});
    return res.status(204).end();
  } catch { return res.status(502).json({error:'collector_unavailable'}); }
}
