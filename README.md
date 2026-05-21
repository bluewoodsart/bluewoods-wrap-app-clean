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

Then open this folder in a terminal and run:

```bash
npm install
npm run dev
```

The local app should open at:

```text
http://localhost:5173
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

For Vercel, add the same two values in the project environment variables.

## Deploying

Recommended deployment path:

1. Create a GitHub repo.
2. Upload this project.
3. Import the GitHub repo into Vercel.
4. Add the Supabase environment variables in Vercel.
5. Connect the Cloudflare domain to Vercel.
