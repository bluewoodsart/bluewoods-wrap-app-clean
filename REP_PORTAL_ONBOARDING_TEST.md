# Rep Portal Onboarding Test

Use this before adding a real rep to production. Do not store the rep password in the repo or paste it into chat.

## Current Branch Baseline

- Current local Git branch: `main`
- Current local commit from `.git/refs/heads/main`: `2df1a350b7e2090b2bb8921187ba729d78cdaf07`
- The shell in this workspace cannot run `git`, so branch checks here are read from the `.git` files directly.

## New Rep Setup

1. Create the rep in Supabase Auth with their email and temporary password.
2. Copy the new Auth user ID from Supabase.
3. Run the `insert into public.admin_users` pattern at the bottom of `supabase-rep-manager-phase-1.sql`.
4. Give the rep a unique `rep_slug`, display name, and role:
   - `sales_rep` for a normal rep.
   - `rep_manager` only when they should see their own quotes plus child reps.
5. Add the same slug to `src/lib/salesReps.ts` before routing live leads to that rep by email.
6. Add or clone a cover page in `src/lib/brandChannels.ts` and `src/App.tsx` only after the login/quote tests pass.

## Starter Manager Rules

- Starter managers can have up to 5 child sales reps.
- Qualified managers can have up to 22 child sales reps.
- Child reps stay as `sales_rep`; only the manager gets `rep_manager`.
- The manager portal shows quotes for the manager's own `rep_slug` and the child reps attached by `manager_admin_user_id`.
- Supabase rejects child-rep assignments that exceed the manager's current cap.

## Smoke Test

1. Log in as the normal rep at `/login?redirect=/rep`.
2. Confirm `/rep` only shows quotes for that rep slug.
3. Log out.
4. Log in as a rep manager at `/login?redirect=/rep`.
5. Confirm `/rep` shows manager team wording.
6. Submit a test quote with `/?rep=rep-slug`.
7. Confirm the quote row has:
   - `rep_slug`
   - `rep_email`
   - `assigned_rep_name`
8. Confirm a normal rep cannot see a sibling rep's quote.
9. Confirm a manager can see child rep quotes only after the child is attached to that manager.

## Hold Point

Do not create a custom cover page for the new rep until the above tests pass. That keeps the noisy work out of the core portal branch.
