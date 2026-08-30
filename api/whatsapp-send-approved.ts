import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!url || !anonKey || !serviceKey) return res.status(503).json({ error: 'Server database configuration missing' });
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const authClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${bearer}` } }, auth: { persistSession: false } });
  const { data: userData } = await authClient.auth.getUser(bearer);
  if (!userData.user) return res.status(401).json({ error: 'Sign in required' });
  const service = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: admin } = await service.from('admin_users').select('id,role,is_active').eq('auth_user_id', userData.user.id).single();
  if (!admin?.is_active || !['owner_admin','staff'].includes(admin.role)) return res.status(403).json({ error: 'Owner or staff approval required' });
  const approvalId = String(req.body?.approvalId || '');
  const editedBody = String(req.body?.body || '').trim();
  const { data: approval } = await service.from('whatsapp_outbound_approvals').select('*, whatsapp_conversations!inner(id, contact_id, whatsapp_contacts!inner(wa_id))').eq('id', approvalId).eq('status', 'pending').single();
  if (!approval || !editedBody) return res.status(400).json({ error: 'Pending approval and message body required' });
  if (!accessToken || !phoneNumberId) return res.status(409).json({ error: 'WhatsApp Business credentials are not connected yet. Draft remains pending.' });
  const waId = approval.whatsapp_conversations.whatsapp_contacts.wa_id;
  const response = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: waId, type: 'text', text: { body: editedBody } })
  });
  const result = await response.json();
  if (!response.ok) return res.status(502).json({ error: result?.error?.message || 'WhatsApp send failed' });
  const { data: sentMessage } = await service.from('whatsapp_messages').insert({ conversation_id: approval.conversation_id, meta_message_id: result.messages?.[0]?.id, direction: 'outbound', message_type: 'text', body: editedBody, status: 'sent', raw_payload: result }).select().single();
  await service.from('whatsapp_outbound_approvals').update({ status: 'sent', draft_body: editedBody, reviewed_by: admin.id, reviewed_at: new Date().toISOString(), sent_message_id: sentMessage?.id, updated_at: new Date().toISOString() }).eq('id', approvalId);
  await service.from('whatsapp_conversations').update({ status: 'waiting_customer', updated_at: new Date().toISOString() }).eq('id', approval.conversation_id);
  return res.status(200).json({ sent: true, messageId: result.messages?.[0]?.id });
};

export default handler;
