import { createHash, createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { conversationInput, conversationReply } from '../server/conversationInput';

interface Request { method?: string; body: unknown; headers: Record<string, string | string[] | undefined> }
interface Response { setHeader(name: string, value: string): void; status(code: number): { json(value: unknown): void } }
export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST.' }); }
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.BWB_CONVERSATIONS_ENABLED !== 'true' || !url || !key)
    return res.status(503).json({ error: 'Conversations are not available yet. Please use our contact or quote options.' });
  try {
    if (Buffer.byteLength(JSON.stringify(req.body ?? {})) > 16000) return res.status(413).json({ error: 'Message is too large.' });
    const parsed = conversationInput.safeParse(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Please check your message and contact details.' });
    const origin = req.headers.origin;
    if (typeof origin !== 'string') return res.status(403).json({ error: 'Open the conversation on the website.' });
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    // Site identity comes from the configured origin, never a visitor-supplied brand or partner ID.
    const { data: sites, error: siteError } = await db.from('bwb_conversation_sites')
      .select('id').contains('origins', [origin]).eq('enabled', true);
    if (siteError) return res.status(503).json({ error: 'Conversations are temporarily unavailable.' });
    if (sites?.length !== 1) return res.status(403).json({ error: 'This website is not enabled for conversations.' });
    // Vercel supplies this header; local development must explicitly provide a test value.
    const ip = req.headers['x-vercel-forwarded-for'];
    if (typeof ip !== 'string' || !ip) return res.status(503).json({ error: 'Conversation security is unavailable.' });
    const { token, ...payload } = parsed.data;
    const { data, error } = await db.rpc('ingest_bwb_conversation', {
      p_site: sites[0].id,
      p_token_hash: createHash('sha256').update(token).digest('hex'),
      p_rate_key: createHmac('sha256', key).update(`${sites[0].id}:${ip.split(',')[0].trim()}`).digest('hex'),
      p_payload: payload,
      p_reply: conversationReply(payload.message, Boolean(payload.contact)),
    });
    if (error) {
      const status = error.code === '42501' ? 403 : error.code === 'P0002' ? 429 : 503;
      return res.status(status).json({ error: status === 429 ? 'Please try again later.' : 'We could not save that message. Please retry.' });
    }
    return res.status(200).json(data);
  } catch {
    return res.status(503).json({ error: 'We could not save that message. Please retry.' });
  }
}
