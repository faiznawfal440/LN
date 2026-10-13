-- Only explicitly spoiler-safe descriptions may cross the volume boundary.
-- Never fall back to the full description/definition for reader-facing knowledge.
CREATE OR REPLACE FUNCTION public.get_safe_volume_knowledge(p_volume_id uuid)
RETURNS TABLE(kind text, term text, description text, first_appearance_volume integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 'character'::text, ch.canonical_name, ch.spoiler_safe_description, ch.first_appearance_volume
  FROM public.characters ch
  JOIN public.volumes target ON target.novel_id = ch.novel_id
  JOIN public.novels n ON n.id = target.novel_id
  WHERE target.id = p_volume_id
    AND target.publication_status = 'published'
    AND n.publication_status = 'published'
    AND ch.first_appearance_volume IS NOT NULL
    AND ch.first_appearance_volume <= target.volume_number
    AND ch.spoiler_safe_description IS NOT NULL
  UNION ALL
  SELECT 'glossary'::text, g.term, g.spoiler_safe_definition, g.first_appearance_volume
  FROM public.glossary_terms g
  JOIN public.volumes target ON target.novel_id = g.novel_id
  JOIN public.novels n ON n.id = target.novel_id
  WHERE target.id = p_volume_id
    AND target.publication_status = 'published'
    AND n.publication_status = 'published'
    AND g.first_appearance_volume IS NOT NULL
    AND g.first_appearance_volume <= target.volume_number
    AND g.spoiler_safe_definition IS NOT NULL
  ORDER BY 4, 1, 2;
$$;
GRANT EXECUTE ON FUNCTION public.get_safe_volume_knowledge(uuid) TO anon, authenticated;
