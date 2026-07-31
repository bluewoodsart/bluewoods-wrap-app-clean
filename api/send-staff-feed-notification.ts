import { request } from 'node:https';

const RESEND_API_URL = new URL('https://api.resend.com/emails');
const FROM_EMAIL = process.env.SLAPWRAPZ_FROM_EMAIL?.trim() || 'SlapWrapz Staff <quotes@slapwrapz.com>';

interface ApiRequest {
  method?: string;
  body: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: Record<string, unknown>) => void };
}

interface NotificationRequest {
  postId?: string;
  eventType?: 'new_post' | 'comment' | 'reaction';
  commentId?: string | null;
}

interface NotificationRecipient { email: string; display_name: string; role: string }
interface NotificationEvent {
  event_type: 'new_post' | 'comment' | 'reaction';
  event_text: string;
  notification_key: string;
  actor_name: string;
  post_id: string;
  post_body: string;
  recipients: NotificationRecipient[];
}

const parseBody = (body: unknown): NotificationRequest => typeof body === 'string'
  ? JSON.parse(body) as NotificationRequest
  : (body ?? {}) as NotificationRequest;

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const getBearerToken = (req: ApiRequest) => {
  const raw = req.headers?.authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  return header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || '';
};

const sendEmail = async (apiKey: string, payload: Record<string, unknown>, idempotencyKey: string) => {
  const body = JSON.stringify(payload);
  await new Promise<void>((resolve, reject) => {
    const resendRequest = request(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body).toString(),
        'Idempotency-Key': idempotencyKey.slice(0, 256)
      }
    }, (response) => {
      let responseBody = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { responseBody += chunk; });
      response.on('end', () => {
        const statusCode = response.statusCode ?? 0;
        if (statusCode < 200 || statusCode >= 300) reject(new Error(`Staff notification failed: ${statusCode} ${responseBody}`));
        else resolve();
      });
    });
    resendRequest.on('error', reject);
    resendRequest.write(body);
    resendRequest.end();
  });
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const accessToken = getBearerToken(req);
  if (!apiKey || !supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Notification service is not configured' });
  if (!accessToken) return res.status(401).json({ error: 'Sign in required' });

  const { postId, eventType, commentId } = parseBody(req.body);
  if (!postId || !eventType || !['new_post', 'comment', 'reaction'].includes(eventType)) {
    return res.status(400).json({ error: 'Invalid staff notification request' });
  }

  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` }
    });
    if (!authResponse.ok) return res.status(401).json({ error: 'Staff session expired' });

    const eventResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_staff_feed_email_event_v1`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_post_id: postId, p_event_type: eventType, p_comment_id: commentId || null })
    });
    if (!eventResponse.ok) {
      console.error('Staff notification authorization failed:', eventResponse.status, await eventResponse.text());
      return res.status(403).json({ error: 'Notification is not allowed' });
    }

    const event = await eventResponse.json() as NotificationEvent;
    const recipients = (event.recipients || []).filter((recipient) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)).slice(0, 100);
    if (recipients.length === 0) return res.status(200).json({ ok: true, sent: 0 });

    const action = event.event_type === 'new_post'
      ? 'posted a new staff update'
      : event.event_type === 'comment'
        ? 'commented on a staff post'
        : `reacted ${event.event_text === 'love' ? 'with love' : event.event_text === 'dislike' ? 'with thumbs down' : 'with a like'} to a staff post`;
    const subject = event.event_type === 'new_post'
      ? `${event.actor_name} posted in the Staff Feed`
      : `${event.actor_name} ${action.replace(/^reacted|^commented/, event.event_type === 'comment' ? 'commented' : 'reacted')}`;

    await Promise.all(recipients.map(async (recipient) => {
      const portalUrl = recipient.role === 'owner_admin' || recipient.role === 'staff'
        ? 'https://www.slapwrapz.com/admin'
        : 'https://www.slapwrapz.com/rep';
      const eventText = event.event_type === 'reaction' ? action : event.event_text;
      const html = `
        <div style="margin:0;background:#f8fafc;padding:24px;font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
          <div style="max-width:680px;margin:0 auto;">
            <div style="padding:24px;border-radius:16px;background:#312e81;color:#ffffff;">
              <p style="margin:0 0 8px;color:#c7d2fe;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">SlapWrapz Staff Feed</p>
              <h1 style="margin:0;font-size:24px;">New team activity</h1>
              <p style="margin:8px 0 0;color:#e0e7ff;">${escapeHtml(event.actor_name)} ${escapeHtml(action)}.</p>
            </div>
            <div style="margin-top:18px;padding:22px;border:1px solid #e5e7eb;border-radius:14px;background:#ffffff;">
              <p style="margin:0 0 14px;">Hi ${escapeHtml(recipient.display_name)},</p>
              <div style="white-space:pre-wrap;padding:16px;border-radius:12px;background:#f8fafc;border:1px solid #e5e7eb;">${escapeHtml(eventText)}</div>
              <p style="margin:18px 0 6px;color:#64748b;font-size:13px;font-weight:700;text-transform:uppercase;">Original post</p>
              <p style="margin:0;color:#334155;white-space:pre-wrap;">${escapeHtml(event.post_body.slice(0, 1200))}</p>
              <p style="margin:22px 0 0;"><a href="${portalUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:700;">Open Staff Feed</a></p>
            </div>
          </div>
        </div>`;
      await sendEmail(apiKey, {
        from: FROM_EMAIL,
        to: recipient.email,
        subject,
        html,
        text: `${event.actor_name} ${action}.\n\n${eventText}\n\nOriginal post:\n${event.post_body}\n\nOpen the Staff Feed: ${portalUrl}`
      }, `${event.notification_key}-${recipient.email.toLowerCase()}`);
    }));

    console.log('Staff feed notification sent:', { eventType: event.event_type, recipientCount: recipients.length });
    return res.status(200).json({ ok: true, sent: recipients.length });
  } catch (error) {
    console.error('Staff feed notification error:', error instanceof Error ? error.message : error);
    return res.status(502).json({ error: 'Staff notification delivery failed' });
  }
}
