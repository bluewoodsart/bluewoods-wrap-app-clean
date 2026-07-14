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

interface DesignerPacketRequestBody {
  designerEmail?: string;
  designerName?: string;
  customerName?: string;
  quoteId?: string | null;
  productLabel?: string;
  packetUrl?: string;
  instructions?: string;
  cloudFolderUrl?: string;
}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const parseBody = (body: unknown): DesignerPacketRequestBody => {
  if (typeof body === 'string') {
    return JSON.parse(body) as DesignerPacketRequestBody;
  }

  return (body ?? {}) as DesignerPacketRequestBody;
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
            reject(new Error(`Designer packet email failed: ${statusCode} ${responseBody}`));
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

  const {
    designerEmail,
    designerName,
    customerName,
    quoteId,
    productLabel,
    packetUrl,
    instructions,
    cloudFolderUrl
  } = parseBody(req.body);

  const trimmedDesignerEmail = designerEmail?.trim();
  const trimmedPacketUrl = packetUrl?.trim();
  const trimmedInstructions = instructions?.trim();

  if (!trimmedDesignerEmail) {
    return res.status(400).json({ error: 'Missing designerEmail' });
  }

  if (!trimmedPacketUrl) {
    return res.status(400).json({ error: 'Missing packetUrl' });
  }

  if (!trimmedInstructions) {
    return res.status(400).json({ error: 'Missing instructions' });
  }

  const greetingName = designerName?.trim() || 'designer';
  const subject = `Design packet: ${customerName || 'SlapWrapz customer'}${quoteId ? ` (${quoteId})` : ''}`;
  const safeCloudFolderUrl = cloudFolderUrl?.trim();

  const html = `
    <div style="margin:0;background:#f8fafc;padding:24px;font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <div style="max-width:720px;margin:0 auto;">
        <div style="padding:24px;border-radius:16px;background:#111827;color:#ffffff;">
          <h1 style="margin:0;font-size:26px;">SlapWrapz Designer Packet</h1>
          <p style="margin:8px 0 0;font-size:16px;">A job is ready for design review.</p>
        </div>

        <div style="margin-top:18px;padding:22px;border:1px solid #e5e7eb;border-radius:14px;background:#ffffff;">
          <p style="margin:0 0 12px;">Hi ${escapeHtml(greetingName)},</p>
          <p style="margin:0 0 12px;">Please open the private packet below. It has the customer details, quote notes, uploaded references, and a place to send proof files or comments back to SlapWrapz.</p>
          <p style="margin:0 0 18px;">
            <a href="${escapeHtml(trimmedPacketUrl)}" style="display:inline-block;border-radius:10px;background:#0f4fa8;color:#ffffff;padding:12px 18px;text-decoration:none;font-weight:700;">Open designer packet</a>
          </p>
          <p style="margin:0 0 12px;color:#64748b;font-size:14px;">If the button does not work, copy this link:<br><a href="${escapeHtml(trimmedPacketUrl)}" style="color:#2563eb;">${escapeHtml(trimmedPacketUrl)}</a></p>

          <div style="margin-top:18px;padding:16px;border-radius:12px;background:#f8fafc;border:1px solid #e5e7eb;">
            <p style="margin:0 0 8px;color:#64748b;font-size:13px;text-transform:uppercase;font-weight:700;">Job</p>
            <p style="margin:0;"><strong>${escapeHtml(productLabel || 'Design job')}</strong>${quoteId ? ` &middot; ${escapeHtml(quoteId)}` : ''}</p>
            <p style="margin:4px 0 0;">Customer: ${escapeHtml(customerName || 'Customer')}</p>
          </div>

          <div style="margin-top:16px;white-space:pre-wrap;padding:16px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;color:#431407;">${escapeHtml(trimmedInstructions)}</div>

          ${safeCloudFolderUrl ? `
            <p style="margin:16px 0 0;">Cloud folder:</p>
            <p style="margin:4px 0 0;"><a href="${escapeHtml(safeCloudFolderUrl)}" style="color:#2563eb;">${escapeHtml(safeCloudFolderUrl)}</a></p>
          ` : ''}
        </div>

        <p style="margin:20px 0 0;color:#475569;font-size:14px;">Please send notes and proof files through the packet link so the job stays connected.</p>
      </div>
    </div>
  `;

  try {
    await sendEmail(apiKey, {
      from: FROM_EMAIL,
      to: trimmedDesignerEmail,
      subject,
      html,
      text: [
        `Hi ${greetingName},`,
        '',
        'A SlapWrapz design packet is ready.',
        `Open the private packet: ${trimmedPacketUrl}`,
        '',
        `Customer: ${customerName || 'Customer'}`,
        `Quote: ${quoteId || 'No quote ID'}`,
        `Product: ${productLabel || 'Design job'}`,
        '',
        'Instructions:',
        trimmedInstructions,
        '',
        safeCloudFolderUrl ? `Cloud folder: ${safeCloudFolderUrl}` : ''
      ].filter(Boolean).join('\n')
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('designer packet email error:', error instanceof Error ? error.message : error);
    return res.status(502).json({ error: 'Designer packet email failed' });
  }
}
