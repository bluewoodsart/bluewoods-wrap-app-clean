# Blue Woods Supabase Setup

Use this checklist to make the quote form submit real customer requests.

## 1. Create or Open Your Supabase Project

In Supabase, open the project you want connected to the Blue Woods website.

## 2. Run the Database Setup

Open **SQL Editor** in Supabase and run the full contents of:

`supabase-quote-requests.sql`

This creates:

- `quote_requests` for final customer quote/contact submissions
- `customer_files` for uploaded file records, including customer contact fields after final submit
- `customer-uploads` storage bucket for artwork, photos, logos, and PDFs
- Public insert policies so website visitors can submit requests

If these tables already exist, run the SQL again after updates. The script uses safe `if not exists` changes where possible, so it can add missing columns/functions without wiping your customer data.

## 3. Add Website Environment Variables

In the Supabase project, go to **Project Settings > API** and copy:

- Project URL
- anon public key

Set these in your website hosting environment:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-public-key
```

For Vercel, add them under **Project Settings > Environment Variables**, then redeploy.

## 4. Test a Real Submission

Open the live website and complete the quote flow:

1. Upload a small test image or PDF.
2. Add customer contact info.
3. Submit the request.

Then confirm in Supabase:

- **Table Editor > quote_requests** has a new row
- **Table Editor > customer_files** has uploaded file records, and after final submit those records show customer name, email, and phone
- **Storage > customer-uploads** contains the uploaded file

## Important Privacy Note

This setup makes uploaded files readable by public URL because the current app stores public file links. That is easy for operations, but for sensitive customer artwork a private bucket plus admin-only signed links would be more secure.
