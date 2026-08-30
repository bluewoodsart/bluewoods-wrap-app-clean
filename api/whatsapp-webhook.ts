import crypto from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { createClient } from '@supabase/supabase-js';

interface ApiRequest extends IncomingMessage { query: Record<string, string | string[] | undefined> }
interface ApiResponse { status: (code: number) => ApiResponse; json: (body: unknown) => void; send: (body: string) => void }

export const config = { api: { bodyParser: false } };

const readRawBody = async (req: ApiRequest) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
};

const buildQualificationDraft = (name: string, body: string) => {
  const text = body.toLowerCase();
  const missing: string[] = [];
  if (!/(trailer|truck|van|car|vehicle|suv)/.test(text)) missing.push('what vehicle or trailer you need wrapped');
  if (!/(\d+\s*(ft|feet|foot|in|inch|x|by))/.test(text)) missing.push('its approximate dimensions');
  if (!/(photo|picture|image|attached)/.test(text)) missing.push('clear photos from each side');
  if (!/(atlanta|georgia|ga\b|located|location|city)/.test(text)) missing.push('your city or location');
  if (!/(date|week|month|deadline|need it by|asap)/.test(text)) missing.push('when you need it completed');
  const ask = missing.slice(0, 3).join(', ');
  return `Hi ${name || 'there'}, thanks for contacting SlapWrapz. We can help with that. To price it correctly, please send ${ask || 'any additional project details and the best time to reach you'}. Ashley will review everything before your quote is sent.`;
};

const handler = async (req: ApiRequest, res: ApiResponse) => {
  if (req.method === 'GET') {
    const mode = String(req.query['hub.mode'] || '');
    const token = String(req.query['hub.verify_token'] || '');
    const challenge = String(req.query['hub.challenge'] || '');
    if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(challenge);
    return res.status(403).json({ error: 'Webhook verification failed' });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const raw = await readRawBody(req);
  const signature = String(req.headers['x-hub-signature-256'] || '');
  const appSecret = process.env.WHATSAPP_APP_SECRET || '';
  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(raw).digest('hex')}`;
  if (!appSecret || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(503).json({ error: 'Server database configuration missing' });
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const payload = JSON.parse(raw.toString('utf8'));
  const changes = payload?.entry?.flatMap((entry: any) => entry.changes || []) || [];

  for (const change of changes) {
    const value = change?.value;
    const profileByWaId = new Map((value?.contacts || []).map((contact: any) => [contact.wa_id, contact.profile?.name || null]));
    for (const message of value?.messages || []) {
      const waId = String(message.from || '');
      if (!waId) continue;
      const body = String(message.text?.body || message.image?.caption || message.document?.caption || 'Customer sent an attachment.');
      const profileName = String(profileByWaId.get(waId) || '');
      const { data: contact, error: contactError } = await supabase.from('whatsapp_contacts').upsert({
        wa_id: waId, phone: waId, profile_name: profileName || null, lead_status: 'qualifying', last_message_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }, { onConflict: 'wa_id' }).select().single();
      if (contactError) throw contactError;
      if (!contact.crm_quote_request_id) {
        const { data: crmLead, error: crmLeadError } = await supabase.from('quote_requests').insert({
          customer_name: profileName || `WhatsApp lead ${waId.slice(-4)}`,
          customer_email: '',
          customer_phone: waId,
          preferred_contact: 'WhatsApp',
          product_type: 'wrap',
          source: 'whatsapp-business',
          status: 'new',
          quote_data: {
            intakeChannel: 'WhatsApp Business',
            whatsappWaId: waId,
            initialMessage: body,
            qualificationStatus: 'qualifying',
            note: 'Email has not been collected yet. Do not send email until verified.'
          }
        }).select('id').single();
        if (crmLeadError) throw crmLeadError;
        await supabase.from('whatsapp_contacts').update({ crm_quote_request_id: crmLead.id }).eq('id', contact.id);
      }
      const { data: conversation, error: conversationError } = await supabase.from('whatsapp_conversations').upsert({
        contact_id: contact.id, status: 'waiting_owner', updated_at: new Date().toISOString()
      }, { onConflict: 'contact_id' }).select().single();
      if (conversationError) throw conversationError;
      await supabase.from('whatsapp_messages').upsert({
        conversation_id: conversation.id, meta_message_id: message.id, direction: 'inbound', message_type: message.type || 'text', body,
        media_id: message.image?.id || message.document?.id || null, status: 'received', raw_payload: message
      }, { onConflict: 'meta_message_id', ignoreDuplicates: true });
      const { count } = await supabase.from('whatsapp_outbound_approvals').select('id', { count: 'exact', head: true }).eq('conversation_id', conversation.id).eq('status', 'pending');
      if (!count) await supabase.from('whatsapp_outbound_approvals').insert({
        conversation_id: conversation.id, draft_body: buildQualificationDraft(profileName, body), draft_kind: 'qualification', status: 'pending'
      });
    }
  }
  return res.status(200).json({ received: true });
};

export default handler;
