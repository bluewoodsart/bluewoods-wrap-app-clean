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

interface RepOnboardingBody {
  repSlug?: string | null;
  repName?: string | null;
  repEmail?: string | null;
}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const parseBody = (body: unknown): RepOnboardingBody => {
  if (typeof body === 'string') {
    return JSON.parse(body) as RepOnboardingBody;
  }

  return (body ?? {}) as RepOnboardingBody;
};

const normalizeSlug = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

const isValidRepSlug = (value: string) => /^[a-z0-9-]{1,64}$/.test(value);
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const buildChatGptPrompt = (repName: string, repSlug: string) => `I am working with Blue Woods Brands / SlapWrapz to build my custom rep cover page at www.slapwrapz.com/${repSlug}.

The page should say SlapWrapz first. I am the rep path behind the customer follow-up, not a separate wrap brand.

The page should mix my own taste, passions, personality, and audience with vehicle wraps, banners, business visibility, and real results.

Act like a creative director. Ask me up to 10 quick questions about:
- my personal style and interests
- colors, music, sports, cars, business, culture, or visuals I like
- what kind of customers I want to attract
- the energy I want the page to have
- what I do not want the page to look or sound like

After I answer, turn my answers into a clean creative brief for ${repName} with:
1. overall vibe
2. color direction
3. image/background ideas
4. headline ideas that still keep SlapWrapz as the brand
5. short page copy
6. words or themes to avoid
7. the kind of lead/customer this page should attract
8. anything Blue Woods Brands should know before updating my page`;

const buildPlainText = (repName: string, repSlug: string, chatGptPrompt: string) => `Hi ${repName},

During the exciting onboarding process of BWB Brands, we go straight to the results.

Your starter rep page is live at www.slapwrapz.com/${repSlug}. Now we want the cover page to feel more like you, while keeping SlapWrapz as the customer-facing brand.

Here is what we need you to do:

1. Log into your rep portal at www.slapwrapz.com/rep.
2. Find the Prompt Your Cover Page section.
3. Write your idea there, or paste the AI prompt below into ChatGPT, Claude, Gemini, or another AI tool first.
4. Paste the final creative brief into your rep portal and press Send Page Idea.

BWB will review your direction before anything changes live. Once approved, Codex can use it to recommend the front-end update for your SlapWrapz rep page.

AI PROMPT

${chatGptPrompt}

You can also reply to this email with the final creative brief if that is easier.`;

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
            reject(new Error(`Rep onboarding email failed: ${statusCode} ${responseBody}`));
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
  const repSlug = normalizeSlug(body.repSlug);
  const repName = String(body.repName ?? '').trim() || repSlug || 'Rep';
  const repEmail = String(body.repEmail ?? '').trim().toLowerCase();

  if (!isValidRepSlug(repSlug)) {
    return res.status(400).json({ error: 'Invalid rep onboarding request' });
  }

  if (!isValidEmail(repEmail)) {
    return res.status(400).json({ error: 'Selected rep is missing a valid email' });
  }

  const chatGptPrompt = buildChatGptPrompt(repName, repSlug);
  const plainText = buildPlainText(repName, repSlug, chatGptPrompt);
  const htmlPrompt = escapeHtml(chatGptPrompt).replace(/\n/g, '<br />');
  const safeRepName = escapeHtml(repName);
  const safeRepSlug = escapeHtml(repSlug);
  const subject = `${repName} cover page direction for BWB Brands onboarding`;
  const html = `
    <div style="margin:0;background:#f8fafc;padding:24px;font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <div style="max-width:680px;margin:0 auto;">
        <div style="padding:24px;border-radius:16px;background:#111827;color:#ffffff;">
          <p style="margin:0 0 8px;color:#93c5fd;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">BWB Brands Onboarding</p>
          <h1 style="margin:0;font-size:25px;">${safeRepName}, let's shape your SlapWrapz page.</h1>
          <p style="margin:10px 0 0;color:#d1d5db;">We go straight to the results, then review your direction before any live page update.</p>
        </div>

        <div style="margin-top:18px;padding:22px;border:1px solid #e5e7eb;border-radius:14px;background:#ffffff;">
          <p style="margin:0 0 14px;">Hi ${safeRepName},</p>
          <p style="margin:0 0 14px;">During the exciting onboarding process of BWB Brands, we go straight to the results.</p>
          <p style="margin:0 0 14px;">Your starter rep page is live at <a href="https://www.slapwrapz.com/${safeRepSlug}" style="color:#2563eb;font-weight:700;">www.slapwrapz.com/${safeRepSlug}</a>. Now we want the cover page to feel more like you, while keeping SlapWrapz as the customer-facing brand.</p>
          <p style="margin:0 0 10px;font-weight:700;">Here is what we need you to do:</p>
          <ol style="margin:0 0 18px;padding-left:20px;">
            <li>Log into your rep portal at <a href="https://www.slapwrapz.com/rep" style="color:#2563eb;font-weight:700;">www.slapwrapz.com/rep</a>.</li>
            <li>Find the <strong>Prompt Your Cover Page</strong> section.</li>
            <li>Write your idea there, or paste the AI prompt below into ChatGPT, Claude, Gemini, or another AI tool first.</li>
            <li>Paste the final creative brief into your rep portal and press <strong>Send Page Idea</strong>.</li>
          </ol>
          <p style="margin:0;">BWB will review your direction before anything changes live. Once approved, Codex can use it to recommend the front-end update for your SlapWrapz rep page.</p>
        </div>

        <div style="margin-top:18px;padding:22px;border:1px solid #dbeafe;border-radius:14px;background:#eff6ff;">
          <p style="margin:0 0 12px;color:#1d4ed8;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">AI Prompt</p>
          <div style="white-space:normal;padding:16px;border-radius:12px;background:#ffffff;border:1px solid #bfdbfe;color:#0f172a;font-size:14px;">${htmlPrompt}</div>
        </div>
      </div>
    </div>
  `;

  try {
    await sendEmail(apiKey, {
      from: FROM_EMAIL,
      to: repEmail,
      subject,
      html,
      text: plainText
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('rep onboarding email error:', error instanceof Error ? error.message : error);
    return res.status(502).json({ error: 'Rep onboarding email failed' });
  }
}
