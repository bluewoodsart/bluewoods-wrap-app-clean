# Sticker readiness draft — 2026-10-26

Base: `27c8686cb4007cf65aff1d9488fa5f12e4a5e7db` (`main`). This is a draft review change, **not approval to launch or fulfill orders**.

## Changes

- Separate reserved, not-reserved, and uncertain preview attempts from API billing; clarify moderation/service failures and retained previous artwork.
- Lock approval, generation and checkout while an upload decodes; lock generation and checkout against each other, reset approval on image changes, and synchronize the cart preview.
- Validate complete 1200 × 1200 canvas PNG structure, CRCs and bounded pixel decompression.
- Recover immutable artwork uploads and checkout-session binding without deleting draft orders or overwriting artwork; retain stable Stripe idempotency.
- Make test checkout and test artwork downloads unmistakable. Test artwork remains downloadable for verification, with a TEST filename and do-not-print warning.

## Verification

Node 24.22.1; dependencies installed from the lockfile.

- `npm run test:stickers`: PASS (generator, checkout, PNG/recovery, full mocked handler, offline DOM).
- `npm run build`: PASS.
- `git diff --check`: PASS.
- `npm run lint`: FAIL, the same baseline 21 errors and 20 warnings. No new diagnostic classes; existing sticker `any` diagnostics only shifted line numbers.
- `npx tsc --noEmit -p tsconfig.app.json`: FAIL with the same 15 baseline errors in unrelated application files. This draft does not claim a clean repository-wide typecheck.

The full handler test covers interrupted upload, failed session save and retries, immutable PNG bytes, stable session idempotency key, server-calculated mail pricing, token denial, signed TEST payment/shipping, replay and status. All database, storage and payment requests are mocked. Offline DOM tests cover repeated clicks, pending/failed upload decoding, generation/checkout exclusion, old-image messaging, approval reset, totals, retry identity, expired drafts, thumbnail sync and test-mode copy. Image decode and canvas are mocked.

Chromium browser verification was **not run**: the available runtime blocked browser socket creation, and the one escalation attempt failed before launching. Offline DOM coverage is not a substitute for real browser rendering, image decoding, or a Stripe end-to-end test.

## Still required before launch

Follow `STICKER_CHECKOUT_SETUP.md` with separately authorized test credentials: real Stripe test checkout, exact artwork download, shipping, webhook retries, cancelled checkout, invalid signatures and unauthorized access. Confirm tax, postage, fulfillment and operational cleanup. No paid image generation, payment credential configuration, production database changes or real payments were performed for this draft. Do not merge or enable live checkout on the strength of mocked tests alone.
