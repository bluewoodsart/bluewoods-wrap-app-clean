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

interface MeetingFollowUpBody {
  repEmail?: string | null;
  repName?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  quoteId?: string | null;
  projectName?: string | null;
  meetingNotes?: string | null;
  nextStep?: string | null;
  dueDate?: string | null;
}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const parseBody = (body: unknown): MeetingFollowUpBody => {
  if (typeof body === 'string') {
    return JSON.parse(body) as MeetingFollowUpBody;
  }

  return (body ?? {}) as MeetingFollowUpBody;
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const formatDueDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
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
            reject(new Error(`Meeting follow-up email failed: ${statusCode} ${responseBody}`));
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
  const repEmail = String(body.repEmail ?? '').trim().toLowerCase();
  const repName = String(body.repName ?? '').trim() || 'SlapWrapz Rep';
  const customerEmail = String(body.customerEmail ?? '').trim().toLowerCase();
  const customerName = String(body.customerName ?? '').trim() || 'Customer';
  const quoteId = String(body.quoteId ?? '').trim() || 'Quote';
  const projectName = String(body.projectName ?? '').trim() || 'SlapWrapz project';
  const meetingNotes = String(body.meetingNotes ?? '').trim();
  const nextStep = String(body.nextStep ?? '').trim();
  const dueDate = String(body.dueDate ?? '').trim();

  if (!isValidEmail(repEmail)) {
    return res.status(400).json({ error: 'Rep email is missing or invalid.' });
  }

  if (!isValidEmail(customerEmail)) {
    return res.status(400).json({ error: 'Customer email is missing or invalid.' });
  }

  if (meetingNotes.length < 8 || nextStep.length < 3 || !dueDate) {
    return res.status(400).json({ error: 'Meeting notes, next step, and due date are required.' });
  }

  const safeRepName = escapeHtml(repName);
  const safeCustomerName = escapeHtml(customerName);
  const safeQuoteId = escapeHtml(quoteId);
  const safeProjectName = escapeHtml(projectName);
  const safeMeetingNotes = escapeHtml(meetingNotes).replace(/\n/g, '<br />');
  const safeNextStep = escapeHtml(nextStep);
  const safeDueDate = escapeHtml(formatDueDate(dueDate));

  const customerSubject = `Your SlapWrapz next step is scheduled`;
  const repSubject = `Follow-up scheduled: ${customerName} / ${quoteId}`;

  const customerText = `Hi ${customerName},

Your SlapWrapz next step has been scheduled.

Project: ${projectName}
Quote: ${quoteId}
Next step: ${nextStep}
Due date: ${formatDueDate(dueDate)}

Meeting notes:
${meetingNotes}

${repName} and the BWB team will keep this moving.`;

  const repText = `Follow-up scheduled.

Customer: ${customerName}
Project: ${projectName}
Quote: ${quoteId}
Next step: ${nextStep}
Due date: ${formatDueDate(dueDate)}

Meeting notes:
${meetingNotes}

Look at your timeline and push this to completion.`;

  const sharedHtml = `
    <div style="margin:0;background:#f8fafc;padding:24px;font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <div style="max-width:680px;margin:0 auto;">
        <div style="padding:24px;border-radius:16px;background:#111827;color:#ffffff;">
          <p style="margin:0 0 8px;color:#93c5fd;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">SlapWrapz Follow-Up Scheduled</p>
          <h1 style="margin:0;font-size:25px;">The next step is on the calendar.</h1>
          <p style="margin:10px 0 0;color:#d1d5db;">If it is scheduled, it can be completed.</p>
        </div>

        <div style="margin-top:18px;padding:22px;border:1px solid #e5e7eb;border-radius:14px;background:#ffffff;">
          <p style="margin:0 0 14px;">Customer: <strong>${safeCustomerName}</strong></p>
          <p style="margin:0 0 14px;">Project: <strong>${safeProjectName}</strong></p>
          <p style="margin:0 0 14px;">Quote: <strong>${safeQuoteId}</strong></p>
          <div style="margin-top:16px;padding:16px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;">
            <p style="margin:0 0 8px;color:#1d4ed8;font-size:13px;font-weight:700;text-transform:uppercase;">Next Step</p>
            <p style="margin:0;font-size:18px;font-weight:700;">${safeNextStep}</p>
            <p style="margin:8px 0 0;color:#334155;">Due ${safeDueDate}</p>
          </div>
          <div style="margin-top:16px;padding:16px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;">
            <p style="margin:0 0 8px;color:#475569;font-size:13px;font-weight:700;text-transform:uppercase;">Meeting Notes</p>
            <p style="margin:0;color:#0f172a;">${safeMeetingNotes}</p>
          </div>
          <p style="margin:16px 0 0;color:#475569;">Rep: ${safeRepName}</p>
        </div>
      </div>
    </div>
  `;

  try {
    await Promise.all([
      sendEmail(apiKey, {
        from: FROM_EMAIL,
        to: customerEmail,
        subject: customerSubject,
        html: sharedHtml,
        text: customerText
      }),
      sendEmail(apiKey, {
        from: FROM_EMAIL,
        to: repEmail,
        subject: repSubject,
        html: sharedHtml,
        text: repText
      })
    ]);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('meeting follow-up email error:', error instanceof Error ? error.message : error);
    return res.status(502).json({ error: 'Meeting follow-up email failed.' });
  }
}
