# Sticker checkout activation

Public store: https://www.slapwrapz.com/stickers
Owner order queue: https://www.slapwrapz.com/admin?tab=stickers
Webhook endpoint: https://www.slapwrapz.com/api/sticker-store

The storefront creates an immutable approved 1200 × 1200 circular PNG, saves it privately, and associates a Stripe Checkout Session with its order UUID. Browser return URLs cannot mark an order paid. Signed Stripe events or server retrieval of the matching paid session confirm payment, currency, amount and live/test mode. The owner queue provides expiring artwork downloads and shipping details.

## Secrets (Vercel project settings only)

Add these to the production target of bluewoods-wrap-app-clean. Never use a VITE_ prefix for secrets. Do not paste secrets in chat or in BWB's public Payment Link fields.

- SUPABASE_SERVICE_ROLE_KEY: server-only key for project xggbfpfaxyfqvskmsszi. Existing VITE_SUPABASE_URL is reused.
- STRIPE_SECRET_KEY: start with a Stripe test key (sk_test_...).
- STRIPE_WEBHOOK_SECRET: whsec_... from the test webhook destination above.
- STICKER_STRIPE_MODE: test
- STICKER_CHECKOUT_ENABLED: true only when credentials and webhook are ready to test.

Register checkout.session.completed, checkout.session.async_payment_succeeded and checkout.session.expired. Create a separate live webhook/key before changing STICKER_STRIPE_MODE to live. The live webhook must use event API version 2024-06-20, or a newer version with the documented shipping_details/collected_information fields. Redeploy after environment changes.

## Required acceptance test before live mode

Upload artwork, approve its crop, check mail total $11.11 and pickup total $10. Complete Stripe test checkout. Confirm the order is PAID / TEST in BWB, verify shipping information, and download the exact approved crop. Replay the payment event: it must remain one order. Cancel checkout: no order is marked paid. Send an invalid signature: rejected. Confirm an unrelated signed payment cannot mark a sticker order paid. Verify guest/non-owner access to orders/artwork is denied.

No real payments have been tested or enabled by this implementation. Tax calculation is not configured. Confirm packed postage eligibility before launch. AI remains demo-only. Pending artwork cleanup and production/fulfillment status automation are not implemented; review abandoned drafts manually. Each IP is limited to ten new drafts per hour; each PNG is limited to 2 MB. One ten-pack per checkout.
