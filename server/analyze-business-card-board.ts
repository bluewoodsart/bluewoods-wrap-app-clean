import { createClient } from '@supabase/supabase-js';

const leadSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    leads: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          business_name: { type: ['string', 'null'] }, contact_name: { type: ['string', 'null'] },
          phone: { type: ['string', 'null'] }, email: { type: ['string', 'null'] },
          website: { type: ['string', 'null'] }, business_category: { type: ['string', 'null'] },
          product_summary: { type: ['string', 'null'] },
          social_profiles: {
            type: 'object', additionalProperties: false,
            properties: {
              facebook: { type: ['string', 'null'] }, instagram: { type: ['string', 'null'] },
              tiktok: { type: ['string', 'null'] }, linkedin: { type: ['string', 'null'] },
              youtube: { type: ['string', 'null'] }, x: { type: ['string', 'null'] },
              other: { type: ['string', 'null'] }
            },
            required: ['facebook', 'instagram', 'tiktok', 'linkedin', 'youtube', 'x', 'other']
          },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          review_notes: { type: 'string' }
        },
        required: ['business_name', 'contact_name', 'phone', 'email', 'website', 'business_category', 'product_summary', 'social_profiles', 'confidence', 'review_notes']
      }
    }
  },
  required: ['leads']
};

export async function analyzeBusinessCardBoard(req: any, res: any) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const directOpenAiKey = process.env.OPENAI_API_KEY;
  const gatewayToken = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Server database configuration is missing.' });
  if (!directOpenAiKey && !gatewayToken) return res.status(503).json({ error: 'AI analysis authentication is unavailable.' });

  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!bearer) return res.status(401).json({ error: 'Sign in as a BWB administrator.' });
  const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: `Bearer ${bearer}` } } });
  const { data: { user }, error: userError } = await supabase.auth.getUser(bearer);
  if (userError || !user) return res.status(401).json({ error: 'Your session could not be verified.' });
  const { data: admin } = await supabase.from('admin_users').select('id, role, is_active').eq('auth_user_id', user.id).maybeSingle();
  if (!admin?.is_active || !['owner_admin', 'staff'].includes(admin.role)) return res.status(403).json({ error: 'Active BWB admin access is required.' });

  const imageUrl = typeof req.body?.imageUrl === 'string' ? req.body.imageUrl : '';
  if (!imageUrl.startsWith('https://')) return res.status(400).json({ error: 'A secure signed image URL is required.' });

  const response = await fetch(gatewayToken ? 'https://ai-gateway.vercel.sh/v1/responses' : 'https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${gatewayToken || directOpenAiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: gatewayToken ? 'openai/gpt-5-mini' : 'gpt-5-mini',
      tools: [{ type: 'web_search' }],
      input: [{ role: 'user', content: [
        { type: 'input_text', text: 'Extract every distinct business card visible in this board photo. Create one lead per card. Transcribe only what is legible. Use web search only when business identity is sufficiently specific, and return official profile URLs—not guesses. Never invent phone numbers, emails, names, websites, or social profiles. Use null when uncertain. Put uncertainty and duplicate warnings in review_notes. Confidence must reflect the weakest important identity/contact field.' },
        { type: 'input_image', image_url: imageUrl, detail: 'high' }
      ] }],
      text: { format: { type: 'json_schema', name: 'business_card_board', strict: true, schema: leadSchema } }
    })
  });
  const payload = await response.json();
  if (!response.ok) return res.status(response.status).json({ error: payload?.error?.message || 'The card board could not be analyzed.' });
  const outputText = payload.output_text || payload.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === 'output_text')?.text;
  if (!outputText) return res.status(502).json({ error: 'The analysis returned no structured contacts.' });
  try { return res.status(200).json(JSON.parse(outputText)); }
  catch { return res.status(502).json({ error: 'The analysis response could not be read.' }); }
}
