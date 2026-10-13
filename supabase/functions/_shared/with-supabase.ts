import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AuthMode = "user" | "optional" | "none";
type HandlerContext = {
  supabaseAdmin: ReturnType<typeof createClient>;
  supabaseUser: ReturnType<typeof createClient>;
  userClaims: { id: string } | null;
};

export function withSupabase(
  config: { auth?: AuthMode },
  handler: (req: Request, ctx: HandlerContext) => Promise<Response> | Response,
) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
    if (!url || !anonKey || !serviceKey) {
      return Response.json({ error: "Supabase function secrets are not configured." }, { status: 500, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const tokenMatch = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
    const token = tokenMatch ? tokenMatch[1] : null;
    const supabaseUser = createClient(url, anonKey, {
      global: token ? { headers: { Authorization: "Bearer " + token } } : {},
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    let user: { id: string } | null = null;
    if (token) {
      const { data, error } = await supabaseUser.auth.getUser(token);
      if (!error && data.user) user = { id: data.user.id };
    }
    if ((config.auth ?? "user") === "user" && !user) {
      return Response.json({ error: "Authentication required." }, { status: 401, headers: corsHeaders });
    }
    try {
      const response = await handler(req, { supabaseAdmin, supabaseUser, userClaims: user });
      for (const [key, value] of Object.entries(corsHeaders)) {
        if (!response.headers.has(key)) response.headers.set(key, value);
      }
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected server error.";
      return Response.json({ error: message }, { status: 500, headers: corsHeaders });
    }
  };
}
