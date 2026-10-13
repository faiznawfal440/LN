-- Keep rating aggregates and verified-reader flags consistent.
ALTER TABLE public.volumes
  ADD COLUMN IF NOT EXISTS rating_avg numeric(3,2),
  ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0 CHECK (rating_count >= 0);

CREATE OR REPLACE FUNCTION private.recalculate_lumen_rating_aggregates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.novel_id IS NOT NULL THEN
    UPDATE public.novels n
      SET rating_count=(SELECT count(*)::integer FROM public.ratings r WHERE r.novel_id=OLD.novel_id),
          rating_avg=(SELECT round(avg(r.score)::numeric,2) FROM public.ratings r WHERE r.novel_id=OLD.novel_id)
      WHERE n.id=OLD.novel_id;
  END IF;
  IF TG_OP <> 'INSERT' AND OLD.volume_id IS NOT NULL THEN
    UPDATE public.volumes v
      SET rating_count=(SELECT count(*)::integer FROM public.ratings r WHERE r.volume_id=OLD.volume_id),
          rating_avg=(SELECT round(avg(r.score)::numeric,2) FROM public.ratings r WHERE r.volume_id=OLD.volume_id)
      WHERE v.id=OLD.volume_id;
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.novel_id IS NOT NULL
     AND (TG_OP='INSERT' OR NEW.novel_id IS DISTINCT FROM OLD.novel_id) THEN
    UPDATE public.novels n
      SET rating_count=(SELECT count(*)::integer FROM public.ratings r WHERE r.novel_id=NEW.novel_id),
          rating_avg=(SELECT round(avg(r.score)::numeric,2) FROM public.ratings r WHERE r.novel_id=NEW.novel_id)
      WHERE n.id=NEW.novel_id;
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.volume_id IS NOT NULL
     AND (TG_OP='INSERT' OR NEW.volume_id IS DISTINCT FROM OLD.volume_id) THEN
    UPDATE public.volumes v
      SET rating_count=(SELECT count(*)::integer FROM public.ratings r WHERE r.volume_id=NEW.volume_id),
          rating_avg=(SELECT round(avg(r.score)::numeric,2) FROM public.ratings r WHERE r.volume_id=NEW.volume_id)
      WHERE v.id=NEW.volume_id;
  END IF;
  IF TG_OP='DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ratings_recalculate_aggregates ON public.ratings;
CREATE TRIGGER ratings_recalculate_aggregates
AFTER INSERT OR UPDATE OR DELETE ON public.ratings
FOR EACH ROW EXECUTE FUNCTION private.recalculate_lumen_rating_aggregates();

CREATE OR REPLACE FUNCTION private.refresh_verified_ratings_after_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_novel uuid;
BEGIN
  SELECT v.novel_id INTO target_novel FROM public.volumes v WHERE v.id=NEW.volume_id;
  UPDATE public.ratings r SET verified_reader=true
  WHERE r.user_id=NEW.user_id AND r.verified_reader=false
    AND (r.volume_id=NEW.volume_id OR (r.novel_id IS NOT NULL AND r.novel_id=target_novel));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS reading_progress_refresh_verified_ratings ON public.reading_progress;
CREATE TRIGGER reading_progress_refresh_verified_ratings
AFTER INSERT OR UPDATE OF user_id, volume_id ON public.reading_progress
FOR EACH ROW EXECUTE FUNCTION private.refresh_verified_ratings_after_progress();

UPDATE public.novels n
SET rating_count=s.rating_count, rating_avg=s.rating_avg
FROM (
  SELECT n2.id, count(r.id)::integer AS rating_count, round(avg(r.score)::numeric,2) AS rating_avg
  FROM public.novels n2 LEFT JOIN public.ratings r ON r.novel_id=n2.id GROUP BY n2.id
) s WHERE n.id=s.id;

UPDATE public.volumes v
SET rating_count=s.rating_count, rating_avg=s.rating_avg
FROM (
  SELECT v2.id, count(r.id)::integer AS rating_count, round(avg(r.score)::numeric,2) AS rating_avg
  FROM public.volumes v2 LEFT JOIN public.ratings r ON r.volume_id=v2.id GROUP BY v2.id
) s WHERE v.id=s.id;
