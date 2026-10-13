import { withSupabase } from "../_shared/with-supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(
  withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    const { data, error } = await ctx.supabaseAdmin
      .schema("private")
      .from("user_roles")
      .select("role")
      .eq("user_id", ctx.userClaims?.id)
      .maybeSingle();

    if (error) {
      return Response.json({ error: "Unable to load account role." }, { status: 500, headers: corsHeaders });
    }

    const role = data?.role === "admin" || data?.role === "editor" ? data.role : "reader";
    return Response.json({ role }, { headers: corsHeaders });
  }),
);
