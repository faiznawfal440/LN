import { withSupabase } from "../_shared/with-supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SearchRow = {
  chunk_id: string;
  chapter_id: string;
  chapter_number: number;
  chapter_title: string;
  volume_id: string;
  volume_number: number;
  volume_title: string;
  novel_id: string;
  novel_slug: string;
  novel_title: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

Deno.serve(
  withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return Response.json(
        { error: "POST is required." },
        { status: 405, headers: corsHeaders },
      );
    }

    try {
      const body = await req.json();
      const query = typeof body?.query === "string" ? body.query.trim() : "";
      const requestedCount = Number.isFinite(body?.match_count)
        ? Number(body.match_count)
        : 8;

      if (query.length < 2) {
        return Response.json(
          { error: "Query must contain at least 2 characters." },
          { status: 400, headers: corsHeaders },
        );
      }

      const apiKey = Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) {
        return Response.json(
          { error: "OPENAI_API_KEY is not configured for semantic search." },
          { status: 503, headers: corsHeaders },
        );
      }

      const embeddingResponse = await fetch(
        "https://api.openai.com/v1/embeddings",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: query.slice(0, 8000),
            encoding_format: "float",
          }),
        },
      );

      const embeddingPayload = await embeddingResponse.json();
      if (!embeddingResponse.ok) {
        throw new Error(
          embeddingPayload?.error?.message || "Embedding request failed.",
        );
      }

      const vector = embeddingPayload?.data?.[0]?.embedding;
      if (!Array.isArray(vector) || vector.length !== 1536) {
        throw new Error("Unexpected embedding dimensions.");
      }

      const matchCount = Math.max(1, Math.min(20, Math.floor(requestedCount)));
      const matchThreshold = typeof body?.match_threshold === "number"
        ? Math.max(0, Math.min(0.95, body.match_threshold))
        : 0.55;

      const { data, error } = await ctx.supabaseAdmin.rpc(
        "match_lumen_chunks",
        {
          query_embedding: `[${vector.join(",")}]`,
          match_threshold: matchThreshold,
          match_count: matchCount,
        },
      );

      if (error) throw error;

      const results = (data ?? []) as SearchRow[];

      return Response.json(
        {
          query,
          count: results.length,
          results: results.map((row) => ({
            score: Math.round(row.similarity * 100),
            similarity: row.similarity,
            title: row.chapter_title,
            chapter: `Chapter ${row.chapter_number}`,
            book: `${row.novel_title} · Volume ${row.volume_number}`,
            novel_slug: row.novel_slug,
            chapter_id: row.chapter_id,
            volume_id: row.volume_id,
            excerpt: row.content.slice(0, 700),
            why: "Semantic match based on the meaning of the indexed scene.",
          })),
        },
        { headers: corsHeaders },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Semantic search failed.";
      return Response.json(
        { error: message },
        { status: 500, headers: corsHeaders },
      );
    }
  }),
);
