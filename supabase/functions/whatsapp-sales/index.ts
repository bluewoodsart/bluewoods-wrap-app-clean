import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.112.4';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
const hmacHex = async (secret: string, body: Uint8Array) => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, body))].map((value) => value.toString(16).padStart(2, '0')).join('');
};
const safeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
};
const qualificationDraft = (name: string, body: string) => {
  const text = body.toLowerCase();
  const missing: string[] = [];
  if (!/(trailer|truck|van|car|vehicle|suv)/.test(text)) missing.push('what vehicle or trailer you need wrapped');
  if (!/(\d+\s*(ft|feet|foot|in|inch|x|by))/.test(text)) missing.push('its approximate dimensions');
  if (!/(photo|picture|image|attached)/.test(text)) missing.push('clear photos from each side');
  if (!/(atlanta|georgia|ga\b|located|location|city)/.test(text)) missing.push('your city or location');
  if (!/(date|week|month|deadline|need it by|asap)/.test(text)) missing.push('when you need it completed');
  return `Hi ${name || 'there'}, thanks for contacting SlapWrapz. We can help with that. To price it correctly, please send ${missing.slice(0, 3).join(', ') || 'any additional project details and the best time to reach you'}. Ashley will review everything before your quote is sent.`;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } });
  const requestUrl = new URL(req.url);
  const action = requestUrl.searchParams.get('action') || 'webhook';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  if (req.method === 'GET') {
    const token = requestUrl.searchParams.get('hub.verify_token') || '';
    if (requestUrl.searchParams.get('hub.mode') === 'subscribe' && token === Deno.env.get('WHATSAPP_VERIFY_TOKEN')) return new Response(requestUrl.searchParams.get('hub.challenge') || '');
    return json({ error: 'Webhook verification failed' }, 403);
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (action === 'send') {
    const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const auth = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData } = await auth.auth.getUser(bearer);
    if (!userData.user) return json({ error: 'Sign in required' }, 401);
    const { data: admin } = await service.from('admin_users').select('id,role,is_active').eq('auth_user_id', userData.user.id).single();
    if (!admin?.is_active || !['owner_admin', 'staff'].includes(admin.role)) return json({ error: 'Owner or staff approval required' }, 403);
    const { approvalId, body } = await req.json();
    const editedBody = String(body || '').trim();
    const { data: approval } = await service.from('whatsapp_outbound_approvals').select('*, whatsapp_conversations!inner(id,contact_id,whatsapp_contacts!inner(wa_id))').eq('id', approvalId).eq('status', 'pending').single();
    if (!approval || !editedBody) return json({ error: 'Pending approval and message body required' }, 400);
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    if (!accessToken || !phoneNumberId) return json({ error: 'WhatsApp Business credentials are not connected yet. Draft remains pending.' }, 409);
    const metaResponse = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to: approval.whatsapp_conversations.whatsapp_contacts.wa_id, type: 'text', text: { body: editedBody } }) });
    const result = await metaResponse.json();
    if (!metaResponse.ok) return json({ error: result?.error?.message || 'WhatsApp send failed' }, 502);
    const { data: sent } = await service.from('whatsapp_messages').insert({ conversation_id: approval.conversation_id, meta_message_id: result.messages?.[0]?.id, direction: 'outbound', message_type: 'text', body: editedBody, status: 'sent', raw_payload: result }).select().single();
    await service.from('whatsapp_outbound_approvals').update({ status: 'sent', draft_body: editedBody, reviewed_by: admin.id, reviewed_at: new Date().toISOString(), sent_message_id: sent?.id, updated_at: new Date().toISOString() }).eq('id', approvalId);
    await service.from('whatsapp_conversations').update({ status: 'waiting_customer', updated_at: new Date().toISOString() }).eq('id', approval.conversation_id);
    return json({ sent: true });
  }

  const raw = new Uint8Array(await req.arrayBuffer());
  const appSecret = Deno.env.get('WHATSAPP_APP_SECRET') || '';
  const signature = req.headers.get('x-hub-signature-256') || '';
  const expected = `sha256=${await hmacHex(appSecret, raw)}`;
  if (!appSecret || !safeEqual(signature, expected)) return json({ error: 'Invalid webhook signature' }, 401);
  const payload = JSON.parse(new TextDecoder().decode(raw));
  for (const change of payload?.entry?.flatMap((entry: any) => entry.changes || []) || []) {
    const value = change?.value;
    const profiles = new Map((value?.contacts || []).map((contact: any) => [contact.wa_id, contact.profile?.name || null]));
    for (const incoming of value?.messages || []) {
      const waId = String(incoming.from || '');
      if (!waId) continue;
      const body = String(incoming.text?.body || incoming.image?.caption || incoming.document?.caption || 'Customer sent an attachment.');
      const profileName = String(profiles.get(waId) || '');
      const { data: contact, error: contactError } = await service.from('whatsapp_contacts').upsert({ wa_id: waId, phone: waId, profile_name: profileName || null, lead_status: 'qualifying', last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'wa_id' }).select().single();
      if (contactError) throw contactError;
      if (!contact.crm_quote_request_id) {
        const { data: crmLead, error: leadError } = await service.from('quote_requests').insert({ customer_name: profileName || `WhatsApp lead ${waId.slice(-4)}`, customer_email: '', customer_phone: waId, preferred_contact: 'WhatsApp', product_type: 'wrap', source: 'whatsapp-business', status: 'new', quote_data: { intakeChannel: 'WhatsApp Business', whatsappWaId: waId, initialMessage: body, qualificationStatus: 'qualifying', note: 'Email has not been collected yet. Do not send email until verified.' } }).select('id').single();
        if (leadError) throw leadError;
        await service.from('whatsapp_contacts').update({ crm_quote_request_id: crmLead.id }).eq('id', contact.id);
      }
      const { data: conversation, error: conversationError } = await service.from('whatsapp_conversations').upsert({ contact_id: contact.id, status: 'waiting_owner', updated_at: new Date().toISOString() }, { onConflict: 'contact_id' }).select().single();
      if (conversationError) throw conversationError;
      const metaMediaId = incoming.image?.id || incoming.document?.id || null;
      let storedMediaPath: string | null = null;
      let mediaMimeType: string | null = null;
      const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
      if (metaMediaId && accessToken) {
        const metadataResponse = await fetch(`https://graph.facebook.com/v23.0/${metaMediaId}`, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          const mediaResponse = await fetch(metadata.url, { headers: { Authorization: `Bearer ${accessToken}` } });
          if (mediaResponse.ok) {
            mediaMimeType = mediaResponse.headers.get('content-type') || metadata.mime_type || 'application/octet-stream';
            const extension = mediaMimeType === 'image/png' ? 'png' : mediaMimeType === 'image/webp' ? 'webp' : mediaMimeType === 'application/pdf' ? 'pdf' : 'jpg';
            storedMediaPath = `${contact.id}/${incoming.id}.${extension}`;
            const { error: uploadError } = await service.storage.from('whatsapp-media').upload(storedMediaPath, await mediaResponse.arrayBuffer(), { contentType: mediaMimeType, upsert: false });
            if (uploadError) storedMediaPath = null;
          }
        }
      }
      await service.from('whatsapp_messages').upsert({ conversation_id: conversation.id, meta_message_id: incoming.id, direction: 'inbound', message_type: incoming.type || 'text', body, media_id: storedMediaPath || metaMediaId, media_mime_type: mediaMimeType, status: 'received', raw_payload: incoming }, { onConflict: 'meta_message_id', ignoreDuplicates: true });
      const { count } = await service.from('whatsapp_outbound_approvals').select('id', { count: 'exact', head: true }).eq('conversation_id', conversation.id).eq('status', 'pending');
      if (!count) await service.from('whatsapp_outbound_approvals').insert({ conversation_id: conversation.id, draft_body: qualificationDraft(profileName, body), draft_kind: 'qualification', status: 'pending' });
    }
  }
  return json({ received: true });
});
