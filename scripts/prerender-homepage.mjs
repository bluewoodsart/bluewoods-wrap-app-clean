import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { renderHomepage } = await server.ssrLoadModule('/src/entry-home-seo.tsx');
  const template = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  if (!template.includes('<div id="root"></div>')) throw new Error('Homepage root placeholder missing');
  const origin = 'https://www.slapwrapz.com';
  const schema = {
    '@context': 'https://schema.org', '@type': 'Organization',
    '@id': `${origin}/#organization`, name: 'SlapWrapz', url: origin,
    logo: `${origin}/favicon/favicon1.png`,
    parentOrganization: { '@type': 'Organization', name: 'Blue Woods Brands' },
  };
  const head = `<link rel="canonical" href="${origin}/" />\n<meta property="og:url" content="${origin}/" />\n<script id="slapwrapz-organization" type="application/ld+json">${JSON.stringify(schema)}</script>\n`;
  const html = template.replace('</head>', head + '</head>')
    .replace('<div id="root"></div>', `<div id="root">${renderHomepage()}</div>`);
  // Keep the generic SPA fallback untouched, so private/unknown routes never
  // receive homepage body content or a misleading homepage canonical.
  await writeFile(new URL('../dist/home.html', import.meta.url), html);
  console.log('Rendered homepage HTML with existing content and assets.');
} finally {
  await server.close();
}
