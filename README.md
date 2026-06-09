# Blue Woods Wrap Quote App

This project was exported from Famous.ai as a real code project. It uses React, TypeScript, Vite, Tailwind CSS, shadcn/ui components, and Supabase.

## What This Is

- A vehicle wrap and print quote flow
- A Vite React frontend
- A Supabase-connected app
- A codebase that can be edited with Codex, Cursor, VS Code, GitHub, and Vercel

## Local Setup

Install Node.js LTS from:

https://nodejs.org

Then open this folder in PowerShell:

```powershell
cd "C:\Users\Designer\Documents\BlueWoods Projects\wraps-quotes-design-1"
```

Install dependencies:

```powershell
npm.cmd install
```

To run only the Vite frontend:

```powershell
npm.cmd run dev
```

The local app should open at:

```text
http://localhost:5173
```

`npm.cmd run dev` only starts the Vite frontend. It does not run the Vercel serverless API functions in the `api` folder.

To test email sending locally, run the app through Vercel's local dev server instead. This is required for `/api/send-quote-emails`:

```powershell
npx.cmd vercel dev
```

Use the local URL printed by Vercel, usually `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
RESEND_API_KEY=
```

For Vercel, add the same three values in the project environment variables.

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` connect the frontend to Supabase. `RESEND_API_KEY` is used by the serverless email endpoint at `/api/send-quote-emails`.

Do not paste secret values into chat, commits, screenshots, or public docs.

## Local Email Testing

Use `npx.cmd vercel dev`, not `npm.cmd run dev`, when testing quote email delivery. The direct Vite server can run the form UI, but it cannot run the local `/api/send-quote-emails` serverless route.

Current known issue: Resend accepts and delivers email to `quotes@slapwrapz.com`, but the receiving mailbox or forwarding rule for that address still needs to be verified if the business notification does not appear in the expected inbox.

## Sales Rep QR Attribution

Sales reps can use quote links with a `rep` query parameter:

```text
http://localhost:3000/?rep=ashley
```

For production, use the live domain with the same query parameter:

```text
https://slapwrapz.com/?rep=ashley
```

The app stores the rep slug with submitted quote requests and includes it in the email payload. The serverless email route maps known rep slugs to rep email addresses. If a rep is matched, the business lead email is sent to the rep and `quotes@slapwrapz.com` is copied. If no rep is matched, the lead email goes only to `quotes@slapwrapz.com`.

Supabase migration for existing projects:

```sql
alter table public.quote_requests
  add column if not exists rep_slug text,
  add column if not exists rep_email text,
  add column if not exists assigned_rep_name text;

create index if not exists quote_requests_rep_slug_idx
  on public.quote_requests (rep_slug);
```

Local test checklist:

1. Run `npx.cmd vercel dev`.
2. Open `http://localhost:3000/?rep=ashley`.
3. Submit a quote.
4. In Supabase, confirm the `quote_requests.rep_slug` value is `ashley`.
5. In Resend, confirm the customer email was accepted.
6. In Resend, confirm the business lead email was sent to the assigned rep and copied to `quotes@slapwrapz.com`.

## TODO For Next Session

- Remove temporary email debug logs from `api/send-quote-emails.ts` after delivery is confirmed.
- Verify sales rep attribution from `/?rep=ashley` through Supabase and Resend.
- Verify the `quotes@slapwrapz.com` mailbox or forwarding destination.
- Confirm the production Vercel project has all three environment variables.
- Run a clean local build after Node/npm are available: `npm.cmd run build`.

## Deploying

Recommended deployment path:

1. Create a GitHub repo.
2. Upload this project.
3. Import the GitHub repo into Vercel.
4. Add the Supabase and Resend environment variables in Vercel.
5. Connect the Cloudflare domain to Vercel.
