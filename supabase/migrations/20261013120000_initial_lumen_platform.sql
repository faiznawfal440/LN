-- LN / Lumen: initial schema for a fresh Supabase project.
-- Covers reading, AI ingestion, community, ratings, shelves, search, translator permission and takedown.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS private;

DO $$ BEGIN CREATE TYPE public.publication_status AS ENUM ('draft','processing','review','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.processing_status AS ENUM ('queued','processing','review','completed','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.processing_stage_status AS ENUM ('waiting','running','completed','failed','skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.user_role AS ENUM ('reader','editor','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.bookshelf_status AS ENUM ('reading','plan_to_read','completed','dropped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS private.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'reader',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION private.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM private.user_roles r
    WHERE r.user_id = auth.uid() AND r.role IN ('editor'::public.user_role, 'admin'::public.user_role));
$$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Reader',
  username text,
  avatar_url text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx ON public.profiles (lower(username)) WHERE username IS NOT NULL;

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE display_label text;
BEGIN
  display_label := COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
                            NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''), 'Reader');
  INSERT INTO public.profiles(id, display_name) VALUES (NEW.id, display_label) ON CONFLICT (id) DO NOTHING;
  INSERT INTO private.user_roles(user_id, role) VALUES (NEW.id, 'reader'::public.user_role) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.set_lumen_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TABLE IF NOT EXISTS public.novels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, title text NOT NULL,
  alternate_title text, author text, description text, cover_path text,
  genres text[] NOT NULL DEFAULT '{}', language text NOT NULL DEFAULT 'en',
  publication_status public.publication_status NOT NULL DEFAULT 'draft', featured boolean NOT NULL DEFAULT false,
  rating_avg numeric(3,2), rating_count integer NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS novels_status_updated_idx ON public.novels(publication_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS novels_genres_idx ON public.novels USING gin(genres);

CREATE TABLE IF NOT EXISTS public.volumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  volume_number integer NOT NULL CHECK (volume_number > 0), title text NOT NULL, subtitle text, description text,
  pdf_path text, pdf_sha256 text, page_count integer CHECK (page_count IS NULL OR page_count >= 0),
  publication_status public.publication_status NOT NULL DEFAULT 'draft', metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(novel_id, volume_number)
);
CREATE INDEX IF NOT EXISTS volumes_novel_status_idx ON public.volumes(novel_id, publication_status, volume_number);

CREATE TABLE IF NOT EXISTS public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), volume_id uuid NOT NULL REFERENCES public.volumes(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL CHECK (chapter_number > 0), title text NOT NULL, slug text NOT NULL,
  start_page integer CHECK (start_page IS NULL OR start_page > 0),
  end_page integer CHECK (end_page IS NULL OR end_page >= start_page),
  summary text, spoiler_safe_summary text, word_count integer CHECK (word_count IS NULL OR word_count >= 0),
  content_format text NOT NULL DEFAULT 'pdf', publication_status public.publication_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(volume_id, chapter_number), UNIQUE(volume_id, slug)
);
CREATE INDEX IF NOT EXISTS chapters_volume_order_idx ON public.chapters(volume_id, chapter_number);

CREATE TABLE IF NOT EXISTS public.chapter_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  page_number integer NOT NULL CHECK (page_number > 0), source_pdf_page integer CHECK (source_pdf_page IS NULL OR source_pdf_page > 0),
  content text NOT NULL DEFAULT '', layout jsonb NOT NULL DEFAULT '{}'::jsonb, ocr_used boolean NOT NULL DEFAULT false,
  extraction_confidence numeric(4,3) CHECK (extraction_confidence IS NULL OR extraction_confidence BETWEEN 0 AND 1),
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(chapter_id, page_number)
);
CREATE INDEX IF NOT EXISTS chapter_pages_chapter_order_idx ON public.chapter_pages(chapter_id, page_number);

CREATE TABLE IF NOT EXISTS public.chapter_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL CHECK (chunk_index >= 0), content text NOT NULL,
  token_count integer CHECK (token_count IS NULL OR token_count >= 0), embedding extensions.vector(1536),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(chapter_id, chunk_index)
);
CREATE INDEX IF NOT EXISTS chapter_chunks_chapter_idx ON public.chapter_chunks(chapter_id);

CREATE TABLE IF NOT EXISTS public.characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  canonical_name text NOT NULL, aliases text[] NOT NULL DEFAULT '{}', short_description text, spoiler_safe_description text,
  first_appearance_volume integer, first_appearance_chapter integer, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(novel_id, canonical_name)
);
CREATE TABLE IF NOT EXISTS public.chapter_characters (
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  mention_count integer NOT NULL DEFAULT 1 CHECK (mention_count >= 0), PRIMARY KEY(chapter_id, character_id)
);
CREATE TABLE IF NOT EXISTS public.glossary_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  term text NOT NULL, definition text NOT NULL, spoiler_safe_definition text,
  first_appearance_volume integer, first_appearance_chapter integer, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(novel_id, term)
);

CREATE TABLE IF NOT EXISTS public.processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), volume_id uuid REFERENCES public.volumes(id) ON DELETE CASCADE,
  input_path text NOT NULL, status public.processing_status NOT NULL DEFAULT 'queued', current_stage text,
  progress_percent integer NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100), error_message text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, file_size_bytes bigint CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  started_at timestamptz, finished_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS processing_jobs_volume_created_idx ON public.processing_jobs(volume_id, created_at DESC);
CREATE INDEX IF NOT EXISTS processing_jobs_status_idx ON public.processing_jobs(status, created_at);
CREATE TABLE IF NOT EXISTS public.processing_job_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_id uuid NOT NULL REFERENCES public.processing_jobs(id) ON DELETE CASCADE,
  stage_order integer NOT NULL CHECK (stage_order > 0), stage_key text NOT NULL,
  status public.processing_stage_status NOT NULL DEFAULT 'waiting', progress_percent integer NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  started_at timestamptz, finished_at timestamptz, error_message text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(job_id, stage_key), UNIQUE(job_id, stage_order)
);
CREATE TABLE IF NOT EXISTS public.processing_job_logs (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, job_id uuid NOT NULL REFERENCES public.processing_jobs(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('debug','info','ai','warn','error')),
  message text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS processing_job_logs_job_created_idx ON public.processing_job_logs(job_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.reading_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, volume_id uuid NOT NULL REFERENCES public.volumes(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL, page_number integer NOT NULL DEFAULT 1 CHECK (page_number > 0),
  progress_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100), last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id, volume_id)
);
CREATE INDEX IF NOT EXISTS reading_progress_volume_idx ON public.reading_progress(volume_id, last_read_at DESC);
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  volume_id uuid NOT NULL REFERENCES public.volumes(id) ON DELETE CASCADE, chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  page_number integer NOT NULL CHECK (page_number > 0), note text, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, volume_id, page_number)
);

CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id uuid REFERENCES public.novels(id) ON DELETE SET NULL, content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  is_spoiler boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  is_spoiler boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_posts_created_idx ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_novel_idx ON public.community_posts(novel_id);
CREATE INDEX IF NOT EXISTS community_comments_post_idx ON public.community_comments(post_id, created_at);

CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id uuid REFERENCES public.novels(id) ON DELETE CASCADE, volume_id uuid REFERENCES public.volumes(id) ON DELETE CASCADE,
  score smallint NOT NULL CHECK (score BETWEEN 1 AND 10), review text CHECK (review IS NULL OR char_length(review) <= 4000),
  is_spoiler boolean NOT NULL DEFAULT false, verified_reader boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((novel_id IS NOT NULL AND volume_id IS NULL) OR (novel_id IS NULL AND volume_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS ratings_user_series_unique ON public.ratings(user_id, novel_id) WHERE novel_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ratings_user_volume_unique ON public.ratings(user_id, volume_id) WHERE volume_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ratings_novel_score_idx ON public.ratings(novel_id, score) WHERE novel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ratings_volume_score_idx ON public.ratings(volume_id, score) WHERE volume_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.bookshelf_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  status public.bookshelf_status NOT NULL DEFAULT 'plan_to_read',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, novel_id)
);
CREATE TABLE IF NOT EXISTS public.volume_recaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_volume_id uuid NOT NULL REFERENCES public.volumes(id) ON DELETE CASCADE,
  target_volume_id uuid NOT NULL REFERENCES public.volumes(id) ON DELETE CASCADE, recap_text text NOT NULL,
  is_approved boolean NOT NULL DEFAULT false, approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(target_volume_id), CHECK (source_volume_id <> target_volume_id)
);

CREATE TABLE IF NOT EXISTS public.volume_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), volume_id uuid NOT NULL UNIQUE REFERENCES public.volumes(id) ON DELETE CASCADE,
  translator_name text NOT NULL, translation_group text, permission_scope text NOT NULL, granted_at date NOT NULL,
  consent_type text NOT NULL CHECK (consent_type IN ('chat','email','document')), consent_reference text NOT NULL,
  permission_status text NOT NULL DEFAULT 'pending' CHECK (permission_status IN ('pending','approved','revoked')),
  attribution_text text NOT NULL, monetization_approved boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.content_takedown_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), volume_id uuid REFERENCES public.volumes(id) ON DELETE SET NULL,
  requester_name text NOT NULL, requester_email text NOT NULL, rights_holder text NOT NULL, content_url text, reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','rejected')),
  admin_notes text, reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), responded_at timestamptz
);
CREATE INDEX IF NOT EXISTS content_takedown_status_created_idx ON public.content_takedown_requests(status, created_at DESC);
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL, title text NOT NULL, body text NOT NULL DEFAULT '', link text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION private.refresh_rating_verified_reader()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF NEW.volume_id IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM public.reading_progress rp WHERE rp.user_id = NEW.user_id AND rp.volume_id = NEW.volume_id)
      INTO NEW.verified_reader;
  ELSE
    SELECT EXISTS (SELECT 1 FROM public.reading_progress rp JOIN public.volumes v ON v.id = rp.volume_id
      WHERE rp.user_id = NEW.user_id AND v.novel_id = NEW.novel_id) INTO NEW.verified_reader;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','novels','volumes','chapters','characters','glossary_terms','processing_jobs','reading_progress','community_posts','community_comments','ratings','bookshelf_items','volume_recaps','volume_permissions','content_takedown_requests'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_lumen_updated_at()', t, t);
  END LOOP;
END $$;
DROP TRIGGER IF EXISTS ratings_verified_reader ON public.ratings;
CREATE TRIGGER ratings_verified_reader BEFORE INSERT OR UPDATE OF user_id, novel_id, volume_id ON public.ratings
FOR EACH ROW EXECUTE FUNCTION private.refresh_rating_verified_reader();

ALTER TABLE private.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.novels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glossary_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_job_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookshelf_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volume_recaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volume_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_takedown_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_staff() TO anon, authenticated, service_role;
REVOKE ALL ON TABLE private.user_roles FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE private.user_roles TO service_role;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION private.refresh_rating_verified_reader() TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

DROP POLICY IF EXISTS profiles_public_read ON public.profiles;
CREATE POLICY profiles_public_read ON public.profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS novels_read ON public.novels;
CREATE POLICY novels_read ON public.novels FOR SELECT TO anon, authenticated USING (publication_status = 'published' OR private.is_staff());
DROP POLICY IF EXISTS novels_staff_insert ON public.novels;
CREATE POLICY novels_staff_insert ON public.novels FOR INSERT TO authenticated WITH CHECK (private.is_staff());
DROP POLICY IF EXISTS novels_staff_update ON public.novels;
CREATE POLICY novels_staff_update ON public.novels FOR UPDATE TO authenticated USING (private.is_staff()) WITH CHECK (private.is_staff());
DROP POLICY IF EXISTS novels_staff_delete ON public.novels;
CREATE POLICY novels_staff_delete ON public.novels FOR DELETE TO authenticated USING (private.is_staff());

DROP POLICY IF EXISTS volumes_read ON public.volumes;
CREATE POLICY volumes_read ON public.volumes FOR SELECT TO anon, authenticated USING (
  private.is_staff() OR (publication_status = 'published' AND EXISTS (SELECT 1 FROM public.novels n WHERE n.id = novel_id AND n.publication_status = 'published'))
);
DROP POLICY IF EXISTS volumes_staff_insert ON public.volumes;
CREATE POLICY volumes_staff_insert ON public.volumes FOR INSERT TO authenticated WITH CHECK (private.is_staff());
DROP POLICY IF EXISTS volumes_staff_update ON public.volumes;
CREATE POLICY volumes_staff_update ON public.volumes FOR UPDATE TO authenticated USING (private.is_staff()) WITH CHECK (private.is_staff());
DROP POLICY IF EXISTS volumes_staff_delete ON public.volumes;
CREATE POLICY volumes_staff_delete ON public.volumes FOR DELETE TO authenticated USING (private.is_staff());

DROP POLICY IF EXISTS chapters_read ON public.chapters;
CREATE POLICY chapters_read ON public.chapters FOR SELECT TO anon, authenticated USING (
  private.is_staff() OR (publication_status = 'published' AND EXISTS (
    SELECT 1 FROM public.volumes v JOIN public.novels n ON n.id = v.novel_id
    WHERE v.id = volume_id AND v.publication_status = 'published' AND n.publication_status = 'published'
  ))
);
DROP POLICY IF EXISTS chapters_staff_insert ON public.chapters;
CREATE POLICY chapters_staff_insert ON public.chapters FOR INSERT TO authenticated WITH CHECK (private.is_staff());
DROP POLICY IF EXISTS chapters_staff_update ON public.chapters;
CREATE POLICY chapters_staff_update ON public.chapters FOR UPDATE TO authenticated USING (private.is_staff()) WITH CHECK (private.is_staff());
DROP POLICY IF EXISTS chapters_staff_delete ON public.chapters;
CREATE POLICY chapters_staff_delete ON public.chapters FOR DELETE TO authenticated USING (private.is_staff());

DROP POLICY IF EXISTS chapter_pages_read ON public.chapter_pages;
CREATE POLICY chapter_pages_read ON public.chapter_pages FOR SELECT TO anon, authenticated USING (
  private.is_staff() OR EXISTS (
    SELECT 1 FROM public.chapters c JOIN public.volumes v ON v.id = c.volume_id JOIN public.novels n ON n.id = v.novel_id
    WHERE c.id = chapter_id AND c.publication_status = 'published' AND v.publication_status = 'published' AND n.publication_status = 'published'
  )
);
DROP POLICY IF EXISTS chapter_pages_staff ON public.chapter_pages;
CREATE POLICY chapter_pages_staff ON public.chapter_pages FOR ALL TO authenticated USING (private.is_staff()) WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS chapter_chunks_staff ON public.chapter_chunks;
CREATE POLICY chapter_chunks_staff ON public.chapter_chunks FOR ALL TO authenticated USING (private.is_staff()) WITH CHECK (private.is_staff());
DROP POLICY IF EXISTS characters_staff ON public.characters;
CREATE POLICY characters_staff ON public.characters FOR ALL TO authenticated USING (private.is_staff()) WITH CHECK (private.is_staff());
DROP POLICY IF EXISTS chapter_characters_staff ON public.chapter_characters;
CREATE POLICY chapter_characters_staff ON public.chapter_characters FOR ALL TO authenticated USING (private.is_staff()) WITH CHECK (private.is_staff());
DROP POLICY IF EXISTS glossary_terms_staff ON public.glossary_terms;
CREATE POLICY glossary_terms_staff ON public.glossary_terms FOR ALL TO authenticated USING (private.is_staff()) WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS jobs_staff ON public.processing_jobs;
CREATE POLICY jobs_staff ON public.processing_jobs FOR ALL TO authenticated USING (private.is_staff()) WITH CHECK (private.is_staff());
DROP POLICY IF EXISTS stages_staff ON public.processing_job_stages;
CREATE POLICY stages_staff ON public.processing_job_stages FOR ALL TO authenticated USING (private.is_staff()) WITH CHECK (private.is_staff());
DROP POLICY IF EXISTS logs_staff_read ON public.processing_job_logs;
CREATE POLICY logs_staff_read ON public.processing_job_logs FOR SELECT TO authenticated USING (private.is_staff());

DROP POLICY IF EXISTS reading_progress_select_own ON public.reading_progress;
CREATE POLICY reading_progress_select_own ON public.reading_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS reading_progress_insert_own ON public.reading_progress;
CREATE POLICY reading_progress_insert_own ON public.reading_progress FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.volumes v WHERE v.id = volume_id AND v.publication_status = 'published')
);
DROP POLICY IF EXISTS reading_progress_update_own ON public.reading_progress;
CREATE POLICY reading_progress_update_own ON public.reading_progress FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS reading_progress_delete_own ON public.reading_progress;
CREATE POLICY reading_progress_delete_own ON public.reading_progress FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS bookmarks_own ON public.bookmarks;
CREATE POLICY bookmarks_own ON public.bookmarks FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS community_posts_read ON public.community_posts;
CREATE POLICY community_posts_read ON public.community_posts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS community_posts_insert_own ON public.community_posts;
CREATE POLICY community_posts_insert_own ON public.community_posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS community_posts_update_own ON public.community_posts;
CREATE POLICY community_posts_update_own ON public.community_posts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS community_posts_delete_own ON public.community_posts;
CREATE POLICY community_posts_delete_own ON public.community_posts FOR DELETE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS community_comments_read ON public.community_comments;
CREATE POLICY community_comments_read ON public.community_comments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS community_comments_insert_own ON public.community_comments;
CREATE POLICY community_comments_insert_own ON public.community_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS community_comments_update_own ON public.community_comments;
CREATE POLICY community_comments_update_own ON public.community_comments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS community_comments_delete_own ON public.community_comments;
CREATE POLICY community_comments_delete_own ON public.community_comments FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS ratings_read_non_spoiler_or_own ON public.ratings;
CREATE POLICY ratings_read_non_spoiler_or_own ON public.ratings FOR SELECT TO anon, authenticated USING (NOT is_spoiler OR user_id = auth.uid());
DROP POLICY IF EXISTS ratings_insert_own ON public.ratings;
CREATE POLICY ratings_insert_own ON public.ratings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS ratings_update_own ON public.ratings;
CREATE POLICY ratings_update_own ON public.ratings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS ratings_delete_own ON public.ratings;
CREATE POLICY ratings_delete_own ON public.ratings FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS bookshelf_own ON public.bookshelf_items;
CREATE POLICY bookshelf_own ON public.bookshelf_items FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS recaps_read_approved ON public.volume_recaps;
CREATE POLICY recaps_read_approved ON public.volume_recaps FOR SELECT TO anon, authenticated USING (
  is_approved AND EXISTS (SELECT 1 FROM public.volumes v JOIN public.novels n ON n.id = v.novel_id WHERE v.id = target_volume_id AND v.publication_status = 'published' AND n.publication_status = 'published')
);
DROP POLICY IF EXISTS recaps_staff ON public.volume_recaps;
CREATE POLICY recaps_staff ON public.volume_recaps FOR ALL TO authenticated USING (private.is_staff()) WITH CHECK (private.is_staff());
DROP POLICY IF EXISTS permissions_staff ON public.volume_permissions;
CREATE POLICY permissions_staff ON public.volume_permissions FOR ALL TO authenticated USING (private.is_staff()) WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS takedown_submit ON public.content_takedown_requests;
CREATE POLICY takedown_submit ON public.content_takedown_requests FOR INSERT TO anon, authenticated WITH CHECK (
  char_length(trim(requester_name)) BETWEEN 2 AND 180 AND char_length(trim(requester_email)) BETWEEN 5 AND 320
  AND char_length(trim(rights_holder)) BETWEEN 2 AND 300 AND char_length(trim(reason)) BETWEEN 10 AND 5000
);
DROP POLICY IF EXISTS takedown_staff_read ON public.content_takedown_requests;
CREATE POLICY takedown_staff_read ON public.content_takedown_requests FOR SELECT TO authenticated USING (private.is_staff());
DROP POLICY IF EXISTS takedown_staff_update ON public.content_takedown_requests;
CREATE POLICY takedown_staff_update ON public.content_takedown_requests FOR UPDATE TO authenticated USING (private.is_staff()) WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS notifications_read_own ON public.notifications;
CREATE POLICY notifications_read_own ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.match_lumen_chunks(query_embedding text, match_threshold double precision DEFAULT 0.55, match_count integer DEFAULT 8)
RETURNS TABLE (
  chunk_id uuid, chapter_id uuid, chapter_number integer, chapter_title text, volume_id uuid,
  volume_number integer, volume_title text, novel_id uuid, novel_slug text, novel_title text,
  content text, metadata jsonb, similarity double precision
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT cc.id, c.id, c.chapter_number, c.title, v.id, v.volume_number, v.title, n.id, n.slug, n.title,
         cc.content, cc.metadata, (1 - (cc.embedding OPERATOR(extensions.<=>) query_embedding::extensions.vector))::double precision
  FROM public.chapter_chunks cc JOIN public.chapters c ON c.id = cc.chapter_id
  JOIN public.volumes v ON v.id = c.volume_id JOIN public.novels n ON n.id = v.novel_id
  WHERE cc.embedding IS NOT NULL AND c.publication_status = 'published' AND v.publication_status = 'published'
    AND n.publication_status = 'published'
    AND (1 - (cc.embedding OPERATOR(extensions.<=>) query_embedding::extensions.vector)) >= match_threshold
  ORDER BY cc.embedding OPERATOR(extensions.<=>) query_embedding::extensions.vector
  LIMIT GREATEST(1, LEAST(match_count, 20));
$$;
GRANT EXECUTE ON FUNCTION public.match_lumen_chunks(text, double precision, integer) TO authenticated, service_role;

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('novel-pdfs','novel-pdfs',false,524288000,ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=524288000,allowed_mime_types=ARRAY['application/pdf'];
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('novel-covers','novel-covers',true,10485760,ARRAY['image/jpeg','image/png','image/webp','image/avif'])
ON CONFLICT (id) DO UPDATE SET public=true,file_size_limit=10485760,allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','image/avif'];

DROP POLICY IF EXISTS "Staff upload novel PDFs" ON storage.objects;
CREATE POLICY "Staff upload novel PDFs" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='novel-pdfs' AND private.is_staff() AND EXISTS (SELECT 1 FROM public.volumes v WHERE v.id::text=(storage.foldername(name))[1]));
DROP POLICY IF EXISTS "Staff update novel PDFs" ON storage.objects;
CREATE POLICY "Staff update novel PDFs" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='novel-pdfs' AND private.is_staff()) WITH CHECK (bucket_id='novel-pdfs' AND private.is_staff());
DROP POLICY IF EXISTS "Staff delete novel PDFs" ON storage.objects;
CREATE POLICY "Staff delete novel PDFs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='novel-pdfs' AND private.is_staff());
DROP POLICY IF EXISTS "Staff upload novel covers" ON storage.objects;
CREATE POLICY "Staff upload novel covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='novel-covers' AND private.is_staff());
DROP POLICY IF EXISTS "Staff update novel covers" ON storage.objects;
CREATE POLICY "Staff update novel covers" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='novel-covers' AND private.is_staff()) WITH CHECK (bucket_id='novel-covers' AND private.is_staff());
DROP POLICY IF EXISTS "Staff delete novel covers" ON storage.objects;
CREATE POLICY "Staff delete novel covers" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='novel-covers' AND private.is_staff());
DROP POLICY IF EXISTS "Public read novel covers" ON storage.objects;
CREATE POLICY "Public read novel covers" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id='novel-covers');
