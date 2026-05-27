const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'SlapWrapz <quotes@slapwrapz.com>';
const BUSINESS_LEAD_EMAIL = 'quotes@slapwrapz.com';

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

const formatSimpleValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    return value
      .map((item) => formatSimpleValue(item))
      .filter(Boolean)
      .join(', ');
  }

  if (typeof value === 'object') {
    const details = Object.entries(value as Record<string, unknown>)
      .map(([, detail]) => formatSimpleValue(detail))
      .filter(Boolean);

    return details.join(' ');
  }

  return String(value);
};

const section = (title: string, body: string) => `
  <div style="margin-top:20px;padding:18px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;">
    <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">${escapeHtml(title)}</h2>
    ${body}
  </div>
`;

const detailRows = (items: Array<[string, unknown]>) => {
  const rows = items
    .map(([label, value]) => [label, formatSimpleValue(value)] as [string, string])
    .filter(([, value]) => value.trim().length > 0)
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 0;color:#64748b;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:8px 0;color:#0f172a;font-weight:600;">${escapeHtml(value)}</td>
        </tr>
      `
    )
    .join('');

  return rows
    ? `<table style="border-collapse:collapse;width:100%;font-size:14px;"><tbody>${rows}</tbody></table>`
    : '<p style="margin:0;color:#64748b;">Not provided.</p>';
};

const getManualVehicleDescription = (quoteDetails: Record<string, unknown> = {}) =>
  typeof quoteDetails.manualVehicleDescription === 'string'
    ? quoteDetails.manualVehicleDescription.trim()
    : '';

const getVehicle = (quoteDetails: Record<string, unknown> = {}) => {
  const vehicle = quoteDetails.vehicle && typeof quoteDetails.vehicle === 'object'
    ? quoteDetails.vehicle as Record<string, unknown>
    : {};
  const year = formatSimpleValue(vehicle.year);
  const make = formatSimpleValue(vehicle.make);
  const model = formatSimpleValue(vehicle.model);
  const manualVehicleDescription = getManualVehicleDescription(quoteDetails);
  const dropdownVehicle = [year, make, model].filter(Boolean).join(' ');
  const mainVehicle = dropdownVehicle || manualVehicleDescription;

  return {
    year,
    make,
    model,
    dropdownVehicle,
    manualVehicleDescription,
    mainVehicle
  };
};

const uploadedFileList = (uploadedFiles: QuoteEmailRequest['uploadedFiles'] = []) => {
  if (!uploadedFiles.length) return '<p style="margin:0;color:#64748b;">No files were uploaded with this request.</p>';

  return `
    <ul style="margin:0;padding-left:20px;">
      ${uploadedFiles
        .map(
          (file) => `
            <li style="margin:8px 0;">
              ${escapeHtml(file.name || 'Uploaded file')}
              ${file.url ? ` - <a href="${escapeHtml(file.url)}" style="color:#2563eb;">View file</a>` : ''}
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
  const vehicle = getVehicle(quoteDetails);
  const manualVehicleDescription = getManualVehicleDescription(quoteDetails);
  const manualVehicleText = manualVehicleDescription
    ? ` Vehicle note: ${manualVehicleDescription}.`
    : '';

  const customerSummary = detailRows([
    ['Selected Service', quoteDetails.selectedService],
    ['Vehicle', vehicle.mainVehicle],
    ['Manual Vehicle Description', vehicle.dropdownVehicle ? manualVehicleDescription : ''],
    ['Project Goal', quoteDetails.goal],
    ['Budget', quoteDetails.budget],
    ['Uploaded File Count', quoteDetails.uploadedFileCount]
  ]);

  const customerHtml = `
    <div style="margin:0;background:#f8fafc;padding:24px;font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <div style="max-width:680px;margin:0 auto;">
        <div style="padding:24px;border-radius:16px;background:#0f4fa8;color:#ffffff;">
          <h1 style="margin:0;font-size:26px;">SlapWrapz</h1>
          <p style="margin:8px 0 0;font-size:16px;">We received your wrap quote request.</p>
        </div>

        <div style="margin-top:18px;padding:22px;border:1px solid #e5e7eb;border-radius:14px;background:#ffffff;">
          <p style="margin:0 0 12px;">Hi ${escapeHtml(customerName)},</p>
          <p style="margin:0 0 12px;">Thanks for reaching out. We received your quote request and our team will review the details, vehicle information, and uploaded files.</p>
          <p style="margin:0;">Someone will follow up shortly with next steps.</p>
        </div>

        ${section('Your Request Summary', customerSummary)}

        <div style="margin-top:20px;padding:18px;border-radius:12px;background:#ecfdf5;border:1px solid #bbf7d0;">
          <p style="margin:0;color:#065f46;"><strong>What happens next:</strong> Please check your email to confirm your details. A team member will review your request and contact you with the next step.</p>
        </div>

        <p style="margin:20px 0 0;color:#475569;font-size:14px;">Thank you for choosing SlapWrapz by Blue Woods Brands.</p>
      </div>
    </div>
  `;

  const customerInfo = detailRows([
    ['Name', contactInfo?.name],
    ['Email', contactInfo?.email],
    ['Phone', contactInfo?.phone],
    ['Preferred Contact', contactInfo?.preferredContact]
  ]);

  const vehicleInfo = detailRows([
    ['Vehicle', vehicle.mainVehicle],
    ['Year', vehicle.manualVehicleDescription && !vehicle.dropdownVehicle ? '' : vehicle.year],
    ['Make', vehicle.manualVehicleDescription && !vehicle.dropdownVehicle ? '' : vehicle.make],
    ['Model', vehicle.manualVehicleDescription && !vehicle.dropdownVehicle ? '' : vehicle.model],
    ['Vehicle Type', quoteDetails.vehicleType],
    ['Manual Vehicle Description', vehicle.manualVehicleDescription],
    ['Other Vehicle Description', quoteDetails.otherVehicleDescription],
    ['Custom Vehicle Description', quoteDetails.customVehicleDescription]
  ]);

  const projectDetails = detailRows([
    ['Quote ID', quoteDetails.quoteId],
    ['Quote Type', quoteDetails.quoteType],
    ['Selected Service', quoteDetails.selectedService],
    ['Partial Wrap Type', quoteDetails.partialWrapType],
    ['Partial Wrap Description', quoteDetails.partialWrapDescription],
    ['Design Complexity', quoteDetails.designComplexity]
  ]);

  const budgetGoals = detailRows([
    ['Project Goal', quoteDetails.goal],
    ['Budget', quoteDetails.budget],
    ['Has Artwork', quoteDetails.hasArtwork],
    ['Uploaded File Count', quoteDetails.uploadedFileCount]
  ]);

  const businessHtml = `
    <div style="margin:0;background:#f8fafc;padding:24px;font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <div style="max-width:760px;margin:0 auto;">
        <div style="padding:24px;border-radius:16px;background:#111827;color:#ffffff;">
          <h1 style="margin:0;font-size:24px;">New SlapWrapz quote request</h1>
          <p style="margin:8px 0 0;color:#d1d5db;">A new quote request was submitted through SlapWrapz.</p>
        </div>

        ${section('Customer Info', customerInfo)}
        ${section('Vehicle Info', vehicleInfo)}
        ${section('Project Details', projectDetails)}
        ${section('Budget / Goals', budgetGoals)}
        ${section('Uploaded Files', uploadedFileList(uploadedFiles))}
      </div>
    </div>
  `;

  try {
    await Promise.all([
      sendEmail(apiKey, {
        from: FROM_EMAIL,
        to: customerEmail,
        subject: 'We received your wrap quote request',
        html: customerHtml,
        text: `Hi ${customerName}, we received your wrap quote request.${manualVehicleText} Check your email to confirm your details. A team member will review your request and contact you with the next step.`
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