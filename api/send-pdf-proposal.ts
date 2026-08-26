const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'SlapWrapz <quotes@slapwrapz.com>';
const MAX_PDF_BYTES = 12 * 1024 * 1024;

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

interface ApiResponse {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: Record<string, unknown>) => void };
}

interface SendPdfBody {
  customerEmail?: string;
  customerName?: string;
  quoteId?: string;
  fileUrl?: string;
  fileName?: string;
}

const parseBody = (body: unknown): SendPdfBody =>
  typeof body === 'string' ? JSON.parse(body) as SendPdfBody : (body ?? {}) as SendPdfBody;

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const getBearerToken = (headers: ApiRequest['headers']) => {
  const value = headers.authorization;
  const authorization = Array.isArray(value) ? value[0] : value;
  return authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
};

const isAllowedPdfUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (
      url.hostname === 'slapwrapz.com'
      || url.hostname === 'www.slapwrapz.com'
      || url.hostname.endsWith('.supabase.co')
    );
  } catch {
    return false;
  }
};

const authenticateSalesperson = async (accessToken: string) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return false;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` }
  });
  return response.ok;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Email service is not configured' });

  const accessToken = getBearerToken(req.headers);
  if (!accessToken || !await authenticateSalesperson(accessToken)) {
    return res.status(401).json({ error: 'Please sign in again before sending' });
  }

  const { customerEmail, customerName, quoteId, fileUrl, fileName } = parseBody(req.body);
  const to = customerEmail?.trim();
  const pdfUrl = fileUrl?.trim();
  const attachmentName = (fileName?.trim() || 'SlapWrapz-Proposal.pdf').replace(/[^a-zA-Z0-9._ -]/g, '-');
  if (!to || !/^\S+@\S+\.\S+$/.test(to)) return res.status(400).json({ error: 'A valid recipient email is required' });
  if (!pdfUrl || !isAllowedPdfUrl(pdfUrl) || !attachmentName.toLowerCase().endsWith('.pdf')) {
    return res.status(400).json({ error: 'A valid SlapWrapz PDF is required' });
  }

  try {
    const pdfResponse = await fetch(pdfUrl, { redirect: 'follow' });
    if (!pdfResponse.ok) throw new Error(`PDF download failed with ${pdfResponse.status}`);
    const pdfBytes = Buffer.from(await pdfResponse.arrayBuffer());
    if (pdfBytes.length === 0 || pdfBytes.length > MAX_PDF_BYTES) throw new Error('PDF attachment size is invalid');

    const greetingName = customerName?.trim() || 'there';
    const subject = `Your SlapWrapz proposal${quoteId ? ` · ${quoteId}` : ''}`;
    const resendResponse = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html: `<p>Hi ${escapeHtml(greetingName)},</p><p>Your SlapWrapz proposal is attached as a PDF. Please review it and reply to this email with any questions or requested changes.</p><p>Thank you,<br>SlapWrapz by Blue Woods Brands</p>`,
        text: `Hi ${greetingName},\n\nYour SlapWrapz proposal is attached as a PDF. Please review it and reply with any questions or requested changes.\n\nThank you,\nSlapWrapz by Blue Woods Brands`,
        attachments: [{ filename: attachmentName, content: pdfBytes.toString('base64') }]
      })
    });

    if (!resendResponse.ok) throw new Error(`Resend returned ${resendResponse.status}`);
    const result = await resendResponse.json() as { id?: string };
    return res.status(200).json({ ok: true, emailId: result.id || null });
  } catch (error) {
    console.error('PDF proposal email failed:', error instanceof Error ? error.message : error);
    return res.status(502).json({ error: 'The PDF email could not be sent' });
  }
}
