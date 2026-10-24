# BWB Admin and marketing map

Verified against repository main at `64e1714` on October 24, 2026; re-check when changing code.

## Where to start

- Repository: https://github.com/bluewoodsart/bluewoods-wrap-app-clean
- Public website: https://www.slapwrapz.com
- Admin: `/admin`; marketing: `/admin?tab=owner-marketing`.
- `src/App.tsx`: React Router routes. `src/pages/Index.tsx`: homepage.
- `src/pages/Admin.tsx`: authenticated admin access and top-level tabs.
- `src/components/admin/BlueWoodsMarketingWorkspace.tsx`: marketing navigation and sections.
- `src/components/admin/ClientCrmDirectory.tsx` and `src/lib/crm.ts`: client directory,
  populated by `get_crm_clients`, which groups existing quote/job records.
- `src/pages/AdminStatus.tsx`: inquiry/quote detail, assignment, statuses and follow-up.
- `src/components/admin/BannerLeadCampaignBoard.tsx`: existing campaign integration.
- `src/components/admin/BusinessCardNetworking.tsx`: a separate private networking lead workflow.
- `src/lib/supabase.ts`: browser client; `supabase/migrations`: database changes.
- `api/`: Vercel server endpoints. `server/`: shared server implementation.

## Visitor conversations added in this branch

`/start` → `api/visitor-conversation.ts` → `ingest_bwb_conversation` →
conversation + message tables → explicit follow-up → `quote_requests` → existing CRM.

Admin inbox: `/admin?tab=owner-marketing&section=conversations`. This is real
database-backed intake, with a deterministic guide; it is not an LLM agent yet.
The backend does not send email or enroll visitors in marketing.

- `bwb_conversation_sites`: approved origins, brand, partner, intake switch.
- `bwb_conversation_members`: explicit staff site access; active BWB owners see all.
- `bwb_visitor_conversations`: initial link attribution, visitor-reported answers,
  follow-up request and linked CRM inquiry.
- `bwb_conversation_messages`: original visitor text and the guide response delivered.
- Server only: session token hashing and persistent rate limits; public table reads denied.
- CRM handoff is transactional and idempotent per conversation. Claimed emails do
  not grant access to existing customer records. Separate conversations can create
  separate inquiries, which the existing CRM groups as customer history.
- First rollout is SlapWrapz/BWB only. Other sites may store scoped conversations,
  but their CRM handoff is blocked until the legacy quote/client directory supports
  partner isolation. Do not simply enable partner CRM intake.
- Replies are deliberately bounded. Future AI extraction must preserve original
  words, label inferred values and respect the same storage/access contract.

## Verification and rollout

See `docs/VISITOR-CONVERSATIONS-ROLLOUT.md`. `npm run test:conversations` runs
isolated PostgreSQL tests via PGlite (no production data). Run `npm run build`
and targeted ESLint/type checks. Do not treat a successful build as proof of live
database permissions or end-to-end deployment.

No secrets belong in this guide. Supabase project identity can be checked from
the connected project listing and deployment configuration; never print private keys.
