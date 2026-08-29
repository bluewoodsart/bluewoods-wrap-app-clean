import { request } from 'node:https';
import { analyzeBusinessCardBoard } from '../server/analyze-business-card-board.js';

const RESEND_API_URL = new URL('https://api.resend.com/emails');
const FROM_EMAIL = process.env.SLAPWRAPZ_FROM_EMAIL?.trim() || 'SlapWrapz Admin <quotes@slapwrapz.com>';

interface ApiRequest {
  method?: string;
  body: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: Record<string, unknown>) => void };
}

interface OwnerRecipient { email: string; display_name: string }
interface ReviewEvent {
  id: string;
  title: string;
  status: string;
  problem_summary: string;
  proposed_fix: string;
  expected_result: string;
  actor_name: string;
  recipients: OwnerRecipient[];
}

const parseBody = (body: unknown) => typeof body === 'string'
  ? JSON.parse(body) as { reviewId?: string }
  : (body ?? {}) as { reviewId?: string };

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
    const emailRequest = request(RESEND_API_URL, {
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
        if (statusCode < 200 || statusCode >= 300) reject(new Error(`Email failed: ${statusCode} ${responseBody}`));
        else resolve();
      });
    });
    emailRequest.on('error', reject);
    emailRequest.write(body);
    emailRequest.end();
  });
};

const statusLabel = (status: string) => status.split('_').map((part) =>
  part.charAt(0).toUpperCase() + part.slice(1)
).join(' ');

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const mode = typeof req.body === 'string' ? JSON.parse(req.body)?.mode : (req.body as { mode?: string } | null)?.mode;
  if (mode === 'business-card-board') return analyzeBusinessCardBoard(req, res);

  const apiKey = process.env.RESEND_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const accessToken = getBearerToken(req);
  const { reviewId } = parseBody(req.body);
  if (!apiKey || !supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Notification service is not configured' });
  if (!accessToken) return res.status(401).json({ error: 'Sign in required' });
  if (!reviewId) return res.status(400).json({ error: 'Review ID is required' });

  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` }
    });
    if (!authResponse.ok) return res.status(401).json({ error: 'Admin session expired' });

    const eventResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_video_instruction_email_event_v1`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_review_id: reviewId })
    });
    if (!eventResponse.ok) {
      console.error('Video review email authorization failed:', eventResponse.status, await eventResponse.text());
      return res.status(403).json({ error: 'Notification is not allowed' });
    }

    const event = await eventResponse.json() as ReviewEvent;
    const recipients = (event.recipients || [])
      .filter((recipient) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email))
      .slice(0, 20);
    if (recipients.length === 0) return res.status(200).json({ ok: true, sent: 0 });

    const portalUrl = `https://www.slapwrapz.com/admin?tab=video-reviews&review=${encodeURIComponent(event.id)}`;
    const label = statusLabel(event.status);
    await Promise.all(recipients.map(async (recipient) => {
      const html = `
        <div style="margin:0;background:#f8fafc;padding:24px;font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
          <div style="max-width:680px;margin:0 auto;">
            <div style="padding:24px;border-radius:16px;background:#312e81;color:#ffffff;">
              <p style="margin:0 0 8px;color:#c7d2fe;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Video Instructions &amp; Fixes</p>
              <h1 style="margin:0;font-size:24px;">${escapeHtml(event.title)}</h1>
              <p style="margin:8px 0 0;color:#e0e7ff;">Status: ${escapeHtml(label)}</p>
            </div>
            <div style="margin-top:18px;padding:22px;border:1px solid #e5e7eb;border-radius:14px;background:#ffffff;">
              <p style="margin:0 0 14px;">Hi ${escapeHtml(recipient.display_name)},</p>
              <p>${escapeHtml(event.actor_name)} updated this video review and it now needs your attention.</p>
              <p style="margin:18px 0 4px;font-weight:700;color:#991b1b;">Problem</p>
              <p style="margin:0;white-space:pre-wrap;">${escapeHtml(event.problem_summary || 'Not entered yet.')}</p>
              <p style="margin:18px 0 4px;font-weight:700;color:#5b21b6;">Proposed fix</p>
              <p style="margin:0;white-space:pre-wrap;">${escapeHtml(event.proposed_fix || 'Not entered yet.')}</p>
              <p style="margin:18px 0 4px;font-weight:700;color:#047857;">Expected result</p>
              <p style="margin:0;white-space:pre-wrap;">${escapeHtml(event.expected_result || 'Not entered yet.')}</p>
              <p style="margin:22px 0 0;"><a href="${portalUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:700;">Open Video Review</a></p>
            </div>
          </div>
        </div>`;
      await sendEmail(apiKey, {
        from: FROM_EMAIL,
        to: recipient.email,
        subject: `${label}: ${event.title}`,
        html,
        text: `${event.title}\nStatus: ${label}\n\nProblem:\n${event.problem_summary}\n\nProposed fix:\n${event.proposed_fix}\n\nExpected result:\n${event.expected_result}\n\nOpen: ${portalUrl}`
      }, `video-review-${event.id}-${event.status}-${recipient.email.toLowerCase()}`);
    }));

    return res.status(200).json({ ok: true, sent: recipients.length });
  } catch (error) {
    console.error('Video review notification error:', error instanceof Error ? error.message : error);
    return res.status(502).json({ error: 'Video review notification delivery failed' });
  }
}
