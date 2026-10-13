import { withSupabase } from "../_shared/with-supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "novel";
}

Deno.serve(
  withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
      const body = await req.json();
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) return Response.json({ error: "Title is required." }, { status: 400, headers: corsHeaders });

      const { data: roleRow, error: roleError } = await ctx.supabaseAdmin
        .schema("private")
        .from("user_roles")
        .select("role")
        .eq("user_id", ctx.userClaims?.id)
        .maybeSingle();

      if (roleError || !roleRow || !["editor", "admin"].includes(roleRow.role)) {
        return Response.json({ error: "Editor or admin role required." }, { status: 403, headers: corsHeaders });
      }

      const baseSlug = slugify(title);
      let slug = baseSlug;

      const { data: exact } = await ctx.supabaseAdmin.from("novels").select("id").eq("slug", slug).maybeSingle();
      if (exact?.id) {
        const suffix = Math.random().toString(36).slice(2, 7);
        slug = (baseSlug.slice(0, 114) + "-" + suffix).replace(/-+/g, "-");
      }

      const genres = Array.isArray(body.genres)
        ? body.genres.filter((item: unknown): item is string => typeof item === "string").map((item: string) => item.trim()).filter(Boolean).slice(0, 12)
        : [];

      const language = typeof body.language === "string" && body.language.trim() ? body.language.trim().toLowerCase().slice(0, 16) : "en";
      const volumeNumber = Number.isInteger(body.volume_number) && body.volume_number > 0 ? body.volume_number : 1;
      const volumeTitle = typeof body.volume_title === "string" && body.volume_title.trim() ? body.volume_title.trim() : "Volume " + volumeNumber;

      const { data: novel, error: novelError } = await ctx.supabaseAdmin
        .from("novels")
        .insert({
          slug,
          title,
          alternate_title: typeof body.alternate_title === "string" && body.alternate_title.trim() ? body.alternate_title.trim() : null,
          author: typeof body.author === "string" && body.author.trim() ? body.author.trim() : null,
          description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
          genres,
          language,
          publication_status: "draft",
          featured: false,
          rating_count: 0,
          created_by: ctx.userClaims?.id ?? null,
        })
        .select("id,slug")
        .single();

      if (novelError || !novel) throw novelError ?? new Error("Novel could not be created.");

      const { data: volume, error: volumeError } = await ctx.supabaseAdmin
        .from("volumes")
        .insert({
          novel_id: novel.id,
          volume_number: volumeNumber,
          title: volumeTitle,
          subtitle: typeof body.volume_subtitle === "string" && body.volume_subtitle.trim() ? body.volume_subtitle.trim() : null,
          publication_status: "draft",
          metadata: {},
        })
        .select("id")
        .single();

      if (volumeError || !volume) {
        await ctx.supabaseAdmin.from("novels").delete().eq("id", novel.id);
        throw volumeError ?? new Error("Initial volume could not be created.");
      }

      return Response.json(
        { ok: true, novel_id: novel.id, volume_id: volume.id, slug: novel.slug },
        { headers: corsHeaders },
      );
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Novel creation failed." },
        { status: 500, headers: corsHeaders },
      );
    }
  }),
);
