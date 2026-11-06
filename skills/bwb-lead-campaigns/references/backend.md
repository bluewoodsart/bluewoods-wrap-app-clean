# Existing backend
- Protected route: https://www.slapwrapz.com/admin?tab=marketing&section=email-leads
- Repository: bluewoodsart/bluewoods-wrap-app-clean. Verify current branch and remote before changing code.
- Supabase project: xggbfpfaxyfqvskmsszi. Verify live schema before writes; use the Supabase skill.
- UI: src/components/admin/MarketingProspectWorkspace.tsx.
- bwb_marketing_playbooks: key, title, description, instructions. One campaign/view per key; instructions also record search coverage.
- bwb_marketing_contacts: id, identity_key, company, email. Shared contact identity.
- bwb_marketing_prospects: one campaign entry with playbook_key, source_id, contact_id, business fields, sources, stage, notes, draft, scheduled_date, agreed_price, deposit_paid, historical_price_notes, source_account, source_year, imported_at, updated_at.
- Existing unique key: (playbook_key, source_id). Import with ON CONFLICT DO NOTHING unless a requested evidence correction is explicitly bounded.
- The insert trigger links a contact by lower(trim(company)) + "|" + lower(trim(email)); for a verified repeat contact whose display name changed, supply the existing contact_id. Do not assume fuzzy identity matches.
- Campaign keys: food-truck-print-partners; christmas-windows-2025; christmas-windows-2026; related-followups.
- Status values: researched, qualified, drafted, awaiting_approval, contacted, responded, handed_off, not_a_fit, quoted, scheduled, completed, lost.
- Reads and writes are restricted to active owner_admin/staff. Do not weaken RLS. UI edits compare updated_at to reject stale overwrites.
- Keep actual email content, customer prices, and import SQL out of Git; code, schema and generic skill instructions may be committed.

