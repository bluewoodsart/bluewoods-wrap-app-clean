import { createClient } from '@supabase/supabase-js';

const FROM_EMAIL = 'SlapWrapz <quotes@slapwrapz.com>';

interface ApiRequest {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body: unknown;
}

interface ApiResponse {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: Record<string, unknown>) => void };
}

interface UrgentLeadEmailBody {
  repEmail?: string;
  repName?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  quoteId?: string;
  leadNature?: string;
  leadSource?: string;
  receivedAt?: string;
}

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const parseBody = (body: unknown): UrgentLeadEmailBody =>
  typeof body === 'string' ? JSON.parse(body) as UrgentLeadEmailBody : (body || {}) as UrgentLeadEmailBody;

const getBearerToken = (headers: ApiRequest['headers']) => {
  const raw = headers?.authorization;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.startsWith('Bearer ') ? value.slice(7) : '';
};

const verifyAdmin = async (token: string) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !token) return false;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await client.rpc('get_current_admin_user');
  if (error) return false;
  const user = data?.[0] as { role?: string; is_active?: boolean } | undefined;
  return Boolean(user?.is_active && ['owner_admin', 'staff'].includes(user.role || ''));
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authorized = await verifyAdmin(getBearerToken(req.headers));
  if (!authorized) return res.status(401).json({ error: 'Admin authorization required' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing RESEND_API_KEY' });

  const body = parseBody(req.body);
  const repEmail = body.repEmail?.trim();
  if (!repEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(repEmail)) {
    return res.status(400).json({ error: 'Valid rep email required' });
  }

  const portalUrl = `https://www.slapwrapz.com/rep?urgentLead=${encodeURIComponent(body.quoteId || '')}`;
  const receivedAt = body.receivedAt ? new Date(body.receivedAt).toLocaleString('en-US', { timeZoneName: 'short' }) : 'Just now';
  const html = `
    <div style="margin:0;background:#fff7ed;padding:24px;font-family:Arial,sans-serif;color:#111827;line-height:1.5;">
      <div style="max-width:680px;margin:0 auto;">
        <div style="border-radius:16px;background:#b91c1c;padding:24px;color:#fff;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">Immediate response required</p>
          <h1 style="margin:0;font-size:28px;">New lead assigned to you</h1>
          <p style="margin:10px 0 0;font-size:17px;">You have five minutes to acknowledge and contact this customer before the lead becomes available to the team.</p>
        </div>
        <div style="margin-top:16px;border:2px solid #fecaca;border-radius:14px;background:#fff;padding:20px;">
          <p style="margin:0 0 12px;">Hi ${escapeHtml(body.repName || 'Sales rep')},</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:7px 0;color:#64748b;">Customer</td><td style="padding:7px 0;font-weight:700;">${escapeHtml(body.customerName || 'New customer')}</td></tr>
            <tr><td style="padding:7px 0;color:#64748b;">Phone</td><td style="padding:7px 0;font-weight:700;">${escapeHtml(body.customerPhone || 'Not provided')}</td></tr>
            <tr><td style="padding:7px 0;color:#64748b;">Email</td><td style="padding:7px 0;font-weight:700;">${escapeHtml(body.customerEmail || 'Not provided')}</td></tr>
            <tr><td style="padding:7px 0;color:#64748b;">Lead</td><td style="padding:7px 0;font-weight:700;">${escapeHtml(body.leadNature || 'Quote request')}</td></tr>
            <tr><td style="padding:7px 0;color:#64748b;">Source</td><td style="padding:7px 0;font-weight:700;">${escapeHtml(body.leadSource || 'SlapWrapz')}</td></tr>
            <tr><td style="padding:7px 0;color:#64748b;">Received</td><td style="padding:7px 0;font-weight:700;">${escapeHtml(receivedAt)}</td></tr>
          </table>
          <a href="${escapeHtml(portalUrl)}" style="display:block;margin-top:18px;border-radius:10px;background:#dc2626;padding:15px;text-align:center;color:#fff;text-decoration:none;font-size:17px;font-weight:800;">Open Lead &amp; Confirm Receipt</a>
        </div>
      </div>
    </div>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: repEmail,
      subject: `URGENT: New lead assigned — contact within 5 minutes`,
      html,
      text: [
        'URGENT: New lead assigned to you.',
        'Acknowledge and contact this customer within five minutes or the lead becomes available to the team.',
        `Customer: ${body.customerName || 'New customer'}`,
        `Phone: ${body.customerPhone || 'Not provided'}`,
        `Email: ${body.customerEmail || 'Not provided'}`,
        `Lead: ${body.leadNature || 'Quote request'}`,
        `Source: ${body.leadSource || 'SlapWrapz'}`,
        `Open: ${portalUrl}`
      ].join('\n')
    })
  });

  const result = await response.text();
  if (!response.ok) {
    console.error('Urgent lead notification failed:', response.status, result);
    return res.status(502).json({ error: 'Urgent lead email failed' });
  }

  return res.status(200).json({ ok: true });
}
