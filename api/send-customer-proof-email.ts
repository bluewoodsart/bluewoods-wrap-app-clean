import { request } from 'node:https';

const RESEND_API_URL = new URL('https://api.resend.com/emails');
const FROM_EMAIL = 'SlapWrapz <quotes@slapwrapz.com>';

interface ApiRequest {
  method?: string;
  body: unknown;
}

interface ApiResponse {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: Record<string, unknown>) => void };
}

interface CustomerProofEmailBody {
  customerEmail?: string;
  customerName?: string;
  quoteId?: string | null;
  productLabel?: string;
  proofUrl?: string;
}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const parseBody = (body: unknown): CustomerProofEmailBody =>
  typeof body === 'string' ? JSON.parse(body) as CustomerProofEmailBody : (body ?? {}) as CustomerProofEmailBody;

const sendEmail = async (apiKey: string, payload: Record<string, unknown>) => {
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
        response.on('data', (chunk) => { responseBody += chunk; });
        response.on('end', () => {
          const statusCode = response.statusCode ?? 0;
          statusCode >= 200 && statusCode < 300
            ? resolve()
            : reject(new Error(`Customer proof email failed: ${statusCode} ${responseBody}`));
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
  if (!apiKey) return res.status(500).json({ error: 'Missing RESEND_API_KEY' });

  const { customerEmail, customerName, quoteId, productLabel, proofUrl } = parseBody(req.body);
  const to = customerEmail?.trim();
  const privateProofUrl = proofUrl?.trim();

  if (!to) return res.status(400).json({ error: 'Missing customerEmail' });
  if (!privateProofUrl) return res.status(400).json({ error: 'Missing proofUrl' });

  const greetingName = customerName?.trim() || 'there';
  const product = productLabel?.trim() || 'design';
  const subject = `Your ${product.toLowerCase()} proof is ready${quoteId ? ` — ${quoteId}` : ''}`;
  const safeUrl = escapeHtml(privateProofUrl);
  const html = `
    <div style="margin:0;background:#f8fafc;padding:24px;font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <div style="max-width:680px;margin:0 auto;">
        <div style="padding:24px;border-radius:16px;background:#0f4fa8;color:#ffffff;">
          <h1 style="margin:0;font-size:26px;">Your proof is ready</h1>
          <p style="margin:8px 0 0;font-size:16px;">Please review your ${escapeHtml(product.toLowerCase())} proof.</p>
        </div>
        <div style="margin-top:18px;padding:22px;border:1px solid #e5e7eb;border-radius:14px;background:#ffffff;">
          <p style="margin:0 0 12px;">Hi ${escapeHtml(greetingName)},</p>
          <p style="margin:0 0 18px;">Your updated proof is ready to view. Use the private link below to review it and send your approval or revision request.</p>
          <p style="margin:0 0 18px;"><a href="${safeUrl}" style="display:inline-block;border-radius:10px;background:#0f4fa8;color:#ffffff;padding:12px 18px;text-decoration:none;font-weight:700;">View your proof</a></p>
          <p style="margin:0;color:#64748b;font-size:14px;">If the button does not work, copy this private link:<br><a href="${safeUrl}" style="color:#2563eb;">${safeUrl}</a></p>
        </div>
        <p style="margin:20px 0 0;color:#475569;font-size:14px;">Thank you for choosing SlapWrapz by Blue Woods Brands.</p>
      </div>
    </div>
  `;

  try {
    await sendEmail(apiKey, {
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text: [
        `Hi ${greetingName},`,
        '',
        `Your updated ${product.toLowerCase()} proof is ready to review.`,
        `View your private proof: ${privateProofUrl}`,
        '',
        'Please use the proof page to send your approval or revision request.',
        '',
        'Thank you for choosing SlapWrapz by Blue Woods Brands.'
      ].join('\n')
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('customer proof email error:', error instanceof Error ? error.message : error);
    return res.status(502).json({ error: 'Customer proof email failed' });
  }
}

