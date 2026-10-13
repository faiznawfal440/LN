# Lumen — AI Light Novel Reader (LN)

Responsive light-novel reading platform based on the LN product requirements.

## Stack

- React 19 + TypeScript + Vite
- Supabase Auth, PostgreSQL, private object storage and Edge Functions
- OpenAI API for PDF text extraction, metadata, chapter detection, summaries and embeddings
- GitHub Actions for type-checking and production builds; Vercel for web hosting

## Setup

1. Copy `.env.example` to `.env.local`.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the Supabase project settings.
3. Run `npm install`, then `npm run dev`.
4. Apply the SQL migration in `supabase/migrations` and deploy the functions in `supabase/functions`.
5. Configure Supabase Auth URL settings: set the production Site URL to the deployed HTTPS domain and add exact production, preview and local redirect URLs. Do not use localhost as the production Site URL.
6. Set `OPENAI_API_KEY` as a Supabase Edge Function secret; never put it in a `VITE_*` variable or commit it.

## Supabase

```bash
supabase link --project-ref <project-ref>
supabase db push
supabase secrets set OPENAI_API_KEY=<your-key>
supabase functions deploy
```

Promote the first editor/admin account by inserting a row into `private.user_roles` for that authenticated user's UUID. New accounts are readers by default.

## Product scope

The web baseline includes responsive discovery, search, a dedicated reading workspace, personal progress/bookmarks, community discussion and an admin AI Studio with upload → processing → review → explicit publish. The schema also supports shelves, double ratings with verified-reader state, spoiler-marked discussion, safe volume recaps, release notifications, embedding search and permission/takedown records.

PDF processing uses a review gate; AI results must not be auto-published. Every distributed translation must have documented permission and attribution. Permission from a translator does not replace rights in the original work; verify legal rights before public launch.

## Security notes

- Only the Supabase publishable key is used by the browser. Keep service/secret keys and the OpenAI key server-side.
- PDF files remain in a private Storage bucket and the app issues short-lived signed URLs.
- Public tables have row-level security; roles are read from the server-managed `private.user_roles`, never from editable user metadata.
