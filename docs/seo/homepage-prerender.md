# Homepage HTML rendering

`npm run build` now generates `dist/home.html` from the existing `Index` React component using Vite SSR and React's server renderer. Vercel serves it only at `/`; `dist/index.html` remains the generic SPA fallback. The client entry remains unchanged and replaces the initial homepage markup with the full application, preserving routing, attribution, authentication and quote workflows.

The generated page carries the existing homepage title/description/assets, its self-canonical, and the same Organization schema used by RouteSeo. It includes the real homepage portfolio, local copy, FAQs, service links and quote links, not alternate crawler-only text. Do not add home markup/canonical to the generic SPA fallback.

## Checks

- `npm run build`: includes existing prebuild tests and new build-output SEO regression tests.
- `node --test scripts/homepage-seo.test.mjs`: requires a completed build.
- `npm run preview`: mirrors the homepage-only rewrite and existing clean service URL rewrites.
- Confirm `/`, query-string attribution links, quote navigation, Back/Forward, private routes and unknown routes in a browser before publishing.

## Banner URL finding (2026-11-13)

The current main application declares `/banners`, not `/banner`. No `/banner` rewrite is present. Its generic app shell and runtime unknown-route noindex are not evidence that the newer Banner Blitz application is correctly deployed here. The sitemap is intentionally unchanged in this patch. Resolve the intended Banner Blitz deployment and canonical URL before redirecting users or adding an indexable sitemap URL. The existing `/services/custom-banners` static page is unaffected.

This change improves initial HTML availability; it is not evidence of improved Google ranking. Search Console indexing and performance data are still needed.
