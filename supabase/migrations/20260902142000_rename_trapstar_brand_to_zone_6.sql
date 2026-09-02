-- Preserve the legacy `trapstar` attribution slug while changing its visible brand name.
-- This keeps existing quote links and historical ownership intact during the migration.

update public.admin_users
set display_name = 'Zone 6 Customs LLC'
where lower(trim(coalesce(rep_slug, ''))) = 'trapstar'
  and display_name is distinct from 'Zone 6 Customs LLC';

update public.quote_requests
set assigned_rep_name = 'Zone 6 Customs LLC'
where lower(trim(coalesce(rep_slug, ''))) = 'trapstar'
  and assigned_rep_name is distinct from 'Zone 6 Customs LLC';

update public.urgent_lead_assignments
set
  assigned_rep_name = 'Zone 6 Customs LLC',
  updated_at = now()
where lower(trim(assigned_rep_slug)) = 'trapstar'
  and assigned_rep_name is distinct from 'Zone 6 Customs LLC';
