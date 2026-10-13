# Lumen — AI Light Novel Reader (LN)

Responsive light-novel reading platform based on the supplied product requirements.

## Live deployment

- Website: https://ln-umber.vercel.app
- GitHub: https://github.com/faiznawfal440/LN
- Supabase project ref: `nhkxxegjfrmlusjqbejz`
- Supabase region: Singapore (`ap-southeast-1`)
- Vercel frontend variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are configured for Production, Preview, and Development.
- Database migrations are applied and versioned in `supabase/migrations`; Edge Functions are deployed with JWT verification enabled.

The catalog is expected to remain empty until at least one rights-cleared title and volume are added and approved for publication. Illustrative sample cards are not downloadable titles.

## Stack

- React 19 + TypeScript + Vite
- Supabase Auth, PostgreSQL, private object storage and Edge Functions
- OpenAI API for PDF extraction, metadata, chapter detection, summaries, glossary and embeddings
- GitHub Actions for production builds; Vercel for web hosting

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the Supabase project settings.
3. Run `npm install`, then `npm run dev`.
4. For local database/function work, link the CLI to the project and use the checked-in migrations:
   ```bash
   supabase link --project-ref nhkxxegjfrmlusjqbejz
   supabase db push
   supabase functions deploy
   ```

## One-time production configuration

### Supabase Auth redirect URLs

Open [Supabase Auth URL Configuration](https://supabase.com/dashboard/project/nhkxxegjfrmlusjqbejz/auth/url-configuration):

- Set **Site URL** to `https://ln-umber.vercel.app`.
- Add `https://ln-umber.vercel.app/**` to Redirect URLs.
- Add `https://ln-nawfal5.vercel.app/**` to Redirect URLs.
- Add `https://*-nawfal5.vercel.app/**` to Redirect URLs for Vercel preview deployments.
- Add `http://localhost:8443/**` for local development.

Keep the production Site URL exact; wildcards are only needed for preview/local environments.

### OpenAI secret

Open [Supabase Edge Function Secrets](https://supabase.com/dashboard/project/nhkxxegjfrmlusjqbejz/functions/secrets) and add `OPENAI_API_KEY`. This value must remain server-side: do not place it in any `VITE_*` variable or commit it to Git. Until the secret is configured, AI PDF processing and embedding generation cannot run successfully.

### Initial administrator

New accounts start as readers. After the owner has registered and confirmed the correct account, promote that account using its UUID in the Supabase SQL Editor:

```sql
insert into private.user_roles (user_id, role)
values ('<authenticated-user-uuid>', 'admin')
on conflict (user_id) do update set role = excluded.role;
```

Do not expose `private.user_roles` through the Data API.

## Product coverage

Responsive discovery, reader workspace, cloud reading progress/bookmarks, community discussions, PDF upload, AI processing stages, metadata and chapter review, explicit publishing, semantic search, personal shelf, series/volume ratings, spoiler flags, safe volume recaps, notifications, permission/attribution records and takedown tracking.

Publication has two independent gates: approved translator permission/attribution and an approved, documented legal basis to distribute the original work. A translator's permission does not grant rights in the original novel. For public-domain works, record the basis and evidence; define takedown handling before public launch.

## Security

- Browser code uses only the Supabase publishable key. Keep service/secret keys and the OpenAI key server-side.
- Original PDFs stay in the private `novel-pdfs` bucket and are delivered with short-lived signed URLs.
- Public tables have row-level security. Authorization uses `private.user_roles`, not editable user metadata.
