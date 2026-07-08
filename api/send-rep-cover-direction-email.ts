import { request } from 'node:https';

const RESEND_API_URL = new URL('https://api.resend.com/emails');
const FROM_EMAIL = 'SlapWrapz <quotes@slapwrapz.com>';
const REVIEW_EMAIL = 'quotes@slapwrapz.com';

interface ApiRequest {
  method?: string;
  body: unknown;
}

interface ApiResponse {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => {
    json: (body: Record<string, unknown>) => void;
  };
}

interface CoverDirectionBody {
  repSlug?: string | null;
  repName?: string | null;
  repEmail?: string | null;
  pageUrl?: string | null;
  direction?: string | null;
}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const parseBody = (body: unknown): CoverDirectionBody => {
  if (typeof body === 'string') {
    return JSON.parse(body) as CoverDirectionBody;
  }

  return (body ?? {}) as CoverDirectionBody;
};

const getEmailDomain = (email: string) => email.split('@').pop() || 'unknown';

const sendEmail = async (apiKey: string, payload: Record<string, unknown>) => {
  if (RESEND_API_URL.protocol !== 'https:') {
    throw new Error(`Invalid Resend API URL protocol: ${RESEND_API_URL.protocol}`);
  }

  const body = JSON.stringify(payload);

  await new Promise<void>((resolve, reject) => {
    const resendRequest = request(
      RESEND_API_URL,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body).toString()
        }
      },
      (response) => {
        let responseBody = '';

        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          responseBody += chunk;
        });
        response.on('end', () => {
          const statusCode = response.statusCode ?? 0;

          if (statusCode < 200 || statusCode >= 300) {
            reject(new Error(`Rep cover direction email failed: ${statusCode} ${responseBody}`));
            return;
          }

          resolve();
        });
      }
    );

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
  if (!apiKey) {
    console.error('RESEND_API_KEY missing.');
    return res.status(500).json({ error: 'Missing RESEND_API_KEY' });
  }

  const body = parseBody(req.body);
  const repSlug = body.repSlug?.trim().toLowerCase() || '';
  const repName = body.repName?.trim() || repSlug || 'Rep';
  const repEmail = body.repEmail?.trim() || '';
  const pageUrl = body.pageUrl?.trim() || `https://www.slapwrapz.com/${repSlug}`;
  const direction = body.direction?.trim() || '';

  if (repSlug !== 'jarrel') {
    return res.status(400).json({ error: 'Unsupported rep cover direction request' });
  }

  if (direction.length < 40) {
    return res.status(400).json({ error: 'Please add more page direction before submitting.' });
  }

  const subject = `Jarrel cover page direction submission`;
  const htmlDirection = escapeHtml(direction).replace(/\n/g, '<br />');
  const html = `
    <div style="margin:0;background:#f8fafc;padding:24px;font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <div style="max-width:720px;margin:0 auto;">
        <div style="padding:24px;border-radius:16px;background:#111827;color:#ffffff;">
          <p style="margin:0 0 8px;color:#93c5fd;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Rep Cover Page Review</p>
          <h1 style="margin:0;font-size:25px;">${escapeHtml(repName)} submitted cover page direction.</h1>
          <p style="margin:10px 0 0;color:#d1d5db;">Review this before approving any live front-end change.</p>
        </div>

        <div style="margin-top:18px;padding:22px;border:1px solid #e5e7eb;border-radius:14px;background:#ffffff;">
          <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Rep</p>
          <p style="margin:0 0 14px;font-weight:700;color:#0f172a;">${escapeHtml(repName)} (${escapeHtml(repSlug)})</p>
          <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Email</p>
          <p style="margin:0 0 14px;font-weight:700;color:#0f172a;">${escapeHtml(repEmail || 'Not provided')}</p>
          <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Page</p>
          <p style="margin:0;"><a href="${escapeHtml(pageUrl)}" style="color:#2563eb;font-weight:700;">${escapeHtml(pageUrl)}</a></p>
        </div>

        <div style="margin-top:18px;padding:22px;border:1px solid #dbeafe;border-radius:14px;background:#eff6ff;">
          <p style="margin:0 0 12px;color:#1d4ed8;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Submitted Direction</p>
          <div style="padding:16px;border-radius:12px;background:#ffffff;border:1px solid #bfdbfe;color:#0f172a;font-size:14px;">${htmlDirection}</div>
        </div>

        <div style="margin-top:18px;padding:18px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;">
          <p style="margin:0;font-weight:700;">Approval step required</p>
          <p style="margin:8px 0 0;">Codex should summarize this recommendation and wait for owner approval before updating www.slapwrapz.com/jarrel.</p>
        </div>
      </div>
    </div>
  `;

  try {
    console.log('rep cover direction email attempt started:', {
      repSlug,
      repEmailDomain: repEmail ? getEmailDomain(repEmail) : 'none'
    });
    await sendEmail(apiKey, {
      from: FROM_EMAIL,
      to: REVIEW_EMAIL,
      reply_to: repEmail || undefined,
      subject,
      html,
      text: `Rep cover page direction submitted.\n\nRep: ${repName} (${repSlug})\nEmail: ${repEmail || 'Not provided'}\nPage: ${pageUrl}\n\nSubmitted direction:\n${direction}\n\nApproval step required before updating the live page.`
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('rep cover direction email error:', error instanceof Error ? error.message : error);
    return res.status(502).json({ error: 'Rep cover direction email failed' });
  }
}
