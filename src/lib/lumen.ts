import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type PublicationStatus = "draft"|"processing"|"review"|"published"|"archived";
export type CatalogChapter = { id:string; chapter_number:number; title:string; slug:string; start_page:number|null; end_page:number|null; spoiler_safe_summary:string|null; publication_status?:PublicationStatus };
export type CatalogVolume = { id:string; volume_number:number; title:string; subtitle:string|null; description:string|null; page_count:number|null; attribution_text?:string|null; publication_status?:PublicationStatus; pdf_path?:string|null; published_at?:string|null; chapters:CatalogChapter[] };
export type CatalogBook = { id:string; slug:string; title:string; alternate_title:string|null; author:string|null; description:string|null; cover_path:string|null; genres:string[]; language:string; rating_avg:number|null; rating_count:number; featured:boolean; publication_status?:PublicationStatus; volumes:CatalogVolume[] };
export type UserBookmark = { id:string; volume_id:string; chapter_id:string|null; page_number:number; note:string|null; created_at:string };
export type ReadingProgress = { volume_id:string; chapter_id:string|null; page_number:number; progress_percent:number; last_read_at:string };

export type ProcessingJob = {
  id:string;
  volume_id:string|null;
  input_path:string;
  status:"queued"|"processing"|"review"|"completed"|"failed"|"cancelled";
  current_stage:string|null;
  progress_percent:number;
  error_message:string|null;
  started_at:string|null;
  finished_at:string|null;
  created_at:string;
  updated_at:string;
  file_size_bytes:number|null;
};

export type ProcessingStage = {
  id:string;
  job_id:string;
  stage_order:number;
  stage_key:string;
  status:"waiting"|"running"|"completed"|"failed"|"skipped";
  progress_percent:number;
  started_at:string|null;
  finished_at:string|null;
  error_message:string|null;
  metadata:Record<string, unknown>;
};

export type ProcessingLog = {
  id:number;
  job_id:string;
  created_at:string;
  level:"debug"|"info"|"ai"|"warn"|"error";
  message:string;
  metadata:Record<string, unknown>;
};

export async function fetchLatestProcessingJob(volumeId:string):Promise<ProcessingJob|null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("processing_jobs")
    .select("id,volume_id,input_path,status,current_stage,progress_percent,error_message,started_at,finished_at,created_at,updated_at,file_size_bytes")
    .eq("volume_id", volumeId)
    .order("created_at",{ascending:false})
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as ProcessingJob | null;
}

export async function fetchProcessingStages(jobId:string):Promise<ProcessingStage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("processing_job_stages")
    .select("id,job_id,stage_order,stage_key,status,progress_percent,started_at,finished_at,error_message,metadata")
    .eq("job_id", jobId)
    .order("stage_order",{ascending:true});
  if (error) throw error;
  return (data ?? []) as ProcessingStage[];
}

export async function fetchProcessingLogs(jobId:string):Promise<ProcessingLog[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("processing_job_logs")
    .select("id,job_id,created_at,level,message,metadata")
    .eq("job_id", jobId)
    .order("created_at",{ascending:false})
    .limit(40);
  if (error) throw error;
  return (data ?? []).reverse() as ProcessingLog[];
}


export type CommunityPost = {
  id:string;
  user_id:string;
  novel_id:string|null;
  content:string;
  is_spoiler:boolean;
  created_at:string;
  display_name:string;
  novel_title:string|null;
  comments:CommunityComment[];
};
export type CommunityComment = {
  id:string;
  post_id:string;
  user_id:string;
  content:string;
  is_spoiler:boolean;
  created_at:string;
  display_name:string;
};

export type VolumeReview = {
  volume: CatalogVolume & { novel_id:string };
  novel: { id:string; title:string; slug:string; alternate_title:string|null; author:string|null; description:string|null; cover_path:string|null; genres:string[]; language:string; publication_status:PublicationStatus };
  chapters: Array<CatalogChapter & { word_count:number|null; summary:string|null }>;
  page_count:number;
  chunk_count:number;
  character_count:number;
  glossary_count:number;
};

export async function fetchAdminCatalog():Promise<CatalogBook[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("novels")
    .select("id,slug,title,alternate_title,author,description,cover_path,genres,language,rating_avg,rating_count,featured,publication_status,updated_at,volumes(id,novel_id,volume_number,title,subtitle,description,page_count,attribution_text,pdf_path,publication_status,published_at,updated_at,chapters(id,chapter_number,title,slug,start_page,end_page,spoiler_safe_summary,publication_status))")
    .order("updated_at",{ascending:false});
  if (error) throw error;
  return (data ?? []).map((book:any)=>({
    ...book,
    genres:book.genres??[],
    volumes:(book.volumes??[]).sort((a:any,b:any)=>a.volume_number-b.volume_number).map((v:any)=>({...v,chapters:(v.chapters??[]).sort((a:any,b:any)=>a.chapter_number-b.chapter_number)})),
  })) as CatalogBook[];
}

export async function createVolume(args:{novelId:string;volumeNumber:number;title:string;subtitle?:string;description?:string}) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi.");
  const {data,error}=await supabase.from("volumes").insert({
    novel_id:args.novelId,
    volume_number:args.volumeNumber,
    title:args.title.trim(),
    subtitle:args.subtitle?.trim()||null,
    description:args.description?.trim()||null,
    publication_status:"draft",
    metadata:{},
  }).select("id").single();
  if(error) throw error;
  return data.id as string;
}

export async function updateNovelMetadata(args:{novelId:string;title:string;alternateTitle?:string;author?:string;description?:string;genres?:string[];language?:string;featured?:boolean}) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi.");
  const {error}=await supabase.from("novels").update({
    title:args.title.trim(),
    alternate_title:args.alternateTitle?.trim()||null,
    author:args.author?.trim()||null,
    description:args.description?.trim()||null,
    genres:(args.genres??[]).map(x=>x.trim()).filter(Boolean).slice(0,12),
    language:(args.language?.trim()||"en").toLowerCase(),
    featured:Boolean(args.featured),
    updated_at:new Date().toISOString(),
  }).eq("id",args.novelId);
  if(error) throw error;
}

export async function updateVolumeMetadata(args:{volumeId:string;volumeNumber:number;title:string;subtitle?:string;description?:string}) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi.");
  const {error}=await supabase.from("volumes").update({
    volume_number:args.volumeNumber,
    title:args.title.trim(),
    subtitle:args.subtitle?.trim()||null,
    description:args.description?.trim()||null,
    updated_at:new Date().toISOString(),
  }).eq("id",args.volumeId);
  if(error) throw error;
}

export async function uploadNovelCover(args:{novelId:string;file:File}) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi.");
  if(!args.file.type.startsWith("image/")) throw new Error("Cover harus berupa gambar.");
  if(args.file.size>10*1024*1024) throw new Error("Ukuran cover maksimal 10 MB.");
  const safeName=args.file.name.replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")||"cover";
  const path=args.novelId+"/"+crypto.randomUUID()+"-"+safeName;
  const upload=await supabase.storage.from("novel-covers").upload(path,args.file,{contentType:args.file.type,upsert:false,cacheControl:"3600"});
  if(upload.error) throw upload.error;
  const url=supabase.storage.from("novel-covers").getPublicUrl(path).data.publicUrl;
  const {error}=await supabase.from("novels").update({cover_path:url,updated_at:new Date().toISOString()}).eq("id",args.novelId);
  if(error){await supabase.storage.from("novel-covers").remove([path]).catch(()=>undefined);throw error;}
  return url;
}

export async function updateChapterReview(args:{chapterId:string;title:string;summary?:string;spoilerSafeSummary?:string;status?:PublicationStatus}) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi.");
  const {error}=await supabase.from("chapters").update({
    title:args.title.trim(),
    summary:args.summary?.trim()||null,
    spoiler_safe_summary:args.spoilerSafeSummary?.trim()||args.summary?.trim()||null,
    publication_status:args.status??"draft",
    updated_at:new Date().toISOString(),
  }).eq("id",args.chapterId);
  if(error) throw error;
}

export async function fetchVolumeReview(volumeId:string):Promise<VolumeReview|null> {
  if (!supabase) return null;
  const {data:volume,error:volumeError}=await supabase.from("volumes")
    .select("id,novel_id,volume_number,title,subtitle,description,page_count,pdf_path,publication_status,published_at,chapters(id,chapter_number,title,slug,start_page,end_page,spoiler_safe_summary,publication_status,word_count,summary)")
    .eq("id",volumeId).maybeSingle();
  if(volumeError) throw volumeError;
  if(!volume) return null;
  const {data:novel,error:novelError}=await supabase.from("novels")
    .select("id,slug,title,alternate_title,author,description,cover_path,genres,language,publication_status")
    .eq("id",volume.novel_id).maybeSingle();
  if(novelError) throw novelError;
  if(!novel) return null;
  const chapterIds=(volume.chapters??[]).map((c:any)=>c.id);
  const [pages,chunksCount,chars,glossary]=await Promise.all([
    chapterIds.length?supabase.from("chapter_pages").select("id",{count:"exact",head:true}).in("chapter_id",chapterIds):Promise.resolve({count:0,error:null} as any),
    chapterIds.length?supabase.from("chapter_chunks").select("id",{count:"exact",head:true}).in("chapter_id",chapterIds):Promise.resolve({count:0,error:null} as any),
    supabase.from("characters").select("id",{count:"exact",head:true}).eq("novel_id",volume.novel_id),
    supabase.from("glossary_terms").select("id",{count:"exact",head:true}).eq("novel_id",volume.novel_id),
  ]);
  for(const item of [pages,chunksCount,chars,glossary]) if(item.error) throw item.error;
  return {
    volume:{...volume,novel_id:volume.novel_id,chapters:(volume.chapters??[]).sort((a:any,b:any)=>a.chapter_number-b.chapter_number)} as VolumeReview["volume"],
    novel:{...novel,genres:novel.genres??[]} as VolumeReview["novel"],
    chapters:(volume.chapters??[]) as VolumeReview["chapters"],
    page_count:pages.count??0,
    chunk_count:chunksCount.count??0,
    character_count:chars.count??0,
    glossary_count:glossary.count??0,
  };
}

function invokeFunctionWithMessage<T>(name:string,body:Record<string,unknown>) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi.");
  return supabase.functions.invoke<T>(name,{body});
}

export async function publishVolume(volumeId:string) {
  const response=await invokeFunctionWithMessage<{ok:boolean;volume_id:string;status:string}>("publish-volume",{volume_id:volumeId});
  if(response.error){
    const context=(response.error as {context?:Response}).context;
    let message=response.error.message||"Publish failed.";
    if(context){try{const payload=await context.clone().json();if(typeof payload?.error==="string")message=payload.error;}catch{}}
    return {data:response.data,error:new Error(message)};
  }
  return response;
}

export async function getPublishedPdfUrl(volumeId:string):Promise<string> {
  const response=await invokeFunctionWithMessage<{url:string;expires_in:number}>("get-volume-pdf-url",{volume_id:volumeId});
  if(response.error){
    const context=(response.error as {context?:Response}).context;
    let message=response.error.message||"Could not load original PDF.";
    if(context){try{const payload=await context.clone().json();if(typeof payload?.error==="string")message=payload.error;}catch{}}
    throw new Error(message);
  }
  if(!response.data?.url) throw new Error("Original PDF URL was not returned.");
  return response.data.url;
}

export async function fetchCommunityPosts():Promise<CommunityPost[]> {
  if (!supabase) return [];
  const {data,error}=await supabase.from("community_posts").select("id,user_id,novel_id,content,is_spoiler,created_at").order("created_at",{ascending:false}).limit(50);
  if(error) throw error;
  const posts=data??[];
  const userIds=Array.from(new Set(posts.map((p:any)=>p.user_id)));
  const novelIds=Array.from(new Set(posts.map((p:any)=>p.novel_id).filter(Boolean)));
  const [profiles,novels,comments]=await Promise.all([
    userIds.length?supabase.from("profiles").select("id,display_name,username").in("id",userIds):Promise.resolve({data:[],error:null} as any),
    novelIds.length?supabase.from("novels").select("id,title").in("id",novelIds):Promise.resolve({data:[],error:null} as any),
    posts.length?supabase.from("community_comments").select("id,post_id,user_id,content,is_spoiler,created_at").in("post_id",posts.map((p:any)=>p.id)).order("created_at",{ascending:true}):Promise.resolve({data:[],error:null} as any),
  ]);
  if(profiles.error) throw profiles.error;if(novels.error) throw novels.error;if(comments.error) throw comments.error;
  const profileMap=new Map((profiles.data??[]).map((p:any)=>[p.id,p.display_name||p.username||"Lumen Reader"]));
  const novelMap=new Map((novels.data??[]).map((n:any)=>[n.id,n.title]));
  const commentUserIds=Array.from(new Set((comments.data??[]).map((c:any)=>c.user_id).filter((id:any)=>!profileMap.has(id)))) as string[];
  if(commentUserIds.length){const extra=await supabase.from("profiles").select("id,display_name,username").in("id",commentUserIds);if(extra.error)throw extra.error;for(const p of extra.data??[])profileMap.set(p.id,p.display_name||p.username||"Lumen Reader");}
  const commentMap=new Map<string,CommunityComment[]>();
  for(const c of comments.data??[]){const row={...c,display_name:profileMap.get(c.user_id)||"Lumen Reader"} as CommunityComment;if(!commentMap.has(c.post_id))commentMap.set(c.post_id,[]);commentMap.get(c.post_id)!.push(row);}
  return posts.map((p:any)=>({...p,display_name:profileMap.get(p.user_id)||"Lumen Reader",novel_title:p.novel_id?novelMap.get(p.novel_id)||null:null,comments:commentMap.get(p.id)||[]})) as CommunityPost[];
}

export async function createCommunityPost(args:{userId:string;content:string;novelId?:string|null;isSpoiler?:boolean}) {
  if(!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi.");
  const text=args.content.trim();if(!text)throw new Error("Post tidak boleh kosong.");
  const {error}=await supabase.from("community_posts").insert({user_id:args.userId,content:text.slice(0,4000),novel_id:args.novelId||null,is_spoiler:Boolean(args.isSpoiler)});
  if(error)throw error;
}

export async function createCommunityComment(args:{userId:string;postId:string;content:string;isSpoiler?:boolean}) {
  if(!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi.");
  const text=args.content.trim();if(!text)throw new Error("Komentar tidak boleh kosong.");
  const {error}=await supabase.from("community_comments").insert({post_id:args.postId,user_id:args.userId,content:text.slice(0,2000),is_spoiler:Boolean(args.isSpoiler)});
  if(error)throw error;
}


export type BookshelfStatus = "reading"|"plan_to_read"|"completed"|"dropped";
export type BookshelfItem = { novel_id:string; status:BookshelfStatus; updated_at?:string };
export type UserRating = { id:string; novel_id:string|null; volume_id:string|null; score:number; verified_reader:boolean; review:string|null };
export type ReaderPreferences = { layout:"single"|"spread"|"scroll"; direction:"ltr"|"rtl"; theme:"light"|"sepia"|"dark"|"amoled" };
export type SafeKnowledgeEntry = { kind:"character"|"glossary"; term:string; description:string; first_appearance_volume:number };

export async function fetchUserBookshelf(userId:string):Promise<BookshelfItem[]> {
  if(!supabase) return [];
  const {data,error}=await (supabase as any).from("bookshelf_items").select("novel_id,status,updated_at").eq("user_id",userId);
  if(error) throw error;
  return (data??[]) as BookshelfItem[];
}
export async function saveBookshelfStatus(args:{userId:string;novelId:string;status:BookshelfStatus|null}) {
  if(!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi.");
  const table=(supabase as any).from("bookshelf_items");
  if(!args.status){const {error}=await table.delete().eq("user_id",args.userId).eq("novel_id",args.novelId);if(error)throw error;return;}
  const {error}=await table.upsert({user_id:args.userId,novel_id:args.novelId,status:args.status,updated_at:new Date().toISOString()},{onConflict:"user_id,novel_id"});
  if(error) throw error;
}
export async function fetchUserRatings(userId:string):Promise<UserRating[]> {
  if(!supabase) return [];
  const {data,error}=await (supabase as any).from("ratings").select("id,novel_id,volume_id,score,verified_reader,review").eq("user_id",userId);
  if(error) throw error;
  return (data??[]) as UserRating[];
}
export async function saveUserRating(args:{userId:string;novelId?:string;volumeId?:string;score:number|null}) {
  if(!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi.");
  if(Boolean(args.novelId)===Boolean(args.volumeId)) throw new Error("Pilih satu target rating: seri atau volume.");
  if(args.score!==null&&(!Number.isInteger(args.score)||args.score<1||args.score>10)) throw new Error("Rating harus 1–10.");
  const table=(supabase as any).from("ratings");
  let query=table.select("id").eq("user_id",args.userId);
  query=args.novelId?query.eq("novel_id",args.novelId).is("volume_id",null):query.eq("volume_id",args.volumeId).is("novel_id",null);
  const {data:existing,error:findError}=await query.maybeSingle();
  if(findError) throw findError;
  if(args.score===null){if(existing?.id){const {error}=await table.delete().eq("id",existing.id);if(error)throw error;}return;}
  const values={user_id:args.userId,novel_id:args.novelId??null,volume_id:args.volumeId??null,score:args.score,updated_at:new Date().toISOString()};
  const {error}=existing?.id?await table.update(values).eq("id",existing.id):await table.insert(values);
  if(error) throw error;
}
export async function fetchReaderPreferences(userId:string):Promise<ReaderPreferences|null> {
  if(!supabase) return null;
  const {data,error}=await (supabase as any).from("profiles").select("reader_preferences").eq("id",userId).maybeSingle();
  if(error) throw error;
  return (data?.reader_preferences??null) as ReaderPreferences|null;
}
export async function saveReaderPreferences(userId:string,prefs:ReaderPreferences) {
  if(!supabase) return;
  const {error}=await (supabase as any).from("profiles").update({reader_preferences:prefs,updated_at:new Date().toISOString()}).eq("id",userId);
  if(error) throw error;
}
export async function fetchSafeVolumeKnowledge(volumeId:string):Promise<SafeKnowledgeEntry[]> {
  if(!supabase) return [];
  const {data,error}=await (supabase as any).rpc("get_safe_volume_knowledge",{p_volume_id:volumeId});
  if(error) throw error;
  return (data??[]) as SafeKnowledgeEntry[];
}

export async function fetchCatalog(): Promise<CatalogBook[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("novels").select("id,slug,title,alternate_title,author,description,cover_path,genres,language,rating_avg,rating_count,featured,volumes(id,volume_number,title,subtitle,description,page_count,attribution_text,chapters(id,chapter_number,title,slug,start_page,end_page,spoiler_safe_summary))").eq("publication_status","published").order("featured",{ascending:false}).order("updated_at",{ascending:false});
  if (error) throw error;
  return (data ?? []).map((book) => ({ ...book, genres: book.genres ?? [], volumes: (book.volumes ?? []).sort((a,b) => a.volume_number - b.volume_number) })) as CatalogBook[];
}

export async function fetchUserProgress(userId:string):Promise<ReadingProgress[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("reading_progress").select("volume_id,chapter_id,page_number,progress_percent,last_read_at").eq("user_id",userId).order("last_read_at",{ascending:false});
  if (error) throw error;
  return (data ?? []) as ReadingProgress[];
}

export async function saveReadingProgress(args:{user:User;volumeId:string;chapterId:string|null;pageNumber:number;progressPercent:number}) {
  if (!supabase) return;
  const { error } = await supabase.from("reading_progress").upsert({ user_id:args.user.id, volume_id:args.volumeId, chapter_id:args.chapterId, page_number:args.pageNumber, progress_percent:Math.max(0,Math.min(100,args.progressPercent)), last_read_at:new Date().toISOString(), updated_at:new Date().toISOString() });
  if (error) throw error;
}

export async function fetchUserBookmarks(userId:string):Promise<UserBookmark[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("bookmarks").select("id,volume_id,chapter_id,page_number,note,created_at").eq("user_id",userId).order("created_at",{ascending:false});
  if (error) throw error;
  return (data ?? []) as UserBookmark[];
}

export async function toggleBookmark(args:{user:User;volumeId:string;chapterId:string|null;pageNumber:number}):Promise<boolean> {
  if (!supabase) return false;
  const existing = await supabase.from("bookmarks").select("id").eq("user_id",args.user.id).eq("volume_id",args.volumeId).eq("page_number",args.pageNumber).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    const { error } = await supabase.from("bookmarks").delete().eq("id",existing.data.id);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from("bookmarks").insert({ user_id:args.user.id, volume_id:args.volumeId, chapter_id:args.chapterId, page_number:args.pageNumber });
  if (error) throw error;
  return true;
}

export type ChapterPage = {
  id:string;
  chapter_id:string;
  page_number:number;
  source_pdf_page:number|null;
  content:string;
  ocr_used:boolean;
  extraction_confidence:number|null;
};

export async function fetchChapterPages(chapterId:string):Promise<ChapterPage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("chapter_pages")
    .select("id,chapter_id,page_number,source_pdf_page,content,ocr_used,extraction_confidence")
    .eq("chapter_id", chapterId)
    .order("page_number", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ChapterPage[];
}

export async function signIn(email:string,password:string){ if(!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi."); return supabase.auth.signInWithPassword({email,password}); }
export async function signUp(email:string,password:string,displayName:string){
  if(!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi.");
  // Use the current site origin instead of a stale hard-coded URL.
  const emailRedirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
  return supabase.auth.signUp({
    email,
    password,
    options:{
      data:{full_name:displayName},
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
    }
  });
}
export async function signOut(){ if(!supabase) return; const {error}=await supabase.auth.signOut(); if(error) throw error; }

export async function uploadVolumePdf(args:{user:User;volumeId:string;file:File}) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi.");
  if (args.file.type !== "application/pdf") throw new Error("File harus berupa PDF.");
  const maxBytes = 500 * 1024 * 1024;
  if (args.file.size > maxBytes) throw new Error("PDF terlalu besar. Batas penyimpanan Lumen adalah 500 MB.");

  const safeName = args.file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "volume.pdf";
  const path = `${args.volumeId}/${crypto.randomUUID()}-${safeName}`;

  const upload = await supabase.storage.from("novel-pdfs").upload(path, args.file, {
    contentType: "application/pdf",
    upsert: false,
    cacheControl: "3600",
  });
  if (upload.error) throw upload.error;

  const { error: volumeError } = await supabase
    .from("volumes")
    .update({ pdf_path: path, publication_status: "processing" })
    .eq("id", args.volumeId);
  if (volumeError) {
    await supabase.storage.from("novel-pdfs").remove([path]).catch(() => undefined);
    throw volumeError;
  }

  const { data: job, error: jobError } = await supabase
    .from("processing_jobs")
    .insert({
      volume_id: args.volumeId,
      input_path: path,
      status: "queued",
      created_by: args.user.id,
      file_size_bytes: args.file.size,
    })
    .select("id")
    .single();
  if (jobError || !job) {
    await supabase.storage.from("novel-pdfs").remove([path]).catch(() => undefined);
    throw jobError ?? new Error("Processing job could not be created.");
  }

  const stages = [
    "validate_file","extract_text_ocr","analyze_structure","detect_chapters",
    "extract_metadata","generate_summaries","characters_glossary",
    "generate_embeddings","human_review","publish",
  ];
  const { error: stagesError } = await supabase.from("processing_job_stages").insert(
    stages.map((stage_key,index)=>({job_id:job.id,stage_order:index+1,stage_key,status:"waiting",progress_percent:0}))
  );
  if (stagesError) throw stagesError;

  return job.id;
}

export async function fetchCurrentUserRole():Promise<"reader"|"editor"|"admin"> {
  if (!supabase) return "reader";
  const response = await supabase.functions.invoke<{role:"reader"|"editor"|"admin"}>("get-my-role", { body: {} });
  if (response.error) throw response.error;
  return response.data?.role ?? "reader";
}

function edgeFunctionErrorMessage(error: unknown, fallback: string) {
  const candidate = error as { message?: string; context?: Response };
  return candidate?.message || fallback;
}

export async function createNovel(args:{
  user:User;
  title:string;
  alternateTitle?:string;
  author?:string;
  description?:string;
  genres?:string[];
  language?:string;
  volumeNumber?:number;
  volumeTitle?:string;
  volumeSubtitle?:string;
}){
  if (!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi.");
  const response = await supabase.functions.invoke<{novel_id:string;volume_id:string;slug:string}>("create-novel", {
    body:{
      title:args.title,
      alternate_title:args.alternateTitle ?? null,
      author:args.author ?? null,
      description:args.description ?? null,
      genres:args.genres ?? [],
      language:args.language ?? "en",
      volume_number:args.volumeNumber ?? 1,
      volume_title:args.volumeTitle ?? "Volume " + (args.volumeNumber ?? 1),
      volume_subtitle:args.volumeSubtitle ?? null,
    }
  });
  if (response.error) {
    const context = (response.error as { context?: Response }).context;
    let message = edgeFunctionErrorMessage(response.error, "Novel creation failed.");
    if (context) {
      try {
        const payload = await context.clone().json();
        if (typeof payload?.error === "string") message = payload.error;
      } catch {
        /* Keep the SDK error when the response body is not JSON. */
      }
    }
    return { data: response.data, error: new Error(message) };
  }
  return response;
}

export async function startProcessingJob(jobId:string) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi.");
  return supabase.functions.invoke("process-volume", { body: { job_id: jobId } });
}

export type SemanticSearchResult = {
  score:number;
  similarity:number;
  title:string;
  chapter:string;
  book:string;
  novel_slug:string;
  chapter_id:string;
  volume_id:string;
  excerpt:string;
  why:string;
};

export async function semanticSearch(args:{query:string;matchCount?:number;matchThreshold?:number}) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi.");
  return supabase.functions.invoke<{query:string;count:number;results:SemanticSearchResult[]}>("semantic-search", {
    body: {
      query: args.query,
      match_count: args.matchCount ?? 8,
      match_threshold: args.matchThreshold ?? 0.55,
    },
  });
}


export type UserNotification = {
  id:string;
  notification_type:string;
  title:string;
  body:string;
  link:string|null;
  metadata:Record<string,unknown>;
  created_at:string;
  read_at:string|null;
};

export async function fetchUserNotifications(userId:string):Promise<UserNotification[]> {
  if(!supabase) return [];
  const {data,error}=await (supabase as any).from("notifications")
    .select("id,notification_type,title,body,link,metadata,created_at,read_at")
    .eq("user_id",userId).order("created_at",{ascending:false}).limit(30);
  if(error) throw error;
  return (data??[]) as UserNotification[];
}
export async function markNotificationsRead(userId:string,ids:string[]) {
  if(!supabase||!ids.length) return;
  const {error}=await (supabase as any).from("notifications")
    .update({read_at:new Date().toISOString()}).eq("user_id",userId).in("id",ids).is("read_at",null);
  if(error) throw error;
}
