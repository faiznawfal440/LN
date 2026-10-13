# Lumen — AI Light Novel Reader (LN)

Responsive light-novel reading platform based on the supplied product requirements.

## Stack
- React 19 + TypeScript + Vite
- Supabase Auth, PostgreSQL, private object storage and Edge Functions
- OpenAI API for PDF extraction, metadata, chapter detection, summaries, glossary and embeddings
- GitHub Actions for production builds; Vercel for web hosting

## Setup
1. Copy `.env.example` to `.env.local`.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the Supabase project settings.
3. Run `npm install`, then `npm run dev`.
4. Apply the SQL migration in `supabase/migrations` and deploy the functions in `supabase/functions`.
5. In Supabase Auth → URL Configuration, set the Site URL to your deployed HTTPS domain. Add the production URL, your Vercel preview URL patterns, and `http://localhost:8443/**` to Redirect URLs.
6. Set `OPENAI_API_KEY` as a Supabase Edge Function secret. Never put it in a `VITE_*` variable or commit it.

## Database and functions
```bash
supabase link --project-ref <project-ref>
supabase db push
supabase secrets set OPENAI_API_KEY=<your-key>
supabase functions deploy
```

New accounts are readers by default. Promote the initial editor/admin by inserting the authenticated user's UUID into `private.user_roles` in the Supabase SQL editor.

## Product coverage
Responsive discovery, reader workspace, cloud reading progress/bookmarks, community discussions, PDF upload, AI processing stages, metadata and chapter review, explicit publishing, semantic search, personal shelf, series/volume ratings, spoiler flags, safe volume recaps, notifications, permission/attribution records and takedown tracking.

Publication has two independent gates: approved translator permission/attribution and an approved, documented legal basis to distribute the original work. A translator's permission does not grant rights in the original novel. For public-domain works, record the basis and evidence; define takedown handling before public launch.

## Security
- Browser code uses only the Supabase publishable key. Keep service/secret keys and the OpenAI key server-side.
- Original PDFs stay in the private `novel-pdfs` bucket and are delivered with short-lived signed URLs.
- Public tables have row-level security. Authorization uses `private.user_roles`, not editable user metadata.
