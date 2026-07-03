import { request } from 'node:https';

const RESEND_API_URL = new URL('https://api.resend.com/emails');
const FROM_EMAIL = 'SlapWrapz <quotes@slapwrapz.com>';

const SALES_REPS: Record<string, { name: string; email: string }> = {
  ashley: {
    name: 'Ashley',
    email: 'abussey@gmail.com'
  },
  todd: {
    name: 'Todd Wheeler',
    email: 'trapstarcustoms@gmail.com'
  },
  trapstar: {
    name: 'Trapstar Customs LG',
    email: 'trapstarcustomslg@gmail.com'
  },
  jazzy: {
    name: 'Jazzy Automotive',
    email: 'jazzyautoimaging@gmail.com'
  },
  test: {
    name: 'Test Sales Rep',
    email: 'pressplayadvertising@gmail.com'
  }
};

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

interface InternalNoteNotificationBody {
  repEmail?: string | null;
  repSlug?: string | null;
  repName?: string | null;
  quoteId?: string | null;
  customerName?: string | null;
  noteText?: string;
}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const parseBody = (body: unknown): InternalNoteNotificationBody => {
  if (typeof body === 'string') {
    return JSON.parse(body) as InternalNoteNotificationBody;
  }

  return (body ?? {}) as InternalNoteNotificationBody;
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
            reject(new Error(`Internal note notification failed: ${statusCode} ${responseBody}`));
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

  const { repEmail, repSlug, repName, quoteId, customerName, noteText } = parseBody(req.body);
  const trimmedRepSlug = repSlug?.trim().toLowerCase() || '';
  const fallbackRep = trimmedRepSlug ? SALES_REPS[trimmedRepSlug] : undefined;
  const recipientEmail = repEmail?.trim() || fallbackRep?.email || '';
  const recipientName = repName?.trim() || fallbackRep?.name || 'there';
  const trimmedNote = noteText?.trim() || '';

  if (!recipientEmail) {
    return res.status(400).json({ error: 'Missing sales rep email' });
  }

  if (!trimmedNote) {
    return res.status(400).json({ error: 'Missing noteText' });
  }

  const quoteLabel = quoteId || 'quote request';
  const customerLabel = customerName || 'Customer';
  const subject = `Internal note added for ${quoteLabel}`;
  const html = `
    <div style="margin:0;background:#f8fafc;padding:24px;font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <div style="max-width:680px;margin:0 auto;">
        <div style="padding:24px;border-radius:16px;background:#111827;color:#ffffff;">
          <h1 style="margin:0;font-size:24px;">New internal note</h1>
          <p style="margin:8px 0 0;color:#d1d5db;">A staff note was added in the SlapWrapz admin CRM.</p>
        </div>

        <div style="margin-top:18px;padding:22px;border:1px solid #e5e7eb;border-radius:14px;background:#ffffff;">
          <p style="margin:0 0 12px;">Hi ${escapeHtml(recipientName)},</p>
          <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Quote:</p>
          <p style="margin:0 0 12px;font-weight:700;color:#0f172a;">${escapeHtml(quoteLabel)}</p>
          <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Customer:</p>
          <p style="margin:0 0 16px;font-weight:700;color:#0f172a;">${escapeHtml(customerLabel)}</p>
          <div style="white-space:pre-wrap;padding:16px;border-radius:12px;background:#f8fafc;border:1px solid #e5e7eb;color:#0f172a;">${escapeHtml(trimmedNote)}</div>
        </div>
      </div>
    </div>
  `;

  try {
    console.log('internal note notification email attempt started:', {
      toDomain: getEmailDomain(recipientEmail),
      repSlug: trimmedRepSlug || 'none',
      quoteId: quoteId || 'none'
    });
    await sendEmail(apiKey, {
      from: FROM_EMAIL,
      to: recipientEmail,
      subject,
      html,
      text: `Hi ${recipientName}, a staff note was added in the SlapWrapz admin CRM.\n\nQuote: ${quoteLabel}\nCustomer: ${customerLabel}\n\n${trimmedNote}`
    });
    console.log('internal note notification email result: sent');

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('internal note notification email error:', error instanceof Error ? error.message : error);
    return res.status(502).json({ error: 'Internal note notification failed' });
  }
}
