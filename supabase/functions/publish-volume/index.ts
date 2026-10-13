import { withSupabase } from "../_shared/with-supabase.ts";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
Deno.serve(withSupabase({auth:"user"},async(req,ctx)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
 try{
  const body=await req.json(); const volumeId=typeof body?.volume_id==="string"?body.volume_id:"";
  if(!volumeId) return Response.json({error:"volume_id is required."},{status:400,headers:corsHeaders});
  const {data:role,error:roleError}=await ctx.supabaseAdmin.rpc("lumen_get_user_role",{p_user_id:ctx.userClaims?.id});
  if(roleError||!["editor","admin"].includes(role??"")) return Response.json({error:"Editor or admin role required."},{status:403,headers:corsHeaders});
  const {data:volume,error:volumeError}=await ctx.supabaseAdmin.from("volumes").select("id,novel_id,volume_number,title,page_count,publication_status").eq("id",volumeId).maybeSingle();
  if(volumeError) throw volumeError; if(!volume) return Response.json({error:"Volume not found."},{status:404,headers:corsHeaders});
  if(volume.publication_status!=="review") return Response.json({error:"Only a volume awaiting human review can be published."},{status:409,headers:corsHeaders});
  const {data:permission,error:permissionError}=await ctx.supabaseAdmin.from("volume_permissions").select("permission_status,attribution_text,translator_name,permission_scope,consent_reference").eq("volume_id",volumeId).maybeSingle();
  if(permissionError) throw permissionError;
  if(!permission||permission.permission_status!=="approved"||!permission.attribution_text?.trim()||!permission.translator_name?.trim()||!permission.permission_scope?.trim()||!permission.consent_reference?.trim()) return Response.json({error:"Publishing is blocked until translator permission is approved and attribution is complete."},{status:422,headers:corsHeaders});
  const {data:chapters,error:chapterError}=await ctx.supabaseAdmin.from("chapters").select("id").eq("volume_id",volumeId).order("chapter_number");
  if(chapterError) throw chapterError; if(!chapters?.length) return Response.json({error:"Cannot publish without chapters."},{status:422,headers:corsHeaders});
  const {data:pages}=await ctx.supabaseAdmin.from("chapter_pages").select("id").in("chapter_id",chapters.map((c)=>c.id)).limit(1);
  if(!pages?.length) return Response.json({error:"Cannot publish without extracted chapter pages."},{status:422,headers:corsHeaders});
  const now=new Date().toISOString();
  await ctx.supabaseAdmin.from("chapters").update({publication_status:"published"}).eq("volume_id",volumeId);
  await ctx.supabaseAdmin.from("volumes").update({publication_status:"published",published_at:now,attribution_text:permission.attribution_text}).eq("id",volumeId);
  await ctx.supabaseAdmin.from("novels").update({publication_status:"published"}).eq("id",volume.novel_id);
  // Notification delivery is best-effort after publication succeeds.
  try{
   const {data:watchers}=await ctx.supabaseAdmin.from("bookshelf_items").select("user_id").eq("novel_id",volume.novel_id).in("status",["reading","plan_to_read"]);
   const recipients=[...new Set((watchers??[]).map((item)=>item.user_id))];
   if(recipients.length) await ctx.supabaseAdmin.from("notifications").insert(recipients.map((userId)=>({
    user_id:userId,notification_type:"new_volume",title:"New volume available",
    body:volume.title+" · Volume "+volume.volume_number+" is now published.",link:"/",
    metadata:{novel_id:volume.novel_id,volume_id:volumeId}
   })));
  }catch(notificationError){console.error("Notification delivery failed after publication.",notificationError);}
  const {data:jobs}=await ctx.supabaseAdmin.from("processing_jobs").select("id").eq("volume_id",volumeId).order("created_at",{ascending:false}).limit(1); const jobId=jobs?.[0]?.id;
  if(jobId){
   await ctx.supabaseAdmin.from("processing_job_stages").update({status:"completed",progress_percent:100,finished_at:now}).eq("job_id",jobId).eq("stage_key","human_review");
   await ctx.supabaseAdmin.from("processing_job_stages").update({status:"completed",progress_percent:100,started_at:now,finished_at:now}).eq("job_id",jobId).eq("stage_key","publish");
   await ctx.supabaseAdmin.from("processing_jobs").update({status:"completed",current_stage:"Published",progress_percent:100,finished_at:now,error_message:null}).eq("id",jobId);
   await ctx.supabaseAdmin.from("processing_job_logs").insert({job_id:jobId,level:"info",message:"Volume published successfully.",metadata:{volume_id:volumeId}});
  }
  return Response.json({ok:true,volume_id:volumeId,status:"published"},{headers:corsHeaders});
 }catch(error){ return Response.json({error:error instanceof Error?error.message:"Publish failed."},{status:500,headers:corsHeaders}); }
}));