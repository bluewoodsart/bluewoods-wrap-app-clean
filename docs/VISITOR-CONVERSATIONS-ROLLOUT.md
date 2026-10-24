# Visitor conversation rollout

## Implemented

Visitor entry at `/start`, optional source/search answers, saved transcript,
explicit email follow-up request, atomic CRM inquiry creation, and an Admin
Marketing inbox with per-site access and actual CRM status/assignment.

The homepage entry is feature-gated. Existing forms remain available. This change
does not claim the complete homepage redesign, AI conversation, automatic SEO
optimization, verified revenue attribution, or partner-wide CRM isolation.

## Activation order

1. Review and apply `20261024203620_bwb_visitor_conversations.sql` to the verified
   BWB project. Migration defaults public intake to paused.
2. Configure server-only `SUPABASE_SERVICE_ROLE_KEY` and existing
   `VITE_SUPABASE_URL`. Never expose the service key with a `VITE_` prefix.
3. Schedule `select public.purge_expired_bwb_conversations()` daily in the database
   using the project's scheduler. Monitor job failures. It deletes expired
   conversations/messages and removes transcript/attribution copies from linked
   CRM inquiry JSON. Expired records are immediately hidden by RLS.
4. Add only verified deployment origins to `bwb_conversation_sites.origins`.
   A hostname must belong to exactly one site. Grant staff site membership
   explicitly; owner admins already have access. Partner CRM is intentionally blocked.
5. Set `BWB_CONVERSATIONS_ENABLED=true`, enable the SlapWrapz site, deploy to a
   preview and run the acceptance checks below. The Vercel forwarded-IP header is
   required; plain Vite is frontend-only and does not serve this API.
6. After verification and release approval, set `VITE_BWB_CONVERSATIONS_ENABLED=true`
   and deploy. The feature flag controls the homepage invitation; the server/site
   switches control actual writes. Keep long-form redesign as separate work.

Rollback: pause the site or set the server flag false. Hide the homepage entry.
Do not drop existing conversations or CRM inquiries during rollback.

## Acceptance checks

- Start from a tagged link; submit a message and verify original words in Admin.
- Browse anonymously: no quote/inquiry is created. Skip optional attribution.
- Supply source/search answers: keep them separate from initial link tags.
- Request follow-up: exactly one CRM inquiry appears; inspect transcript, assign
  a rep and change status using existing CRM controls. Refresh marketing inbox
  and verify the same record's status and assignee.
- Repeat/retry a request: no duplicate message or CRM inquiry. Failed handoffs
  roll back the exchange; the visitor retains their text and can retry.
- Try another conversation token, unauthorized staff account, anonymous reads,
  cross-site access, disabled site, expired record and an oversized request.
- Verify 360px mobile layout, keyboard labels, error/retry and slow-network state.
- Verify the retention job removes both messages and copied CRM transcript.

## Limits

The guide uses rules rather than an AI provider. Source answers are optional.
Conversation session credentials are kept in React memory only; refreshing starts
a new conversation. No sensitive session token is put in a URL or durable browser storage.
The request ID survives network retries during the current page session.
The conversation inbox reports page-level counts, not complete funnel/revenue analytics.
The API rate limit is 100 successful writes per site/IP/hour and 50 exchanges per
conversation; upstream deployment protection should also be enabled before public rollout.
No message sends automatically. A CRM handoff is a request for follow-up, not
permission for promotional campaigns. Existing CRM workflows own rep assignment.
