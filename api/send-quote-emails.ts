import { request } from 'node:https';

const RESEND_API_URL = new URL('https://api.resend.com/emails');
const FROM_EMAIL = 'SlapWrapz <quotes@slapwrapz.com>';
const BUSINESS_LEAD_EMAIL = 'quotes@slapwrapz.com';

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
  jarrel: {
    name: 'Jarrel',
    email: 'flukerjarrel@gmail.com'
  },
  adam: {
    name: 'Adam Callaway',
    email: 'acallaway@mail.com'
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

const getEmailDomain = (value: unknown) => {
  const email = Array.isArray(value) ? String(value[0] || '') : String(value || '');
  return email.includes('@') ? email.split('@').pop() || 'unknown' : 'unknown';
};

const getStringValue = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const getObjectValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const getQuoteData = (quoteDetails: Record<string, unknown> = {}) =>
  getObjectValue(quoteDetails.quote_data);

const getBannerDetails = (quoteDetails: Record<string, unknown> = {}) => {
  const quoteData = getQuoteData(quoteDetails);
  return getObjectValue(quoteDetails.banner || quoteData.banner);
};

const isBannerQuote = (quoteDetails: Record<string, unknown> = {}) => {
  const quoteData = getQuoteData(quoteDetails);
  const productType = (
    getStringValue(quoteDetails.product_type) ||
    getStringValue(quoteDetails.productType) ||
    getStringValue(quoteData.product_type) ||
    getStringValue(quoteData.productType)
  ).toLowerCase();

  return productType === 'banner' || Object.keys(getBannerDetails(quoteDetails)).length > 0;
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

const getBannerDetailRows = (
  quoteDetails: Record<string, unknown> = {},
  uploadedFileCount?: number
) => {
  const banner = getBannerDetails(quoteDetails);

  return detailRows([
    ['Width', banner.width],
    ['Height', banner.height],
    ['Unit', banner.unit],
    ['Quantity', banner.quantity],
    ['Indoor / Outdoor', banner.indoorOutdoor],
    ['Sides', banner.sides],
    ['Grommets', banner.grommets],
    ['Hemmed Edges', banner.hemmedEdges],
    ['Pole Pockets', banner.polePockets],
    ['Material Preference', banner.materialPreference],
    ['Design Needed', banner.designNeeded],
    ['AI Design Prompt', banner.aiDesignPrompt],
    ['Saved Design Preview', banner.aiDesignPreviewSaved],
    ['Banner Text', banner.bannerText],
    ['Brand Colors', banner.brandColors],
    ['Building / Placement Notes', banner.placementNotes],
    ['Deadline', banner.deadline],
    ['Delivery Method', banner.deliveryMethod],
    ['Notes', banner.notes],
    ['Uploaded File Count', quoteDetails.uploadedFileCount ?? uploadedFileCount]
  ]);
};

const getBannerDetailText = (
  quoteDetails: Record<string, unknown> = {},
  uploadedFileCount?: number
) => {
  const banner = getBannerDetails(quoteDetails);

  return [
    ['Width', banner.width],
    ['Height', banner.height],
    ['Unit', banner.unit],
    ['Quantity', banner.quantity],
    ['Indoor / Outdoor', banner.indoorOutdoor],
    ['Sides', banner.sides],
    ['Grommets', banner.grommets],
    ['Hemmed Edges', banner.hemmedEdges],
    ['Pole Pockets', banner.polePockets],
    ['Material Preference', banner.materialPreference],
    ['Design Needed', banner.designNeeded],
    ['AI Design Prompt', banner.aiDesignPrompt],
    ['Saved Design Preview', banner.aiDesignPreviewSaved],
    ['Banner Text', banner.bannerText],
    ['Brand Colors', banner.brandColors],
    ['Building / Placement Notes', banner.placementNotes],
    ['Deadline', banner.deadline],
    ['Delivery Method', banner.deliveryMethod],
    ['Notes', banner.notes],
    ['Uploaded File Count', quoteDetails.uploadedFileCount ?? uploadedFileCount]
  ]
    .map(([label, value]) => [label, formatSimpleValue(value)] as [string, string])
    .filter(([, value]) => value.trim().length > 0)
    .map(([label, value]) => `${label}: ${value}`);
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

const sendEmail = async (apiKey: string, label: string, payload: Record<string, unknown>) => {
  if (RESEND_API_URL.protocol !== 'https:') {
    throw new Error(`Invalid Resend API URL protocol: ${RESEND_API_URL.protocol}`);
  }

  const body = JSON.stringify(payload);
  // TODO: Remove temporary email debug logs after local Resend delivery is confirmed.
  console.log(`${label} email send start:`, {
    toDomain: getEmailDomain(payload.to),
    ccDomain: getEmailDomain(payload.cc),
    subject: payload.subject
  });

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
          console.log(`${label} email Resend response status:`, statusCode);
          console.log(`${label} email Resend response body:`, responseBody || 'No response body');

          if (statusCode < 200 || statusCode >= 300) {
            console.error(`${label} email Resend error body:`, responseBody || 'No response body');
            reject(new Error(`${label} Resend email failed: ${statusCode} ${responseBody}`));
            return;
          }

          console.log(`${label} email send result: accepted by Resend`);
          resolve();
        });
      }
    );

    resendRequest.on('error', reject);
    resendRequest.write(body);
    resendRequest.end();
  });
};

const parseBody = (body: unknown): QuoteEmailRequest => {
  if (typeof body === 'string') {
    return JSON.parse(body) as QuoteEmailRequest;
  }

  return (body ?? {}) as QuoteEmailRequest;
};

type EmailLabel = 'customer' | 'business' | 'sales rep';

const sendLoggedEmail = async (apiKey: string, label: EmailLabel, payload: Record<string, unknown>) => {
  console.log(`${label} email attempt started:`, {
    toDomain: getEmailDomain(payload.to),
    ccDomain: getEmailDomain(payload.cc),
    subject: payload.subject
  });

  try {
    await sendEmail(apiKey, label, payload);
    console.log(`${label} email result: sent`);
  } catch (error) {
    console.error(`${label} email error:`, error instanceof Error ? error.message : error);
    throw error;
  }
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  // TODO: Remove temporary email debug logs after local Resend delivery is confirmed.
  console.log('RESEND_API_KEY present:', apiKey ? 'yes' : 'no');
  if (!apiKey) {
    console.error('RESEND_API_KEY missing.');
    return res.status(500).json({ error: 'Missing RESEND_API_KEY' });
  }

  const { contactInfo, quoteDetails = {}, uploadedFiles = [] } = parseBody(req.body);
  const customerEmail = contactInfo?.email?.trim();
  // TODO: Remove temporary email debug logs after local Resend delivery is confirmed.
  console.log('Customer email for quote email:', customerEmail || 'missing');

  if (!customerEmail) {
    return res.status(400).json({ error: 'Missing customer email' });
  }

  const customerName = contactInfo?.name || 'there';
  const repSlug = (
    getStringValue(quoteDetails.repSlug) ||
    getStringValue(quoteDetails.rep_slug)
  ).toLowerCase();
  const receivedRepEmail = getStringValue(quoteDetails.repEmail) || getStringValue(quoteDetails.rep_email);
  const receivedRepName = getStringValue(quoteDetails.assignedRepName) || getStringValue(quoteDetails.assigned_rep_name);
  const matchedRep = repSlug ? SALES_REPS[repSlug] : undefined;
  const assignedRep = matchedRep || (
    receivedRepEmail
      ? {
          name: receivedRepName || 'Assigned Sales Rep',
          email: receivedRepEmail
        }
      : undefined
  );

  console.log('Received rep fields:', {
    repSlug: repSlug || 'none',
    repEmailDomain: receivedRepEmail ? getEmailDomain(receivedRepEmail) : 'none',
    assignedRepName: receivedRepName || 'none'
  });

  // TODO: Remove temporary email debug logs after local rep attribution is confirmed.
  console.log('Sales rep attribution:', {
    repSlug: repSlug || 'none',
    matchedRepKey: matchedRep ? repSlug : 'none',
    matched: assignedRep ? 'yes' : 'no',
    selectedRepEmailDomain: assignedRep ? getEmailDomain(assignedRep.email) : 'none',
    repEmailTarget: assignedRep?.email || 'none'
  });

  const vehicle = getVehicle(quoteDetails);
  const manualVehicleDescription = getManualVehicleDescription(quoteDetails);
  const manualVehicleText = manualVehicleDescription
    ? ` Vehicle note: ${manualVehicleDescription}.`
    : '';
  const isBannerRequest = isBannerQuote(quoteDetails);
  const uploadedFileCount = uploadedFiles.length || Number(quoteDetails.uploadedFileCount) || 0;
  const bannerDetails = getBannerDetailRows(quoteDetails, uploadedFileCount);
  const bannerDetailText = getBannerDetailText(quoteDetails, uploadedFileCount);

  const customerSummary = isBannerRequest
    ? bannerDetails
    : detailRows([
        ['Selected Service', quoteDetails.selectedService],
        ['Vehicle', vehicle.mainVehicle],
        ['Manual Vehicle Description', vehicle.dropdownVehicle ? manualVehicleDescription : ''],
        ['Project Goal', quoteDetails.goal],
        ['Budget', quoteDetails.budget],
        ['Uploaded File Count', quoteDetails.uploadedFileCount]
      ]);

  const customerHtml = isBannerRequest
    ? `
      <div style="margin:0;background:#f8fafc;padding:24px;font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
        <div style="max-width:680px;margin:0 auto;">
          <div style="padding:24px;border-radius:16px;background:#0f4fa8;color:#ffffff;">
            <h1 style="margin:0;font-size:26px;">Blue Woods Brands</h1>
            <p style="margin:8px 0 0;font-size:16px;">We received your banner quote request.</p>
          </div>

          <div style="margin-top:18px;padding:22px;border:1px solid #e5e7eb;border-radius:14px;background:#ffffff;">
            <p style="margin:0 0 12px;">Hi ${escapeHtml(customerName)},</p>
            <p style="margin:0 0 12px;">Thanks for reaching out. Blue Woods Brands received your banner quote request and our team will review the size, quantity, artwork/files, deadline, and design needs.</p>
            <p style="margin:0;">If we need more information, we may send a customer action request or a secure upload link so we can keep your project moving.</p>
          </div>

          ${section('Your Banner Request Summary', customerSummary)}

          <div style="margin-top:20px;padding:18px;border-radius:12px;background:#ecfdf5;border:1px solid #bbf7d0;">
            <p style="margin:0;color:#065f46;"><strong>What happens next:</strong> A team member will review your banner details and follow up with the next step.</p>
          </div>

          <p style="margin:20px 0 0;color:#475569;font-size:14px;">Thank you for choosing Blue Woods Brands for your printed brand experience.</p>
        </div>
      </div>
    `
    : `
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
    ['Sales Rep', assignedRep?.name],
    ['Rep Slug', repSlug],
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

  const businessHtml = isBannerRequest ? `
    <div style="margin:0;background:#f8fafc;padding:24px;font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <div style="max-width:760px;margin:0 auto;">
        <div style="padding:24px;border-radius:16px;background:#111827;color:#ffffff;">
          <h1 style="margin:0;font-size:24px;">New Banner Quote Request</h1>
          <p style="margin:8px 0 0;color:#d1d5db;">A new banner quote request was submitted through Blue Woods Brands.</p>
        </div>

        ${section('Customer Info', customerInfo)}
        ${section('Banner Details', bannerDetails)}
        ${section('Uploaded Files', uploadedFileList(uploadedFiles))}
      </div>
    </div>
  ` : `
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

  const repLeadSummary = isBannerRequest
    ? detailRows([
        ['Quote ID', quoteDetails.quoteId],
        ['Customer Name', contactInfo?.name],
        ['Customer Email', contactInfo?.email],
        ['Customer Phone', contactInfo?.phone],
        ['Request Type', 'Banner Quote']
      ])
    : detailRows([
        ['Quote ID', quoteDetails.quoteId],
        ['Customer Name', contactInfo?.name],
        ['Customer Email', contactInfo?.email],
        ['Customer Phone', contactInfo?.phone],
        ['Vehicle', vehicle.mainVehicle],
        ['Selected Service', quoteDetails.selectedService],
        ['Budget', quoteDetails.budget]
      ]);

  const repHtml = assignedRep ? `
    <div style="margin:0;background:#f8fafc;padding:24px;font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <div style="max-width:720px;margin:0 auto;">
        <div style="padding:24px;border-radius:16px;background:#0f172a;color:#ffffff;">
          <h1 style="margin:0;font-size:24px;">${isBannerRequest ? 'New Banner Quote Request Assigned to You' : 'New SlapWrapz lead assigned to you'}</h1>
          <p style="margin:8px 0 0;color:#d1d5db;">This quote was submitted with your sales rep link.</p>
        </div>

        <div style="margin-top:18px;padding:22px;border:1px solid #e5e7eb;border-radius:14px;background:#ffffff;">
          <p style="margin:0 0 12px;">Hi ${escapeHtml(assignedRep.name)},</p>
          <p style="margin:0;">${isBannerRequest ? 'A new banner quote request was assigned to you. Customer and banner details are below.' : 'A new SlapWrapz quote request was assigned to you. Customer and project details are below.'}</p>
        </div>

        ${section('Lead Details', repLeadSummary)}
        ${isBannerRequest ? section('Banner Details', bannerDetails) : ''}
      </div>
    </div>
  ` : '';

  try {
    console.log('Business lead email routing:', {
      toDomain: getEmailDomain(BUSINESS_LEAD_EMAIL),
      ccDomain: 'none'
    });
    console.log('Sales rep lead email routing:', {
      sendRepEmail: assignedRep ? 'yes' : 'no',
      toDomain: assignedRep ? getEmailDomain(assignedRep.email) : 'none',
      target: assignedRep?.email || 'none'
    });
    const emailJobs: Array<{ label: EmailLabel; job: Promise<void> }> = [
      {
        label: 'business',
        job: sendLoggedEmail(apiKey, 'business', {
          from: FROM_EMAIL,
          to: BUSINESS_LEAD_EMAIL,
          subject: isBannerRequest ? 'New Banner Quote Request' : 'New SlapWrapz quote request',
          html: businessHtml,
          text: isBannerRequest
            ? [
                `New Banner Quote Request from ${contactInfo?.name || 'Unknown'} (${customerEmail}), phone ${contactInfo?.phone || 'not provided'}.`,
                ...bannerDetailText
              ].join('\n')
            : `New SlapWrapz quote request from ${contactInfo?.name || 'Unknown'} (${customerEmail}), phone ${contactInfo?.phone || 'not provided'}.${manualVehicleText}`
        })
      },
      {
        label: 'customer',
        job: sendLoggedEmail(apiKey, 'customer', {
          from: FROM_EMAIL,
          to: customerEmail,
          subject: isBannerRequest ? 'We received your banner quote request' : 'We received your wrap quote request',
          html: customerHtml,
          text: isBannerRequest
            ? `Hi ${customerName}, Blue Woods Brands received your banner quote request. Our team will review the banner size, quantity, artwork/files, deadline, and design needs. If we need more information, we may send a customer action request or secure upload link. A team member will follow up with the next step.`
            : `Hi ${customerName}, we received your wrap quote request.${manualVehicleText} Check your email to confirm your details. A team member will review your request and contact you with the next step.`
        })
      }
    ];

    if (assignedRep) {
      emailJobs.push({
        label: 'sales rep',
        job: sendLoggedEmail(apiKey, 'sales rep', {
          from: FROM_EMAIL,
          to: assignedRep.email,
          subject: isBannerRequest ? 'New Banner Quote Request assigned to you' : 'New SlapWrapz lead assigned to you',
          html: repHtml,
          text: isBannerRequest
            ? [
                'New Banner Quote Request assigned to you.',
                `Quote ID: ${formatSimpleValue(quoteDetails.quoteId) || 'not provided'}`,
                `Customer: ${formatSimpleValue(contactInfo?.name) || 'not provided'}`,
                `Email: ${customerEmail}`,
                `Phone: ${formatSimpleValue(contactInfo?.phone) || 'not provided'}`,
                ...bannerDetailText
              ].join('\n')
            : [
                'New SlapWrapz lead assigned to you.',
                `Quote ID: ${formatSimpleValue(quoteDetails.quoteId) || 'not provided'}`,
                `Customer: ${formatSimpleValue(contactInfo?.name) || 'not provided'}`,
                `Email: ${customerEmail}`,
                `Phone: ${formatSimpleValue(contactInfo?.phone) || 'not provided'}`,
                `Vehicle: ${vehicle.mainVehicle || 'not provided'}`,
                `Service: ${formatSimpleValue(quoteDetails.selectedService) || 'not provided'}`,
                `Budget: ${formatSimpleValue(quoteDetails.budget) || 'not provided'}`
              ].join('\n')
        })
      });
    }

    const emailResults = await Promise.allSettled(emailJobs.map(({ job }) => job));

    const failedEmails = emailResults
      .map((result, index) => ({ result, label: emailJobs[index].label }))
      .filter(({ result }) => result.status === 'rejected');

    if (failedEmails.length > 0) {
      console.error('Quote email send failed:', {
        failedEmails: failedEmails.map(({ label }) => label)
      });
      return res.status(502).json({
        error: 'Email send failed',
        failedEmails: failedEmails.map(({ label }) => label)
      });
    }

    console.log('Quote email send completed:', {
      sentEmails: emailJobs.map(({ label }) => label)
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(502).json({ error: 'Email send failed' });
  }
}
