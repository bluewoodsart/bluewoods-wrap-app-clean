const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'SlapWrapz <quotes@slapwrapz.com>';
const BUSINESS_LEAD_EMAIL = 'abussey@gmail.com';

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

interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  preferredContact?: string;
}

interface QuoteEmailRequest {
  contactInfo?: ContactInfo;
  quoteDetails?: Record<string, unknown>;
  uploadedFiles?: Array<{
    name?: string;
    url?: string;
    type?: string;
    size?: number;
  }>;
}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (Array.isArray(value)) return value.length ? value.map(formatValue).join(', ') : 'None';
  if (typeof value === 'object') return `<pre style="white-space:pre-wrap;margin:0">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
  return escapeHtml(value);
};

const quoteRows = (quoteDetails: Record<string, unknown> = {}) =>
  Object.entries(quoteDetails)
    .map(
      ([key, value]) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${escapeHtml(key)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${formatValue(value)}</td>
        </tr>
      `
    )
    .join('');

const uploadedFileList = (uploadedFiles: QuoteEmailRequest['uploadedFiles'] = []) => {
  if (!uploadedFiles.length) return '<p>No files were uploaded with this request.</p>';

  return `
    <ul>
      ${uploadedFiles
        .map(
          (file) => `
            <li>
              ${escapeHtml(file.name || 'Uploaded file')}
              ${file.url ? ` - <a href="${escapeHtml(file.url)}">View file</a>` : ''}
            </li>
          `
        )
        .join('')}
    </ul>
  `;
};

const sendEmail = async (apiKey: string, payload: Record<string, unknown>) => {
  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend email failed: ${response.status} ${details}`);
  }
};

const parseBody = (body: unknown): QuoteEmailRequest => {
  if (typeof body === 'string') {
    return JSON.parse(body) as QuoteEmailRequest;
  }

  return (body ?? {}) as QuoteEmailRequest;
};

const getManualVehicleDescription = (quoteDetails: Record<string, unknown> = {}) =>
  typeof quoteDetails.manualVehicleDescription === 'string'
    ? quoteDetails.manualVehicleDescription.trim()
    : '';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing RESEND_API_KEY' });
  }

  const { contactInfo, quoteDetails = {}, uploadedFiles = [] } = parseBody(req.body);
  const customerEmail = contactInfo?.email?.trim();

  if (!customerEmail) {
    return res.status(400).json({ error: 'Missing customer email' });
  }

  const customerName = contactInfo?.name || 'there';
  const manualVehicleDescription = getManualVehicleDescription(quoteDetails);
  const manualVehicleHtml = manualVehicleDescription
    ? `<p><strong>Vehicle note:</strong> ${escapeHtml(manualVehicleDescription)}</p>`
    : '';
  const manualVehicleText = manualVehicleDescription
    ? ` Vehicle note: ${manualVehicleDescription}.`
    : '';
  const customerHtml = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <h1>We received your wrap quote request</h1>
      <p>Hi ${escapeHtml(customerName)},</p>
      <p>Thank you for choosing SlapWrapz. We received your wrap quote request and will review your details.</p>
      ${manualVehicleHtml}
      <p>Please check your email to confirm your details. You will see a proof within the next 30 minutes.</p>
      <p>Thank you for choosing Blue Woods Brands.</p>
    </div>
  `;

  const businessHtml = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <h1>New SlapWrapz quote request</h1>
      <h2>Customer</h2>
      <p>
        <strong>Name:</strong> ${escapeHtml(contactInfo?.name)}<br />
        <strong>Email:</strong> ${escapeHtml(contactInfo?.email)}<br />
        <strong>Phone:</strong> ${escapeHtml(contactInfo?.phone)}<br />
        <strong>Preferred contact:</strong> ${escapeHtml(contactInfo?.preferredContact)}
      </p>
      ${manualVehicleHtml}
      <h2>Quote details</h2>
      <table style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb;">
        <tbody>${quoteRows(quoteDetails)}</tbody>
      </table>
      <h2>Uploaded files</h2>
      ${uploadedFileList(uploadedFiles)}
    </div>
  `;

  try {
    await Promise.all([
      sendEmail(apiKey, {
        from: FROM_EMAIL,
        to: customerEmail,
        subject: 'We received your wrap quote request',
        html: customerHtml,
        text: `Hi ${customerName}, we received your wrap quote request.${manualVehicleText} Check your email to confirm your details. You will see a proof within the next 30 minutes.`
      }),
      sendEmail(apiKey, {
        from: FROM_EMAIL,
        to: BUSINESS_LEAD_EMAIL,
        subject: 'New SlapWrapz quote request',
        html: businessHtml,
        text: `New SlapWrapz quote request from ${contactInfo?.name || 'Unknown'} (${customerEmail}), phone ${contactInfo?.phone || 'not provided'}.${manualVehicleText}`
      })
    ]);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(502).json({ error: 'Email send failed' });
  }
}
