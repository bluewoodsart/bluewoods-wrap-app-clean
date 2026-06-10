import { request } from 'node:https';

const RESEND_API_URL = new URL('https://api.resend.com/emails');
const FROM_EMAIL = 'SlapWrapz <quotes@slapwrapz.com>';

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

interface CustomerActionRequestBody {
  customerEmail?: string;
  customerName?: string;
  quoteId?: string | null;
  requestType?: string;
  message?: string;
}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatRequestType = (requestType: string) =>
  requestType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace('Logo Artwork', 'Logo / Artwork');

const parseBody = (body: unknown): CustomerActionRequestBody => {
  if (typeof body === 'string') {
    return JSON.parse(body) as CustomerActionRequestBody;
  }

  return (body ?? {}) as CustomerActionRequestBody;
};

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
            reject(new Error(`Customer action request email failed: ${statusCode} ${responseBody}`));
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

  const { customerEmail, customerName, quoteId, requestType, message } = parseBody(req.body);
  const trimmedCustomerEmail = customerEmail?.trim();
  const trimmedMessage = message?.trim();
  const trimmedRequestType = requestType?.trim();

  if (!trimmedCustomerEmail) {
    return res.status(400).json({ error: 'Missing customerEmail' });
  }

  if (!trimmedRequestType) {
    return res.status(400).json({ error: 'Missing requestType' });
  }

  if (!trimmedMessage) {
    return res.status(400).json({ error: 'Missing message' });
  }

  const requestLabel = formatRequestType(trimmedRequestType);
  const greetingName = customerName?.trim() || 'there';
  const subject = `Action needed for your SlapWrapz quote${quoteId ? ` ${quoteId}` : ''}`;
  const html = `
    <div style="margin:0;background:#f8fafc;padding:24px;font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <div style="max-width:680px;margin:0 auto;">
        <div style="padding:24px;border-radius:16px;background:#0f4fa8;color:#ffffff;">
          <h1 style="margin:0;font-size:26px;">SlapWrapz</h1>
          <p style="margin:8px 0 0;font-size:16px;">We need one more item for your wrap quote.</p>
        </div>

        <div style="margin-top:18px;padding:22px;border:1px solid #e5e7eb;border-radius:14px;background:#ffffff;">
          <p style="margin:0 0 12px;">Hi ${escapeHtml(greetingName)},</p>
          <p style="margin:0 0 12px;">We reviewed your wrap request and need one more item to move your quote forward. Please reply to this email with the requested information or files.</p>
          <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Requested item:</p>
          <p style="margin:0 0 16px;font-weight:700;color:#0f172a;">${escapeHtml(requestLabel)}</p>
          <div style="white-space:pre-wrap;padding:16px;border-radius:12px;background:#f8fafc;border:1px solid #e5e7eb;color:#0f172a;">${escapeHtml(trimmedMessage)}</div>
        </div>

        <p style="margin:20px 0 0;color:#475569;font-size:14px;">Thank you for choosing SlapWrapz by Blue Woods Brands.</p>
      </div>
    </div>
  `;

  try {
    console.log('customer action request email attempt started:', {
      toDomain: trimmedCustomerEmail.includes('@') ? trimmedCustomerEmail.split('@').pop() : 'unknown',
      requestType: trimmedRequestType,
      quoteId: quoteId || 'none'
    });
    await sendEmail(apiKey, {
      from: FROM_EMAIL,
      to: trimmedCustomerEmail,
      subject,
      html,
      text: `Hi ${greetingName}, we reviewed your wrap request and need one more item to move your quote forward. Please reply to this email with the requested information or files.\n\nRequested item: ${requestLabel}\n\n${trimmedMessage}`
    });
    console.log('customer action request email result: sent');

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('customer action request email error:', error instanceof Error ? error.message : error);
    return res.status(502).json({ error: 'Customer action request email failed' });
  }
}
