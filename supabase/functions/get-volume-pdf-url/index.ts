import { withSupabase } from "../_shared/with-supabase.ts";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
Deno.serve(withSupabase({auth:"user"},async(req,ctx)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
 try{
  const body=await req.json(); const volumeId=typeof body?.volume_id==="string"?body.volume_id:"";
  if(!volumeId) return Response.json({error:"volume_id is required."},{status:400,headers:corsHeaders});
  const {data:volume,error}=await ctx.supabaseAdmin.from("volumes").select("id,pdf_path,publication_status,novel_id").eq("id",volumeId).maybeSingle();
  if(error) throw error; if(!volume||volume.publication_status!=="published") return Response.json({error:"Published volume not found."},{status:404,headers:corsHeaders});
  const {data:novel}=await ctx.supabaseAdmin.from("novels").select("publication_status").eq("id",volume.novel_id).maybeSingle();
  if(novel?.publication_status!=="published"||!volume.pdf_path) return Response.json({error:"Published PDF is unavailable."},{status:404,headers:corsHeaders});
  const signed=await ctx.supabaseAdmin.storage.from("novel-pdfs").createSignedUrl(volume.pdf_path,1800);
  if(signed.error||!signed.data?.signedUrl) throw signed.error||new Error("Could not create signed PDF URL.");
  return Response.json({url:signed.data.signedUrl,expires_in:1800},{headers:corsHeaders});
 }catch(error){ return Response.json({error:error instanceof Error?error.message:"Could not load PDF."},{status:500,headers:corsHeaders}); }
}));