interface ApiRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  send: (body: Buffer | string) => void;
}

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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');
  const rawUrl = req.query?.url;
  const rawName = req.query?.name;
  const fileUrl = (Array.isArray(rawUrl) ? rawUrl[0] : rawUrl || '').trim();
  const requestedName = (Array.isArray(rawName) ? rawName[0] : rawName || 'SlapWrapz-Proposal.pdf').trim();
  const fileName = requestedName.replace(/[^a-zA-Z0-9._ -]/g, '-');

  if (!fileUrl || !isAllowedPdfUrl(fileUrl) || !fileName.toLowerCase().endsWith('.pdf')) {
    return res.status(400).send('Invalid PDF');
  }

  try {
    const source = await fetch(fileUrl, { redirect: 'follow' });
    if (!source.ok) return res.status(502).send('PDF unavailable');
    const bytes = Buffer.from(await source.arrayBuffer());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.status(200).send(bytes);
  } catch {
    return res.status(502).send('PDF unavailable');
  }
}
