import { useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { fetchCatalog, fetchAdminCatalog, fetchUserBookmarks, fetchUserProgress, saveReadingProgress, signIn, signUp, signOut, toggleBookmark, semanticSearch, startProcessingJob, uploadVolumePdf, createNovel, createVolume, updateNovelMetadata, updateVolumeMetadata, uploadNovelCover, updateChapterReview, fetchCurrentUserRole, fetchLatestProcessingJob, fetchProcessingStages, fetchProcessingLogs, fetchVolumeReview, publishVolume, getPublishedPdfUrl, fetchCommunityPosts, createCommunityPost, createCommunityComment, fetchUserBookshelf, saveBookshelfStatus, fetchUserRatings, saveUserRating, fetchReaderPreferences, saveReaderPreferences, fetchSafeVolumeKnowledge, fetchUserNotifications, markNotificationsRead, type UserNotification, type SafeKnowledgeEntry, type ReaderPreferences, type BookshelfItem, type BookshelfStatus, type UserRating, type CatalogBook, type UserBookmark, type SemanticSearchResult, type ProcessingJob, type ProcessingStage, type ProcessingLog, type VolumeReview, type CommunityPost } from "./lib/lumen";
import { supabase } from "./lib/supabase";

type View = "home" | "search" | "reader" | "admin" | "library" | "community" | "rights";
type IconName =
  | "home" | "compass" | "book" | "search" | "users" | "bell" | "settings"
  | "arrow" | "play" | "star" | "clock" | "bookmark" | "sparkles" | "menu"
  | "sun" | "moon" | "type" | "list" | "panel" | "upload" | "check" | "close"
  | "chevron" | "library" | "more" | "eye" | "filter";

const photos = {
  hero: "https://images.unsplash.com/photo-1760293887335-e58dd7bed957?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=1600",
  castle: "https://images.unsplash.com/photo-1785686460794-eb0f1f1b94d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=700",
  tower: "https://images.unsplash.com/photo-1550379964-cc8e907256a1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=700",
  hill: "https://images.unsplash.com/photo-1606922849712-0cb6c47f9f92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=700",
  moon: "https://images.unsplash.com/photo-1642677674839-b9e5b94ea88c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=700",
};

type DisplayBook = { title:string; alt:string; author:string; image:string; rating:string; tag:string; volume:string; fresh:boolean; novelSlug?:string; volumeId?:string; chapterId?:string; };
let books: DisplayBook[] = [
  { title: "The Saint of Hollow Skies", alt: "Sora no Seijo", author: "Mina Kurosawa", image: photos.castle, rating: "4.9", tag: "Fantasy", volume: "Vol. 4", fresh: true },
  { title: "Asteria Academy", alt: "Mahō Gakuen Asteria", author: "Ren Ishikawa", image: photos.tower, rating: "4.8", tag: "Academy", volume: "Vol. 7", fresh: true },
  { title: "The Last Cartographer", alt: "Saigo no Chizu-shi", author: "Aya Mori", image: photos.hill, rating: "4.7", tag: "Adventure", volume: "Vol. 3", fresh: false },
  { title: "Letters Beyond the Moon", alt: "Tsuki no Tegami", author: "Haru Senda", image: photos.moon, rating: "4.9", tag: "Drama", volume: "Vol. 6", fresh: false },
];

function catalogToDisplayBooks(items: CatalogBook[]): DisplayBook[] {
  return items.map((book) => {
    const volume = book.volumes.at(-1);
    return {
      title: book.title,
      alt: book.alternate_title ?? "",
      author: book.author ?? "Unknown author",
      image: book.cover_path ?? photos.castle,
      rating: book.rating_avg?.toFixed(1) ?? "—",
      tag: book.genres[0] ?? "Novel",
      volume: volume ? `Vol. ${volume.volume_number}` : "Novel",
      fresh: Boolean(book.featured),
      novelSlug: book.slug,
      volumeId: volume?.id,
      chapterId: volume?.chapters[0]?.id,
    };
  });
}

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
    compass: <><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/></>,
    book: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v16H7.5a3.5 3.5 0 0 0 0 7H20"/><path d="M4 5.5V21"/></>,
    library: <><path d="M4 4v16M9 4v16M14 5v15M18 4l2 16"/><path d="M2 20h20"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.1.38.3.73.6 1 .3.27.7.4 1.1.4h.1v4h-.1A1.7 1.7 0 0 0 19.4 15Z"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    play: <path d="m9 7 8 5-8 5V7Z"/>,
    star: <path d="m12 3 2.7 5.5 6 .9-4.35 4.2 1 6-5.35-2.85L6.65 19.6l1-6L3.3 9.4l6-.9L12 3Z"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    bookmark: <path d="M6 3h12v18l-6-4-6 4V3Z"/>,
    sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14ZM5 13l.8 2.2L8 16l-2.2.8L5 19l-.8-2.2L2 16l2.2-.8L5 13Z"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    moon: <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/>,
    type: <><path d="M4 7V4h16v3M9 20h6M12 4v16"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>,
    panel: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16"/></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
    filter: <path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z"/>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Button({ children, variant = "primary", icon, onClick, className = "", label, disabled }: { children?: ReactNode; variant?: "primary" | "secondary" | "ghost" | "icon"; icon?: IconName; onClick?: () => void; className?: string; label?: string; disabled?: boolean }) {
  return <button type="button" aria-label={label} className={`btn btn-${variant} ${className}`} onClick={onClick} disabled={disabled}>{icon && <Icon name={icon} />}{children}</button>;
}

function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="logo"><span className="logo-mark">L</span>{!compact && <span>Lumen</span>}</div>;
}

function Sidebar({ view, setView, onAuth, user }: { view: View; setView: (view: View) => void; onAuth: () => void; user: User | null }) {
  const items: { id: View | "library" | "community"; label: string; icon: IconName }[] = [
    { id: "home", label: "Home", icon: "home" }, { id: "search", label: "Explore", icon: "compass" },
    { id: "library", label: "My Library", icon: "library" }, { id: "community", label: "Community", icon: "users" },
  ];
  return <aside className="sidebar">
    <Logo />
    <nav className="side-nav" aria-label="Main navigation">
      {items.map((item) => <button type="button" key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} onClick={() => setView(item.id)}><Icon name={item.icon}/><span>{item.label}</span></button>)}
    </nav>
    <div className="side-label">Workspace</div>
    <button type="button" className={`nav-item ${view === "admin" ? "active" : ""}`} onClick={() => setView("admin")}><Icon name="sparkles"/><span>AI Studio</span></button>
    <div className="reading-goal">
      <div className="goal-ring"><span>72%</span></div>
      <div><strong>Weekly goal</strong><small>5h 46m of 8h</small></div>
    </div>
    <div className="sidebar-user"><span className="avatar">AK</span><div><strong>Akira K.</strong><small>Premium Reader</small></div><Icon name="more"/></div>
  </aside>;
}

function Topbar({ title, setView, user, onAuth }: { title?: string; setView: (view: View) => void; user: User | null; onAuth: () => void }) {
  const [items,setItems]=useState<UserNotification[]>([]);
  const [open,setOpen]=useState(false);
  const [notice,setNotice]=useState("");
  async function refresh(){
    if(!user){setItems([]);return;}
    try{setItems(await fetchUserNotifications(user.id));}catch(error){setNotice(error instanceof Error?error.message:"Could not load notifications.");}
  }
  useEffect(()=>{void refresh();},[user?.id]);
  async function markAllRead(){
    if(!user)return;
    const ids=items.filter((item)=>!item.read_at).map((item)=>item.id);
    if(!ids.length)return;
    try{await markNotificationsRead(user.id,ids);setItems((current)=>current.map((item)=>ids.includes(item.id)?{...item,read_at:new Date().toISOString()}:item));}
    catch(error){setNotice(error instanceof Error?error.message:"Could not mark notifications read.");}
  }
  const unread=items.filter((item)=>!item.read_at).length;
  return <header className="topbar">
    <div className="mobile-logo"><Logo compact /></div>
    {title && <strong className="page-title">{title}</strong>}
    <button type="button" className="search-trigger" onClick={() => setView("search")}><Icon name="search"/><span>Search stories, scenes, characters...</span><kbd>⌘ K</kbd></button>
    <div className="top-actions notification-anchor">
      <button type="button" className="rights-link" onClick={()=>setView("rights")}>Rights / takedown</button>
      <button type="button" className="icon-button notification-trigger" onClick={()=>{setOpen(v=>!v);setNotice("");if(!open)void refresh();}} aria-label="Notifications" aria-expanded={open}>
        <Icon name="bell"/>{unread>0&&<span className="notification-count">{unread>9?"9+":unread}</span>}
      </button>
      <button type="button" className="avatar small" onClick={onAuth} aria-label="Account">{user ? ((user.user_metadata?.full_name as string | undefined)?.slice(0,2).toUpperCase() || user.email?.slice(0,2).toUpperCase() || "LR") : "LR"}</button>
      {open&&<section className="notification-popover" aria-label="Notifications">
        <div className="notification-head"><div><strong>Notifications</strong><small>{unread?unread+" unread":"You’re all caught up"}</small></div><button type="button" onClick={()=>void markAllRead()} disabled={!unread}>Mark all read</button></div>
        {notice&&<p className="notification-notice">{notice}</p>}
        {!user?<div className="notification-empty"><p>Sign in to view your notifications.</p><button type="button" onClick={onAuth}>Sign in</button></div>:items.length===0?<div className="notification-empty"><p>No notifications yet.</p><small>New volume announcements will appear here.</small></div>:
          <div className="notification-list">{items.map(item=><article className={"notification-item "+(!item.read_at?"unread":"")} key={item.id}>
            <span className="notification-dot"/><div><strong>{item.title}</strong><p>{item.body}</p><small>{new Date(item.created_at).toLocaleString()}</small></div>
          </article>)}</div>}
      </section>}
    </div>
  </header>;
}

function BottomNav({ view, setView }: { view: View; setView: (view: View) => void }) {
  return <nav className="bottom-nav" aria-label="Mobile navigation">
    {([["home","home","Home"],["search","compass","Explore"],["reader","book","Reading"],["library","library","Library"]] as [View,IconName,string][]).map(([id,icon,label]) =>
      <button type="button" key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}><Icon name={icon}/><span>{label}</span></button>)}
  </nav>;
}

function BookCard({ book, onRead }: { book: DisplayBook; onRead: (book: DisplayBook) => void }) {
  return <article className="book-card" onClick={() => onRead(book)}>
    <div className="cover-wrap"><img src={book.image} alt={`Cover of ${book.title}`} /><span className="cover-volume">{book.volume}</span>{book.fresh && <span className="new-dot">NEW</span>}<button type="button" className="cover-play" aria-label={`Read ${book.title}`} onClick={(e)=>{e.stopPropagation(); onRead(book);}}><Icon name="play"/></button></div>
    <div className="book-meta"><div className="rating"><Icon name="star" size={14}/>{book.rating}</div><span>{book.tag}</span></div>
    <h3>{book.title}</h3><p>{book.alt}</p><small>{book.author}</small>
  </article>;
}

function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: string }) {
  return <div className="section-heading"><div>{eyebrow && <span>{eyebrow}</span>}<h2>{title}</h2></div>{action && <Button variant="ghost">{action}<Icon name="arrow"/></Button>}</div>;
}

function Home({ setView, catalog, progress, onRead }: { setView: (view: View) => void; catalog: CatalogBook[]; progress: Map<string, number>; onRead: (book: DisplayBook) => void }) {
  return <main className="page home-page">
    {catalog.length===0&&<div className="demo-catalog-note" role="status"><strong>Preview mode</strong><span>The interface is ready, but the live catalog is empty until Supabase is connected and a rights-cleared novel is published. The sample cards below are illustrative, not downloadable titles.</span></div>}
    <section className="hero">
      <img src={photos.hero} alt="" />
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <span className="hero-kicker"><Icon name="sparkles" size={16}/> Editor’s selection</span>
        <h1>Every world begins<br/>with a single page.</h1>
        <p>Discover extraordinary light novels, enhanced with spoiler-safe AI and crafted for immersive reading.</p>
        <div className="hero-actions"><Button onClick={() => onRead(books[0])} icon="play">Start reading</Button><Button variant="secondary" icon="compass" onClick={() => setView("search")}>Explore collection</Button></div>
      </div>
      <div className="hero-feature"><span>FEATURED SERIES</span><strong>The Saint of Hollow Skies</strong><small>Volume 4 · The Palace Above the Clouds</small><div className="hero-stats"><span><Icon name="star" size={15}/> 4.9</span><span><Icon name="clock" size={15}/> 7h 20m</span></div></div>
    </section>

    <section className="continue-section">
      <SectionHeading eyebrow="YOUR JOURNEY" title="Continue reading" action="View history"/>
      {(() => {
        const activeProgress = Array.from(progress.entries()).find(([, value]) => value > 0);
        const volumeId = activeProgress?.[0];
        const activeBook = catalog.find((book) => book.volumes.some((volume) => volume.id === volumeId)) ?? catalog[0];
        const activeVolume = activeBook?.volumes.find((volume) => volume.id === volumeId) ?? activeBook?.volumes.at(-1);
        const activeChapter = activeVolume?.chapters[0];
        const display = books.find((book) => book.volumeId === activeVolume?.id) ?? books[0];
        const pct = activeVolume ? Math.round(progress.get(activeVolume.id) ?? 0) : 0;
        return <article className="continue-card">
          <img src={display.image} alt={`Cover of ${activeBook?.title ?? display.title}`}/>
          <div className="continue-info"><div><span className="status-pill">{pct > 0 ? "READING" : "READY"}</span><small> {activeBook?.title ?? display.title} · {activeVolume?.title ?? display.volume}</small></div><h2>{activeChapter?.title ?? "Choose your next chapter"}</h2><p>{activeChapter ? `Chapter ${activeChapter.chapter_number}` : "Explore the collection to start reading."}</p><div className="progress-row"><div className="progress"><i style={{width:`${pct}%`}}></i></div><strong>{pct}%</strong></div><div className="continue-footer"><span>{pct > 0 ? "Synced to your latest reading position" : "Your reading progress will appear here"}</span><Button onClick={() => activeVolume?.id && activeChapter?.id ? onRead({ ...display, title: activeBook?.title ?? display.title, volumeId: activeVolume.id, chapterId: activeChapter.id }) : setView("search")}>{pct > 0 ? "Resume chapter" : "Browse stories"} <Icon name="arrow"/></Button></div></div>
          <div className="quote">“Every world begins with a single page.”</div>
        </article>;
      })()}
    </section>

    <section>
      <SectionHeading eyebrow="FRESH FROM THE ARCHIVE" title="Recently updated" action="See all updates"/>
      <div className="book-grid">{books.map((book) => <BookCard key={book.title} book={book} onRead={onRead}/>)}</div>
    </section>

    <section className="discovery-grid">
      <div className="trending-panel"><SectionHeading eyebrow="COMMUNITY PULSE" title="Trending this week"/>
        {[["01","The Alchemist’s Second Dawn","12.8k readers"],["02","Asteria Academy","10.4k readers"],["03","Letters Beyond the Moon","9.1k readers"],["04","The Last Cartographer","7.8k readers"]].map((row, i) =>
          <div className="rank-row" key={row[0]}><strong>{row[0]}</strong><img src={books[i].image} alt=""/><div><b>{row[1]}</b><small>{row[2]}</small></div><span className={i < 2 ? "up" : ""}>{i < 2 ? "↑" : "—"} {4-i}</span></div>)}
      </div>
      <div className="ai-discover"><Icon name="sparkles"/><span>DISCOVER WITH LUMEN AI</span><h2>Not sure what to read next?</h2><p>Tell us the mood, scene, or feeling you’re looking for. We’ll find the exact story for you.</p><button type="button" onClick={() => setView("search")}>“A quiet fantasy about found family...”<Icon name="arrow"/></button><small>Semantic search · Spoiler-safe results</small></div>
    </section>
  </main>;
}

function SearchView({ setView, user, onAuth, onRead }: { setView: (view: View) => void; user: User | null; onAuth: () => void; onRead: (target: { volumeId: string; chapterId: string | null }) => void }) {
  const [query, setQuery] = useState("momen duel sihir di festival akademi");
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function runSearch() {
    if (!user) { setMessage("Masuk dulu untuk memakai semantic search."); onAuth(); return; }
    setLoading(true); setMessage("");
    try {
      const response = await semanticSearch({ query });
      if (response.error) throw response.error;
      const next = response.data?.results ?? [];
      setResults(next);
      setSearched(true);
      if (!next.length) setMessage("Belum ada scene terindeks yang cocok. Proses volume terlebih dahulu di AI Studio.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Semantic search gagal.");
      setResults([]);
      setSearched(true);
    } finally { setLoading(false); }
  }

  return <main className="page search-page">
    <div className="search-intro"><span className="hero-kicker dark"><Icon name="sparkles" size={16}/> Lumen semantic search</span><h1>Find the moment you remember.</h1><p>Search by plot, mood, dialogue, or a scene you can’t quite name.</p></div>
    <div className="semantic-box"><Icon name="sparkles"/><input aria-label="Semantic search query" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter") void runSearch();}} /><Button onClick={()=>void runSearch()}>{loading ? "Searching…" : "Search worlds"}</Button></div>
    {message && <div className="upload-message search-message">{message}</div>}
    <div className="filter-row"><Button variant="secondary" icon="filter">All filters</Button>{["Academy","Magic duel","Festival","Rating 4.5+"].map(x=><button type="button" className="filter-chip" key={x}>{x}<Icon name="close" size={14}/></button>)}<span className="result-count">{searched ? `${results.length} semantic scenes found` : "Semantic search ready"}</span></div>
    <div className="results-layout">
      <aside className="search-filters"><h3>Refine results</h3>{["Content type","Genre","Publication status","Language","AI confidence"].map((x,i)=><div className="filter-block" key={x}><button type="button">{x}<span>{i===0?"Scenes":i===1?"Fantasy":"Any"}</span><Icon name="chevron" size={16}/></button></div>)}</aside>
      <section className="results"><div className="results-head"><div><span>BEST MATCHES</span><h2>Scenes matching your memory</h2></div><button type="button">Relevance <Icon name="chevron" size={15}/></button></div>
        {!searched && <div className="result-placeholder"><Icon name="sparkles"/><strong>Describe the scene you remember.</strong><p>Lumen will search indexed chapters by meaning instead of exact keywords.</p></div>}
        {searched && results.length === 0 && <div className="result-placeholder"><Icon name="search"/><strong>No semantic matches yet.</strong><p>Upload and process a volume in AI Studio to populate the scene index.</p></div>}
        {results.map((r,i)=><article className="result-card" key={r.chapter_id}><div className="score-ring">{r.score}%</div><div className="result-body"><div className="result-label"><span>{r.chapter}</span><small>{r.book}</small></div><h3>{r.title}</h3><blockquote>“{r.excerpt}”</blockquote><div className="ai-reason"><Icon name="sparkles" size={17}/><p><strong>Why this matches</strong>{r.why}</p></div><div className="result-actions"><Button onClick={() => onRead({ volumeId: r.volume_id, chapterId: r.chapter_id })}>Jump to scene <Icon name="arrow"/></Button><Button variant="ghost" icon="bookmark">Save</Button></div></div><img src={books[i % books.length].image} alt="Novel cover"/></article>)}
      </section>
    </div>
  </main>;
}
function Reader({setView,user,onAuth,syncVolumeId,syncChapterId,volume,chapter,onSelectChapter}:{setView:(view:View)=>void;user:User|null;onAuth:()=>void;syncVolumeId:string|null;syncChapterId:string|null;volume:CatalogBook["volumes"][number]|undefined;chapter:CatalogBook["volumes"][number]["chapters"][number]|undefined;onSelectChapter:(chapterId:string)=>void}){
  const [theme,setTheme]=useState<"light"|"sepia"|"dark"|"amoled">("sepia");
  const [layoutMode,setLayoutMode]=useState<"single"|"spread"|"scroll">("single");
  const [direction,setDirection]=useState<"ltr"|"rtl">("ltr");
  const [settingsOpen,setSettingsOpen]=useState(false); const [prefsLoaded,setPrefsLoaded]=useState(false);
  const [knowledge,setKnowledge]=useState<SafeKnowledgeEntry[]>([]); const [knowledgeLoading,setKnowledgeLoading]=useState(false);
  const [panel,setPanel]=useState<"toc"|"info"|null>("info");
  const [saved,setSaved]=useState(false);
  const [pageNumber,setPageNumber]=useState(chapter?.start_page??1);
  const [pages,setPages]=useState<import("./lib/lumen").ChapterPage[]>([]);
  const [pageLoading,setPageLoading]=useState(false);
  const [readerMode,setReaderMode]=useState<"text"|"pdf">("text");
  const [originalPdfUrl,setOriginalPdfUrl]=useState("");
  const [pdfLoading,setPdfLoading]=useState(false);
  const [pdfMessage,setPdfMessage]=useState("");
  const pageCount=Math.max((chapter?.end_page??0)-(chapter?.start_page??0)+1,pages.at(-1)?.page_number??0,1);
  const currentPage=pages.find((page)=>page.page_number===pageNumber);
  const fallbackTitle=chapter?.title??"Chapter"; const chapterNumber=chapter?.chapter_number??1;
  useEffect(()=>{let active=true;setReaderMode("text");setOriginalPdfUrl("");setPdfMessage("");if(!syncChapterId){setPages([]);return()=>{active=false;};}setPageLoading(true);import("./lib/lumen").then(({fetchChapterPages})=>fetchChapterPages(syncChapterId).then((items)=>{if(active){setPages(items);const first=items[0]?.page_number;if(first&&pageNumber<first)setPageNumber(first);}}).catch(()=>{if(active)setPages([]);}).finally(()=>{if(active)setPageLoading(false);}));return()=>{active=false;};},[syncChapterId]);
  useEffect(()=>{if(!user||!syncVolumeId)return;import("./lib/lumen").then(({fetchUserBookmarks,fetchUserProgress})=>{fetchUserBookmarks(user.id).then((items)=>setSaved(items.some((item)=>item.volume_id===syncVolumeId&&item.page_number===pageNumber))).catch(()=>undefined);fetchUserProgress(user.id).then((items)=>{const item=items.find((p)=>p.volume_id===syncVolumeId);if(item?.page_number)setPageNumber(item.page_number);}).catch(()=>undefined);});},[user,syncVolumeId]);
  useEffect(()=>{
    let active=true;setPrefsLoaded(false);
    async function loadPreferences(){
      try{
        const local=window.localStorage.getItem("lumen-reader-preferences");
        if(local){
          const p=JSON.parse(local) as Partial<ReaderPreferences>;
          if(p.layout==="single"||p.layout==="spread"||p.layout==="scroll")setLayoutMode(p.layout);
          if(p.direction==="ltr"||p.direction==="rtl")setDirection(p.direction);
          if(p.theme==="light"||p.theme==="sepia"||p.theme==="dark"||p.theme==="amoled")setTheme(p.theme);
        }
      }catch{}
      if(user){
        try{
          const remote=await fetchReaderPreferences(user.id);
          if(active&&remote){
            if(remote.layout==="single"||remote.layout==="spread"||remote.layout==="scroll")setLayoutMode(remote.layout);
            if(remote.direction==="ltr"||remote.direction==="rtl")setDirection(remote.direction);
            if(remote.theme==="light"||remote.theme==="sepia"||remote.theme==="dark"||remote.theme==="amoled")setTheme(remote.theme);
          }
        }catch{}
      }
      if(active)setPrefsLoaded(true);
    }
    void loadPreferences();
    return ()=>{active=false;};
  },[user?.id]);
  useEffect(()=>{
    if(!prefsLoaded)return;
    const prefs:ReaderPreferences={layout:layoutMode,direction,theme};
    try{window.localStorage.setItem("lumen-reader-preferences",JSON.stringify(prefs));}catch{}
    if(user)void saveReaderPreferences(user.id,prefs).catch(()=>undefined);
  },[prefsLoaded,user?.id,layoutMode,direction,theme]);
  useEffect(()=>{
    let active=true;setKnowledge([]);setKnowledgeLoading(Boolean(syncVolumeId));
    if(!syncVolumeId){setKnowledgeLoading(false);return()=>{active=false;};}
    void fetchSafeVolumeKnowledge(syncVolumeId).then((items)=>{if(active)setKnowledge(items);}).catch(()=>{if(active)setKnowledge([]);}).finally(()=>{if(active)setKnowledgeLoading(false);});
    return()=>{active=false;};
  },[syncVolumeId]);

  async function persistProgress(nextPage:number){if(!user||!syncVolumeId)return;const pct=Math.max(0,Math.min(100,(nextPage/pageCount)*100));const {saveReadingProgress}=await import("./lib/lumen");try{await saveReadingProgress({user,volumeId:syncVolumeId,chapterId:syncChapterId,pageNumber:nextPage,progressPercent:pct});}catch(error){console.debug(error);}}
  function goToPage(nextPage:number){const next=Math.max(1,Math.min(pageCount,nextPage));setPageNumber(next);void persistProgress(next);}
  async function handleBookmark(){if(!user){onAuth();return;}if(!syncVolumeId)return;const {toggleBookmark}=await import("./lib/lumen");try{setSaved(await toggleBookmark({user,volumeId:syncVolumeId,chapterId:syncChapterId,pageNumber}));}catch{}}
  async function openPdf(){if(!syncVolumeId)return;setPdfLoading(true);setPdfMessage("");try{const url=await getPublishedPdfUrl(syncVolumeId);setOriginalPdfUrl(url);setReaderMode("pdf");}catch(error){setPdfMessage(error instanceof Error?error.message:"Original PDF could not be loaded.");}finally{setPdfLoading(false);}}
  const paragraphs=(currentPage?.content??"").split(/\n\s*\n|\n/).map((text)=>text.trim()).filter(Boolean);
  return <div className={"reader theme-"+theme}>
    <header className="reader-top"><Button variant="icon" icon="close" label="Close reader" onClick={()=>setView("home")}/><div className="reader-title"><strong>{volume?((volume.title??("Volume "+volume.volume_number))+" — "+(volume.subtitle??"")):"Lumen Reader"}</strong><small>{"Chapter "+chapterNumber+" · "+fallbackTitle}</small></div><div className="reader-tools"><button type="button" className={"reader-mode-btn "+(readerMode==="text"?"active":"")} onClick={()=>setReaderMode("text")}>Text</button><button type="button" className={"reader-mode-btn "+(readerMode==="pdf"?"active":"")} onClick={()=>void openPdf()} disabled={pdfLoading}>{pdfLoading?"PDF…":"Original PDF"}</button><Button variant="icon" icon="search" label="Search in book" onClick={()=>setView("search")}/><Button variant="icon" icon="list" label="Table of contents" onClick={()=>setPanel(panel==="toc"?null:"toc")}/><Button variant="icon" icon="panel" label="Knowledge panel" onClick={()=>setPanel(panel==="info"?null:"info")}/><Button variant="icon" icon={saved?"check":"bookmark"} label="Bookmark" onClick={handleBookmark}/></div></header>
    <div className="reader-progress"><i style={{width:(Math.round((pageNumber/pageCount)*100)+"%")}}></i></div>
    <div className="reader-shell"><aside className="reader-rail"><Button variant="icon" icon="chevron" label="Previous page" onClick={()=>goToPage(pageNumber-1)}/><span>{pageNumber}</span><div className="vertical-track"><i style={{height:(Math.min(100,(pageNumber/pageCount)*100)+"%")}}></i></div><span>{pageCount}</span><Button variant="icon" icon="chevron" label="Next page" onClick={()=>goToPage(pageNumber+1)}/></aside>
      <article className={"reading-page layout-"+layoutMode} dir={direction}><div className="chapter-mark"><span>CHAPTER {String(chapterNumber).padStart(2,"0")}</span><i></i></div><h1>{fallbackTitle}</h1>
        {readerMode==="pdf"&&originalPdfUrl?<div className="original-pdf-frame"><iframe title="Original PDF" src={originalPdfUrl}/></div>:<>{pageLoading&&<div className="reader-inline-status">Loading extracted page…</div>}{!pageLoading&&paragraphs.length===0&&<div className="reader-inline-status"><strong>{"Page "+pageNumber+" has not been extracted yet."}</strong><span>The PDF processing pipeline needs to finish this page before Lumen can display its text.</span></div>}{layoutMode==="scroll"?pages.filter((p)=>p.page_number>=pageNumber).map((p)=><section className="scroll-reader-page" key={p.page_number}><div className="scroll-page-number">{p.page_number}</div>{(p.content??"").split(/\n\s*\n|\n/).map((paragraph,index)=>paragraph.trim()?<p className={index===0?"dropcap":""} key={p.page_number+"-"+index}>{paragraph.trim()}</p>:null)}</section>):layoutMode==="spread"?<div className="spread-reader-pages"><section>{paragraphs.map((paragraph,index)=><p className={index===0?"dropcap":""} key={pageNumber+"-"+index}>{paragraph}</p>)}</section><section>{(pages.find((p)=>p.page_number===pageNumber+1)?.content??"").split(/\n\s*\n|\n/).map((paragraph,index)=>paragraph.trim()?<p key={(pageNumber+1)+"-"+index}>{paragraph.trim()}</p>:null)}</section></div>:paragraphs.map((paragraph,index)=><p className={index===0?"dropcap":""} key={pageNumber+"-"+index}>{paragraph}</p>)}<div className="scene-break">✦</div></>}
        {volume?.attribution_text&&<div className="volume-attribution">Translation credit: {volume.attribution_text}</div>}
        <footer><span>{volume?.title??"LUMEN"}</span><b>{"— "+pageNumber+" —"}</b><span>{"VOLUME "+(volume?.volume_number??"")}</span></footer>
      </article>
      {panel&&<aside className="knowledge-panel"><div className="panel-tabs"><button type="button" className={panel==="info"?"active":""} onClick={()=>setPanel("info")}>Knowledge</button><button type="button" className={panel==="toc"?"active":""} onClick={()=>setPanel("toc")}>Contents</button></div>{panel==="info"?<div className="reader-context-empty"><div className="safe-badge"><Icon name="eye" size={15}/> Safe for current volume</div><h2>In this scene</h2><p>Only spoiler-safe entries first appearing by this volume are shown.</p><div className="glossary"><strong>Chapter summary</strong><p>{chapter?.spoiler_safe_summary??"No spoiler-safe summary has been generated yet."}</p></div>{knowledgeLoading&&<p>Loading safe glossary…</p>}{(["character","glossary"] as const).map((kind)=><section className="safe-knowledge-group" key={kind}><strong>{kind==="character"?"Characters":"Glossary"}</strong>{knowledge.filter((item)=>item.kind===kind).map((item)=><div className="safe-knowledge-entry" key={kind+"-"+item.term}><b>{item.term}</b><p>{item.description}</p></div>)}{!knowledgeLoading&&!knowledge.some((item)=>item.kind===kind)&&<small>No safe entries yet.</small>}</section>)}</div>:<><h2>Table of contents</h2>{(volume?.chapters??[]).map((item)=><button type="button" className={item.id===syncChapterId?"chapter-link active":"chapter-link"} key={item.id} onClick={()=>onSelectChapter(item.id)}><span>{String(item.chapter_number).padStart(2,"0")}</span>{item.title}{item.id===syncChapterId&&<Icon name="check" size={15}/>}</button>)}</>}</aside>}
    </div>
    {pdfMessage&&<div className="toast"><Icon name="close"/><div><strong>PDF unavailable</strong><small>{pdfMessage}</small></div></div>}
    {settingsOpen&&<div className="reader-settings-panel"><div><strong>Page layout</strong><div className="reader-pref-options"><button className={layoutMode==="single"?"active":""} onClick={()=>setLayoutMode("single")}>Single page</button><button className={layoutMode==="spread"?"active":""} onClick={()=>setLayoutMode("spread")}>Two-page spread</button><button className={layoutMode==="scroll"?"active":""} onClick={()=>setLayoutMode("scroll")}>Continuous scroll</button></div></div><div><strong>Reading direction</strong><div className="reader-pref-options"><button className={direction==="ltr"?"active":""} onClick={()=>setDirection("ltr")}>Left to right</button><button className={direction==="rtl"?"active":""} onClick={()=>setDirection("rtl")}>Right to left</button></div></div><p>Theme, layout and direction are saved to this device and to your reader account when signed in.</p></div>}
    <div className="reader-bottom"><div className="themes">{(["light","sepia","dark","amoled"] as const).map((t)=><button type="button" aria-label={t+" reading theme"} className={t+" "+(theme===t?"active":"")} key={t} onClick={()=>setTheme(t)}></button>)}</div><div className="page-nav"><Button variant="ghost" onClick={()=>goToPage(pageNumber-1)}>Previous</Button><span>{Math.round((pageNumber/pageCount)*100)}% · {Math.max(0,pageCount-pageNumber)} pages left</span><Button variant="primary" onClick={()=>goToPage(pageNumber+1)}>Next page <Icon name="arrow"/></Button></div><Button variant="ghost" icon="settings" onClick={()=>setSettingsOpen((open)=>!open)}>Reading settings</Button></div>
    {saved&&<div className="toast"><Icon name="check"/><div><strong>Bookmark added</strong><small>{"Page "+pageNumber+" · Chapter "+chapterNumber}</small></div></div>}
  </div>;
}

const stages = ["Validate file","Extract text & OCR","Analyze structure","Detect chapters","Extract metadata","Generate summaries","Characters & glossary","Generate embeddings","Human review","Publish"];

function AdminView({catalog,user,onAuth,onCatalogChanged}:{catalog:CatalogBook[];user:User|null;onAuth:()=>void;onCatalogChanged:()=>Promise<void>}){
  const [role,setRole]=useState<"reader"|"editor"|"admin">("reader");
  const [adminCatalog,setAdminCatalog]=useState<CatalogBook[]>(catalog);
  const [selectedNovelId,setSelectedNovelId]=useState(""); const [selectedVolumeId,setSelectedVolumeId]=useState("");
  const [job,setJob]=useState<ProcessingJob|null>(null); const [jobStages,setJobStages]=useState<ProcessingStage[]>([]); const [jobLogs,setJobLogs]=useState<ProcessingLog[]>([]);
  const [review,setReview]=useState<VolumeReview|null>(null);
  const [permissionDraft,setPermissionDraft]=useState({translatorName:"",translationGroup:"",permissionScope:"",grantedAt:"",consentType:"email",consentReference:"",attributionText:"",originalRightsHolder:"",originalRightsScope:"",originalRightsReference:"",originalRightsVerified:false,monetizationApproved:false,permissionGranted:false});
  const [permissionReady,setPermissionReady]=useState(false); const [permissionSaving,setPermissionSaving]=useState(false);
  const [message,setMessage]=useState(""); const [saving,setSaving]=useState(false); const [uploading,setUploading]=useState(false); const [coverUploading,setCoverUploading]=useState(false);
  const [novelOpen,setNovelOpen]=useState(false); const [volumeOpen,setVolumeOpen]=useState(false); const [novelSaving,setNovelSaving]=useState(false); const [volumeSaving,setVolumeSaving]=useState(false);
  const [novelTitle,setNovelTitle]=useState(""); const [novelAlternateTitle,setNovelAlternateTitle]=useState(""); const [novelAuthor,setNovelAuthor]=useState(""); const [novelDescription,setNovelDescription]=useState(""); const [novelGenres,setNovelGenres]=useState(""); const [novelLanguage,setNovelLanguage]=useState("en"); const [novelVolumeNumber,setNovelVolumeNumber]=useState("1"); const [novelVolumeTitle,setNovelVolumeTitle]=useState("Volume 1"); const [novelVolumeSubtitle,setNovelVolumeSubtitle]=useState("");
  const [editTitle,setEditTitle]=useState(""); const [editAlt,setEditAlt]=useState(""); const [editAuthor,setEditAuthor]=useState(""); const [editDescription,setEditDescription]=useState(""); const [editGenres,setEditGenres]=useState(""); const [editLanguage,setEditLanguage]=useState("en"); const [editFeatured,setEditFeatured]=useState(false);
  const [volNumber,setVolNumber]=useState("1"); const [volTitle,setVolTitle]=useState(""); const [volSubtitle,setVolSubtitle]=useState(""); const [volDescription,setVolDescription]=useState("");
  const [chapterDrafts,setChapterDrafts]=useState<Record<string,{title:string;summary:string}>>({}); const [coverFile,setCoverFile]=useState<File|null>(null);
  const fileRef=useRef<HTMLInputElement>(null); const coverRef=useRef<HTMLInputElement>(null);
  const novels=adminCatalog; const selectedNovel=novels.find((n)=>n.id===selectedNovelId)??novels[0];
  const volumes=novels.flatMap((book)=>book.volumes.map((volume)=>({...volume,novelId:book.id,novelTitle:book.title})));
  const selectedVolume=volumes.find((v)=>v.id===selectedVolumeId); const selectedRealNovel=selectedVolume?novels.find((n)=>n.id===selectedVolume.novelId):selectedNovel;
  const canManage=role==="editor"||role==="admin"; const canPublish=canManage&&Boolean(review?.page_count)&&Boolean(review?.chapters.length)&&selectedVolume?.publication_status==="review"&&permissionReady&&permissionDraft.permissionGranted&&permissionDraft.originalRightsVerified&&Boolean(permissionDraft.translatorName.trim())&&Boolean(permissionDraft.permissionScope.trim())&&Boolean(permissionDraft.grantedAt)&&Boolean(permissionDraft.consentReference.trim())&&Boolean(permissionDraft.attributionText.trim())&&Boolean(permissionDraft.originalRightsHolder.trim())&&Boolean(permissionDraft.originalRightsScope.trim())&&Boolean(permissionDraft.originalRightsReference.trim());
  async function loadAdminCatalog(){if(!user||role==="reader"){setAdminCatalog(catalog);return;}try{const data=await fetchAdminCatalog();setAdminCatalog(data);if(!selectedNovelId&&data[0]?.id)setSelectedNovelId(data[0].id);if(!selectedVolumeId&&data[0]?.volumes[0]?.id)setSelectedVolumeId(data[0].volumes[0].id);}catch{setAdminCatalog(catalog);}}
  useEffect(()=>{if(!user){setRole("reader");setAdminCatalog(catalog);return;}fetchCurrentUserRole().then(setRole).catch(()=>setRole("reader"));},[user?.id]);
  useEffect(()=>{if(role!=="reader")void loadAdminCatalog();else setAdminCatalog(catalog);},[role,catalog]);
  useEffect(()=>{if(selectedNovelId&&!novels.some((n)=>n.id===selectedNovelId))setSelectedNovelId(novels[0]?.id??"");if(!selectedVolumeId||!volumes.some((v)=>v.id===selectedVolumeId)){const next=selectedNovel?.volumes[0]?.id??volumes[0]?.id??"";setSelectedVolumeId(next);}},[adminCatalog,selectedNovelId,selectedVolumeId]);
  useEffect(()=>{const v=volumes.find((x)=>x.id===selectedVolumeId);if(v){setSelectedNovelId(v.novelId);setVolNumber(String(v.volume_number));setVolTitle(v.title);setVolSubtitle(v.subtitle??"");setVolDescription(v.description??"");}},[selectedVolumeId,adminCatalog]);
  useEffect(()=>{if(selectedRealNovel){setEditTitle(selectedRealNovel.title);setEditAlt(selectedRealNovel.alternate_title??"");setEditAuthor(selectedRealNovel.author??"");setEditDescription(selectedRealNovel.description??"");setEditGenres(selectedRealNovel.genres.join(", "));setEditLanguage(selectedRealNovel.language);setEditFeatured(Boolean(selectedRealNovel.featured));}},[selectedNovelId,selectedVolumeId,adminCatalog]);
  async function refreshJob(){if(!user||!selectedVolumeId){setJob(null);setJobStages([]);setJobLogs([]);return;}try{const next=await fetchLatestProcessingJob(selectedVolumeId);setJob(next);if(!next){setJobStages([]);setJobLogs([]);return;}const [stages,logs]=await Promise.all([fetchProcessingStages(next.id),fetchProcessingLogs(next.id)]);setJobStages(stages);setJobLogs(logs);}catch{}}
  async function refreshReview(){if(!selectedVolumeId||role==="reader"){setReview(null);return;}try{const data=await fetchVolumeReview(selectedVolumeId);setReview(data);const drafts:Record<string,{title:string;summary:string}>={};for(const c of data?.chapters??[])drafts[c.id]={title:c.title,summary:c.summary??c.spoiler_safe_summary??""};setChapterDrafts(drafts);}catch{setReview(null);}}
  function updatePermissionField<K extends keyof typeof permissionDraft>(key:K,value:(typeof permissionDraft)[K]) {
    setPermissionDraft((current)=>({...current,[key]:value}));
    setPermissionReady(false);
  }
  async function refreshPermission(){
    if(!supabase||!selectedVolumeId||role==="reader"){
      setPermissionReady(false);
      setPermissionDraft({translatorName:"",translationGroup:"",permissionScope:"",grantedAt:"",consentType:"email",consentReference:"",attributionText:"",originalRightsHolder:"",originalRightsScope:"",originalRightsReference:"",originalRightsVerified:false,monetizationApproved:false,permissionGranted:false});
      return;
    }
    try{
      const {data,error} = await (supabase as any).from("volume_permissions")
        .select("translator_name,translation_group,permission_scope,granted_at,consent_type,consent_reference,permission_status,attribution_text,monetization_approved,original_rights_holder,original_rights_scope,original_rights_reference,original_rights_status")
        .eq("volume_id",selectedVolumeId).maybeSingle();
      if(error) throw error;
      if(!data){
        setPermissionDraft({translatorName:"",translationGroup:"",permissionScope:"",grantedAt:"",consentType:"email",consentReference:"",attributionText:"",originalRightsHolder:"",originalRightsScope:"",originalRightsReference:"",originalRightsVerified:false,monetizationApproved:false,permissionGranted:false});
        setPermissionReady(false);
        return;
      }
      const approved=data.permission_status==="approved";
      setPermissionDraft({
        translatorName:data.translator_name??"", translationGroup:data.translation_group??"",
        permissionScope:data.permission_scope??"", grantedAt:data.granted_at??"", consentType:data.consent_type??"email",
        consentReference:data.consent_reference??"", attributionText:data.attribution_text??"", originalRightsHolder:data.original_rights_holder??"",
        originalRightsScope:data.original_rights_scope??"", originalRightsReference:data.original_rights_reference??"",
        originalRightsVerified:data.original_rights_status==="approved", monetizationApproved:Boolean(data.monetization_approved), permissionGranted:approved
      });
      setPermissionReady(approved&&data.original_rights_status==="approved"&&Boolean(data.translator_name?.trim())&&Boolean(data.permission_scope?.trim())&&Boolean(data.granted_at)&&Boolean(data.consent_reference?.trim())&&Boolean(data.attribution_text?.trim())&&Boolean(data.original_rights_holder?.trim())&&Boolean(data.original_rights_scope?.trim())&&Boolean(data.original_rights_reference?.trim()));
    }catch(error){
      setPermissionReady(false);
      setMessage(error instanceof Error?error.message:"Could not load the translator permission record.");
    }
  }
  async function savePermission(){
    if(!user){onAuth();return;}
    if(!canManage||!selectedVolumeId||!supabase){setMessage("Editor or admin access is required to save permission records.");return;}
    const d=permissionDraft;
    if(!d.translatorName.trim()||!d.permissionScope.trim()||!d.grantedAt||!d.consentReference.trim()||!d.attributionText.trim()||!d.originalRightsHolder.trim()||!d.originalRightsScope.trim()||!d.originalRightsReference.trim()){
      setMessage("Complete translator consent and original-work rights holder, scope, and evidence reference before saving.");return;
    }
    setPermissionSaving(true);setMessage("");
    try{
      const {error}=await (supabase as any).from("volume_permissions").upsert({
        volume_id:selectedVolumeId, translator_name:d.translatorName.trim(), translation_group:d.translationGroup.trim()||null,
        permission_scope:d.permissionScope.trim(), granted_at:d.grantedAt, consent_type:d.consentType,
        consent_reference:d.consentReference.trim(), permission_status:d.permissionGranted?"approved":"pending",
        attribution_text:d.attributionText.trim(), original_rights_holder:d.originalRightsHolder.trim(), original_rights_scope:d.originalRightsScope.trim(), original_rights_reference:d.originalRightsReference.trim(), original_rights_status:d.originalRightsVerified?"approved":"pending",
        monetization_approved:d.monetizationApproved, created_by:user.id,
        updated_at:new Date().toISOString()
      },{onConflict:"volume_id"});
      if(error) throw error;
      setPermissionReady(d.permissionGranted&&d.originalRightsVerified);
      setMessage(d.permissionGranted&&d.originalRightsVerified?"Translator permission, original-work rights, and attribution recorded. Publishing can proceed after AI review.":"Record saved; publishing stays blocked until both translation permission and original-work rights are approved.");
    }catch(error){setMessage(error instanceof Error?error.message:"Could not save permission record.");}
    finally{setPermissionSaving(false);}
  }

  useEffect(()=>{void refreshJob();void refreshReview();void refreshPermission();if(!selectedVolumeId||!user)return;const id=window.setInterval(()=>void refreshJob(),3000);return()=>window.clearInterval(id);},[selectedVolumeId,user?.id,role]);
  async function handleCreateNovel(){if(!user){onAuth();return;}if(!novelTitle.trim()){setMessage("Novel title is required.");return;}const number=Number.parseInt(novelVolumeNumber,10);if(!Number.isInteger(number)||number<1){setMessage("Volume number must be 1 or higher.");return;}setNovelSaving(true);setMessage("");try{const r=await createNovel({user,title:novelTitle.trim(),alternateTitle:novelAlternateTitle.trim()||undefined,author:novelAuthor.trim()||undefined,description:novelDescription.trim()||undefined,genres:novelGenres.split(",").map(x=>x.trim()).filter(Boolean),language:novelLanguage.trim()||"en",volumeNumber:number,volumeTitle:novelVolumeTitle.trim()||("Volume "+number),volumeSubtitle:novelVolumeSubtitle.trim()||undefined});if(r.error)throw r.error;const data=await fetchAdminCatalog();setAdminCatalog(data);const created=data.find((n)=>n.slug===r.data?.slug);if(created?.id)setSelectedNovelId(created.id);if(r.data?.volume_id)setSelectedVolumeId(r.data.volume_id);await onCatalogChanged();setNovelOpen(false);setNovelTitle("");setNovelAlternateTitle("");setNovelAuthor("");setNovelDescription("");setNovelGenres("");setNovelLanguage("en");setNovelVolumeNumber("1");setNovelVolumeTitle("Volume 1");setNovelVolumeSubtitle("");setMessage("Draft novel created. Upload its PDF.");}catch(error){setMessage(error instanceof Error?error.message:"Novel creation failed.");}finally{setNovelSaving(false);}}
  async function saveNovel(){if(!selectedRealNovel)return;setSaving(true);try{await updateNovelMetadata({novelId:selectedRealNovel.id,title:editTitle,alternateTitle:editAlt,author:editAuthor,description:editDescription,genres:editGenres.split(",").map(x=>x.trim()).filter(Boolean),language:editLanguage,featured:editFeatured});await loadAdminCatalog();await onCatalogChanged();setMessage("Novel metadata saved.");}catch(error){setMessage(error instanceof Error?error.message:"Could not save novel.");}finally{setSaving(false);}}
  async function saveVolume(){if(!selectedVolume)return;const n=Number.parseInt(volNumber,10);if(!Number.isInteger(n)||n<1){setMessage("Volume number must be 1 or higher.");return;}setVolumeSaving(true);try{await updateVolumeMetadata({volumeId:selectedVolume.id,volumeNumber:n,title:volTitle,subtitle:volSubtitle,description:volDescription});await loadAdminCatalog();await onCatalogChanged();setMessage("Volume metadata saved.");}catch(error){setMessage(error instanceof Error?error.message:"Could not save volume.");}finally{setVolumeSaving(false);}}
  async function handleCreateVolume(){if(!selectedRealNovel)return;const n=Number.parseInt(volNumber,10);if(!Number.isInteger(n)||n<1){setMessage("Volume number must be 1 or higher.");return;}setVolumeSaving(true);try{const id=await createVolume({novelId:selectedRealNovel.id,volumeNumber:n,title:volTitle||("Volume "+n),subtitle:volSubtitle,description:volDescription});await loadAdminCatalog();setSelectedVolumeId(id);setVolumeOpen(false);setMessage("Draft volume created.");}catch(error){setMessage(error instanceof Error?error.message:"Could not create volume.");}finally{setVolumeSaving(false);}}
  async function handleCover(){if(!coverFile||!selectedRealNovel)return;setCoverUploading(true);try{await uploadNovelCover({novelId:selectedRealNovel.id,file:coverFile});setCoverFile(null);if(coverRef.current)coverRef.current.value="";await loadAdminCatalog();await onCatalogChanged();setMessage("Cover uploaded.");}catch(error){setMessage(error instanceof Error?error.message:"Cover upload failed.");}finally{setCoverUploading(false);}}
  async function handlePdf(file:File|undefined){if(!file)return;if(!user){onAuth();return;}if(!selectedVolumeId){setMessage("Select a volume first.");return;}setUploading(true);setMessage("");try{const jobId=await uploadVolumePdf({user,volumeId:selectedVolumeId,file});const started=await startProcessingJob(jobId);if(started.error)setMessage("Job "+jobId.slice(0,8)+" created, but worker did not start: "+started.error.message);else setMessage("PDF uploaded. Full ingestion has started.");await loadAdminCatalog();await refreshJob();}catch(error){setMessage(error instanceof Error?error.message:"PDF upload failed.");}finally{setUploading(false);}}
  async function retryJob(){if(!job)return;setUploading(true);setMessage("");try{const r=await startProcessingJob(job.id);if(r.error)throw r.error;setMessage("Processing retry started.");await refreshJob();}catch(error){setMessage(error instanceof Error?error.message:"Retry failed.");}finally{setUploading(false);}}
  async function saveChapter(id:string){const draft=chapterDrafts[id];if(!draft)return;try{await updateChapterReview({chapterId:id,title:draft.title,summary:draft.summary,spoilerSafeSummary:draft.summary,status:"draft"});setMessage("Chapter review saved.");await refreshReview();}catch(error){setMessage(error instanceof Error?error.message:"Could not save chapter.");}}
  async function handlePublish(){if(!selectedVolumeId)return;setSaving(true);try{const r=await publishVolume(selectedVolumeId);if(r.error)throw r.error;await loadAdminCatalog();await onCatalogChanged();await refreshJob();await refreshReview();setMessage("Volume published successfully.");}catch(error){setMessage(error instanceof Error?error.message:"Publish failed.");}finally{setSaving(false);}}
  return <main className="page admin-page">
    <div className="admin-head"><div><span className="eyebrow">CONTENT OPERATIONS</span><h1>AI Studio</h1><p>One workspace for novels, volumes, PDF ingestion, human review, and publishing.</p></div><div className="admin-upload-actions">
      <select aria-label="Select novel" value={selectedNovelId} onChange={e=>{setSelectedNovelId(e.target.value);const v=novels.find(n=>n.id===e.target.value)?.volumes[0];if(v)setSelectedVolumeId(v.id);}}>{novels.length?novels.map(n=><option key={n.id} value={n.id}>{n.title+" · "+(n.publication_status??"published")}</option>):<option value="">No titles</option>}</select>
      <select aria-label="Select volume" value={selectedVolumeId} onChange={e=>setSelectedVolumeId(e.target.value)}>{volumes.length?volumes.map(v=><option key={v.id} value={v.id}>{v.novelTitle+" · Vol. "+v.volume_number+" · "+(v.publication_status??"draft")}</option>):<option value="">No volumes</option>}</select>
      <Button variant="secondary" icon="book" onClick={()=>{setNovelOpen(true);setMessage("");}} disabled={!canManage}>Add novel</Button>
      <Button variant="secondary" onClick={()=>{if(selectedRealNovel){const n=(selectedRealNovel.volumes.at(-1)?.volume_number??0)+1;setVolNumber(String(n));setVolTitle("Volume "+n);setVolSubtitle("");setVolDescription("");setVolumeOpen(true);}}} disabled={!canManage||!selectedRealNovel}>Add volume</Button>
      <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={e=>{void handlePdf(e.target.files?.[0]);e.currentTarget.value="";}}/><Button icon="upload" onClick={()=>fileRef.current?.click()} disabled={!canManage||uploading||!selectedVolumeId}>{uploading?"Uploading…":"Upload PDF"}</Button>
    </div></div>
    {!user&&<div className="upload-message">Sign in to access content operations.</div>}{user&&role==="reader"&&<div className="upload-message permission-message"><strong>Reader access only.</strong> Content management requires the Editor or Admin role.</div>}{message&&<div className="upload-message">{message}</div>}
    <div className="job-summary"><img src={selectedRealNovel?.cover_path??photos.castle} alt="Novel cover"/><div className="job-title"><span className="processing-badge"><i></i>{String(job?.status??selectedVolume?.publication_status??"idle").toUpperCase()}</span><h2>{selectedRealNovel?.title??"Select a novel"}</h2><p>{selectedVolume?"Vol. "+selectedVolume.volume_number+" · "+(selectedVolume.subtitle||selectedVolume.title):"Choose a volume"}</p></div><div className="job-stat"><span>Pages</span><strong>{review?.page_count??selectedVolume?.page_count??"—"}</strong><small>{review?.chapters.length??selectedVolume?.chapters.length??0} chapters</small></div><div className="job-stat"><span>AI index</span><strong>{review?.chunk_count??"—"}</strong><small>{review?review.character_count+" characters · "+review.glossary_count+" glossary":"Run ingestion to generate it"}</small></div><Button variant="secondary" onClick={()=>{void refreshJob();void refreshReview();}}>Refresh</Button></div>
    <section className="management-grid">
      <div className="management-card"><div className="card-head"><div><span>NOVEL METADATA</span><h2>Edit title</h2></div></div>{selectedRealNovel?<><label>Title<input value={editTitle} onChange={e=>setEditTitle(e.target.value)}/></label><label>Alternate title<input value={editAlt} onChange={e=>setEditAlt(e.target.value)}/></label><label>Author<input value={editAuthor} onChange={e=>setEditAuthor(e.target.value)}/></label><label>Description<textarea rows={4} value={editDescription} onChange={e=>setEditDescription(e.target.value)}/></label><label>Genres<input value={editGenres} onChange={e=>setEditGenres(e.target.value)}/></label><div className="inline-form-row"><label>Language<input value={editLanguage} onChange={e=>setEditLanguage(e.target.value)}/></label><label className="check-field"><input type="checkbox" checked={editFeatured} onChange={e=>setEditFeatured(e.target.checked)}/> Featured</label></div><Button onClick={()=>void saveNovel()} disabled={!canManage||saving}>{saving?"Saving…":"Save novel metadata"}</Button></>:<div className="result-placeholder"><strong>Select a novel</strong></div>}</div>
      <div className="management-card"><div className="card-head"><div><span>COVER</span><h2>Series artwork</h2></div></div><img className="management-cover" src={selectedRealNovel?.cover_path??photos.castle} alt="Selected cover"/><input ref={coverRef} type="file" accept="image/*" onChange={e=>setCoverFile(e.target.files?.[0]??null)} disabled={!canManage}/><Button variant="secondary" onClick={()=>void handleCover()} disabled={!canManage||!coverFile||coverUploading}>{coverUploading?"Uploading…":"Upload cover"}</Button></div>
      <div className="management-card"><div className="card-head"><div><span>VOLUME METADATA</span><h2>Edit selected volume</h2></div></div>{selectedVolume?<><div className="inline-form-row"><label>Number<input type="number" min="1" value={volNumber} onChange={e=>setVolNumber(e.target.value)}/></label><label>Title<input value={volTitle} onChange={e=>setVolTitle(e.target.value)}/></label></div><label>Subtitle<input value={volSubtitle} onChange={e=>setVolSubtitle(e.target.value)}/></label><label>Description<textarea rows={3} value={volDescription} onChange={e=>setVolDescription(e.target.value)}/></label><Button onClick={()=>void saveVolume()} disabled={!canManage||volumeSaving}>{volumeSaving?"Saving…":"Save volume metadata"}</Button></>:<div className="result-placeholder"><strong>Select a volume</strong></div>}</div>
    </section>
    <section className="management-grid permission-grid">
      <div className="management-card permission-card">
        <div className="card-head"><div><span>LEGAL & ATTRIBUTION</span><h2>Translator permission</h2></div></div>
        <p className="permission-help">Two separate checks are required: consent from the translator and a documented legal basis to distribute the original work (for example, rights-holder permission or verified public-domain status). The translator cannot grant the original rights on their behalf.</p>
        <label>Translator name<input value={permissionDraft.translatorName} onChange={e=>updatePermissionField("translatorName",e.target.value)} placeholder="Name of translator" /></label>
        <label>Fan-translation group (optional)<input value={permissionDraft.translationGroup} onChange={e=>updatePermissionField("translationGroup",e.target.value)} placeholder="Group or team" /></label>
        <label>Permission scope<textarea rows={2} value={permissionDraft.permissionScope} onChange={e=>updatePermissionField("permissionScope",e.target.value)} placeholder="What did the translator explicitly permit?" /></label>
        <div className="inline-form-row">
          <label>Consent date<input type="date" value={permissionDraft.grantedAt} onChange={e=>updatePermissionField("grantedAt",e.target.value)} /></label>
          <label>Consent type<select value={permissionDraft.consentType} onChange={e=>updatePermissionField("consentType",e.target.value)}><option value="chat">Chat</option><option value="email">Email</option><option value="document">Document</option></select></label>
        </div>
        <label>Evidence reference<input value={permissionDraft.consentReference} onChange={e=>updatePermissionField("consentReference",e.target.value)} placeholder="Private evidence location or record ID" /></label>
        <label>Displayed attribution<textarea rows={2} value={permissionDraft.attributionText} onChange={e=>updatePermissionField("attributionText",e.target.value)} placeholder="Exact credit displayed on the published volume" /></label>
        <div className="rights-review-divider"><span>ORIGINAL WORK RIGHTS</span><small>Separate from fan-translation consent</small></div>
        <label>Original rights holder / rights basis<input value={permissionDraft.originalRightsHolder} onChange={e=>updatePermissionField("originalRightsHolder",e.target.value)} placeholder="Rights holder or public-domain basis" /></label>
        <label>Distribution rights scope<textarea rows={2} value={permissionDraft.originalRightsScope} onChange={e=>updatePermissionField("originalRightsScope",e.target.value)} placeholder="Languages, territory, online display, commercial use, term, or public-domain basis" /></label>
        <label>Original-work evidence reference<input value={permissionDraft.originalRightsReference} onChange={e=>updatePermissionField("originalRightsReference",e.target.value)} placeholder="Contract, license, official public-domain record, or permission reference" /></label>
        <label className="check-field"><input type="checkbox" checked={permissionDraft.originalRightsVerified} onChange={e=>updatePermissionField("originalRightsVerified",e.target.checked)} /> I have independently verified that this site may distribute the original work</label>
        <label className="check-field"><input type="checkbox" checked={permissionDraft.monetizationApproved} onChange={e=>updatePermissionField("monetizationApproved",e.target.checked)} /> Explicit monetization approval, if applicable</label>
        <label className="check-field"><input type="checkbox" checked={permissionDraft.permissionGranted} onChange={e=>updatePermissionField("permissionGranted",e.target.checked)} /> I have verified this permission and attribution</label>
        <Button onClick={()=>void savePermission()} disabled={!canManage||permissionSaving||!selectedVolumeId}>{permissionSaving?"Saving…":"Save permission record"}</Button>
        <small className="permission-status">{permissionReady?"Approved record saved":"Not cleared for publication until an approved record is saved"}</small>
      </div>
    </section>
    <div className="admin-layout"><section className="pipeline-card"><div className="card-head"><div><span>LIVE PIPELINE</span><h2>AI processing stages</h2></div><div>{job&&(job.status==="failed"||job.status==="cancelled")&&<Button variant="secondary" onClick={()=>void retryJob()}>Retry</Button>}</div></div><div className="pipeline">{(jobStages.length?jobStages:stages.map((stage,i)=>({id:"placeholder-"+i,stage_order:i+1,stage_key:stage.toLowerCase().replace(/ /g,"_"),status:"waiting" as const,progress_percent:0,job_id:"",started_at:null,finished_at:null,error_message:null,metadata:{}}))).map((stage,i)=><button type="button" key={stage.id} className={(stage.status==="completed"?"done ":"")+(stage.status==="running"?"current ":"")} onClick={()=>undefined}><span className="stage-icon">{stage.status==="completed"?<Icon name="check" size={15}/>:stage.status==="running"?<Icon name="sparkles" size={16}/>:stage.status==="failed"?<Icon name="close" size={15}/>:i+1}</span><div><strong>{stage.stage_key.replace(/_/g," ")}</strong><small>{stage.status==="waiting"?"Waiting":stage.status==="running"?"Running":stage.status==="completed"?"Completed":stage.status==="failed"?"Failed":"Skipped"}</small></div>{stage.status==="running"&&<em>{Math.round(Number(stage.progress_percent))}%</em>}</button>)}</div><div className="pipeline-footer"><span>{job?.current_stage??"No active job"}</span><b>{Math.round(Number(job?.progress_percent??0))}%</b><div className="progress"><i style={{width:(Math.round(Number(job?.progress_percent??0))+"%")}}></i></div></div></section>
      <section className="console-card"><div className="card-head"><div><span>PROCESSING CONSOLE</span><h2>Live activity</h2></div></div><div className="console">{jobLogs.length?jobLogs.map(log=><p key={log.id}><time>{new Date(log.created_at).toLocaleTimeString()}</time><span className={log.level}>{log.level.toUpperCase()}</span> {log.message}</p>):<div className="result-placeholder"><Icon name="clock"/><strong>No job logs yet.</strong><p>Upload a PDF to start ingestion.</p></div>}</div><div className="quality-grid"><div><span>Warnings / errors</span><strong>{jobLogs.filter(l=>l.level==="warn"||l.level==="error").length}</strong><small>{job?.error_message??"None"}</small></div><div><span>Status</span><strong>{String(job?.status??"idle").toUpperCase()}</strong><small>{job?.current_stage??"—"}</small></div><div><span>Publish</span><strong>{canPublish?"READY":"BLOCKED"}</strong><small>{canPublish?"Review checks passed":"Needs extracted pages + review state"}</small></div></div></section></div>
    <section className="review-workspace"><div className="review-head"><div><span>HUMAN REVIEW</span><h2>Review before publishing</h2><p>Edit AI-generated chapter titles and spoiler-safe summaries. Publishing remains explicit.</p></div><Button variant="primary" onClick={()=>void handlePublish()} disabled={!canPublish||saving}>{saving?"Publishing…":"Publish volume"} <Icon name="arrow"/></Button></div><div className="review-stats"><div><span>Extracted pages</span><strong>{review?.page_count??0}</strong></div><div><span>Chunks</span><strong>{review?.chunk_count??0}</strong></div><div><span>Characters</span><strong>{review?.character_count??0}</strong></div><div><span>Glossary</span><strong>{review?.glossary_count??0}</strong></div></div><div className="chapter-review-list">{review?.chapters.length?review.chapters.map(c=><div className="chapter-review-row" key={c.id}><div className="chapter-review-index">{String(c.chapter_number).padStart(2,"0")}</div><div className="chapter-review-fields"><label>Chapter title<input value={chapterDrafts[c.id]?.title??c.title} onChange={e=>setChapterDrafts(prev=>({...prev,[c.id]:{title:e.target.value,summary:prev[c.id]?.summary??c.summary??""}}))}/></label><label>Safe summary<textarea rows={3} value={chapterDrafts[c.id]?.summary??c.summary??""} onChange={e=>setChapterDrafts(prev=>({...prev,[c.id]:{title:prev[c.id]?.title??c.title,summary:e.target.value}}))}/></label></div><div className="chapter-review-actions"><span>{c.word_count??0} words</span><Button variant="secondary" onClick={()=>void saveChapter(c.id)} disabled={!canManage}>Save</Button></div></div>):<div className="result-placeholder"><Icon name="sparkles"/><strong>No review data yet.</strong><p>Upload and process a PDF to populate chapters.</p></div>}</div></section>
    {novelOpen&&<div className="modal-backdrop" role="presentation" onMouseDown={()=>!novelSaving&&setNovelOpen(false)}>
      <section className="auth-modal novel-modal" role="dialog" aria-modal="true" onMouseDown={(e)=>e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={()=>!novelSaving&&setNovelOpen(false)} aria-label="Close">×</button>
        <div className="auth-brand"><span className="logo-mark">L</span><div><strong>Add novel title</strong><small>Create the series and its first volume.</small></div></div>
        <div className="novel-form-grid">
          <label>Title<input value={novelTitle} onChange={(e)=>setNovelTitle(e.target.value)} autoFocus /></label>
          <label>Alternate title<input value={novelAlternateTitle} onChange={(e)=>setNovelAlternateTitle(e.target.value)} /></label>
          <label>Author<input value={novelAuthor} onChange={(e)=>setNovelAuthor(e.target.value)} /></label>
          <label>Language<input value={novelLanguage} onChange={(e)=>setNovelLanguage(e.target.value)} /></label>
          <label>Genres<input value={novelGenres} onChange={(e)=>setNovelGenres(e.target.value)} /></label>
          <label>First volume number<input type="number" min="1" value={novelVolumeNumber} onChange={(e)=>{ setNovelVolumeNumber(e.target.value); if(!novelVolumeTitle||/^Volume \d+$/.test(novelVolumeTitle)) setNovelVolumeTitle("Volume "+e.target.value); }} /></label>
          <label>Volume title<input value={novelVolumeTitle} onChange={(e)=>setNovelVolumeTitle(e.target.value)} /></label>
          <label>Volume subtitle<input value={novelVolumeSubtitle} onChange={(e)=>setNovelVolumeSubtitle(e.target.value)} /></label>
        </div>
        <label>Description<textarea rows={4} value={novelDescription} onChange={(e)=>setNovelDescription(e.target.value)} /></label>
        {message&&<div className="auth-message">{message}</div>}
        <button type="button" className="btn btn-primary auth-submit" onClick={()=>void handleCreateNovel()} disabled={!canManage||novelSaving}>{novelSaving?"Creating…":"Create draft novel"}</button>
      </section>
    </div>}
    {volumeOpen&&<div className="modal-backdrop" role="presentation" onMouseDown={()=>!volumeSaving&&setVolumeOpen(false)}><section className="auth-modal novel-modal" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}><button type="button" className="modal-close" onClick={()=>!volumeSaving&&setVolumeOpen(false)} aria-label="Close">×</button><div className="auth-brand"><span className="logo-mark">L</span><div><strong>Add volume</strong><small>Attach another volume to the selected novel.</small></div></div><label>Volume number<input type="number" min="1" value={volNumber} onChange={e=>setVolNumber(e.target.value)}/></label><label>Title<input value={volTitle} onChange={e=>setVolTitle(e.target.value)}/></label><label>Subtitle<input value={volSubtitle} onChange={e=>setVolSubtitle(e.target.value)}/></label><label>Description<textarea rows={4} value={volDescription} onChange={e=>setVolDescription(e.target.value)}/></label>{message&&<div className="auth-message">{message}</div>}<button type="button" className="btn btn-primary auth-submit" onClick={()=>void handleCreateVolume()} disabled={!canManage||volumeSaving}>{volumeSaving?"Creating…":"Create draft volume"}</button></section></div>}
  </main>;
}

function LibraryView({ user, progress, bookmarks, onAuth, catalog, onRead }: { user: User | null; progress: Map<string, number>; bookmarks: UserBookmark[]; onAuth: () => void; catalog: CatalogBook[]; onRead: (target: { volumeId: string; chapterId: string | null }) => void }) {
  const [shelf,setShelf]=useState<BookshelfItem[]>([]);
  const [ratings,setRatings]=useState<UserRating[]>([]);
  const [message,setMessage]=useState("");
  const [saving,setSaving]=useState("");
  async function refreshPersonalData(){
    if(!user){setShelf([]);setRatings([]);return;}
    try{const [s,r]=await Promise.all([fetchUserBookshelf(user.id),fetchUserRatings(user.id)]);setShelf(s);setRatings(r);}
    catch(error){setMessage(error instanceof Error?error.message:"Could not load your personal library.");}
  }
  useEffect(()=>{void refreshPersonalData();},[user?.id]);
  if (!user) return <main className="page"><section className="empty-state"><div className="library-icon">◫</div><h1>Your library</h1><p>Sign in to keep reading progress, shelf status, and ratings synced across devices.</p><Button onClick={onAuth}>Sign in to continue</Button></section></main>;
  const displayBooks=catalog.map((book)=>{
    const volume=book.volumes.find((v)=>progress.has(v.id))??book.volumes.at(-1);
    const display=books.find((item)=>item.novelSlug===book.slug);
    return {book,volume,display,status:shelf.find((s)=>s.novel_id===book.id)?.status??""};
  }).filter((item)=>item.display&&item.volume);
  async function changeShelf(novelId:string,value:string){
    setSaving("shelf:"+novelId);setMessage("");
    try{await saveBookshelfStatus({userId:user!.id,novelId,status:(value||null) as BookshelfStatus|null});await refreshPersonalData();}
    catch(error){setMessage(error instanceof Error?error.message:"Could not update shelf status.");}
    finally{setSaving("");}
  }
  async function changeRating(key:string,novelId:string,volumeId:string,value:string){
    setSaving("rating:"+key);setMessage("");
    try{await saveUserRating({userId:user!.id,...(key==="series"?{novelId}:{volumeId}),score:value?Number(value):null});await refreshPersonalData();}
    catch(error){setMessage(error instanceof Error?error.message:"Could not save your rating.");}
    finally{setSaving("");}
  }
  return <main className="page library-page">
    <div className="search-intro"><span className="hero-kicker dark">YOUR LIBRARY</span><h1>Your shelf, your pace.</h1><p>Track series, sync progress, and rate both a series and an individual volume.</p></div>
    {message&&<div className="upload-message">{message}</div>}
    <section><div className="section-heading"><div><span>YOUR TITLES</span><h2>Light novel shelf</h2></div></div>
      {displayBooks.length?<div className="book-grid">{displayBooks.map(({book,volume,display,status})=>{
        const seriesRating=ratings.find((r)=>r.novel_id===book.id&&r.volume_id===null)?.score??"";
        const volumeRating=ratings.find((r)=>r.volume_id===volume!.id)?.score??"";
        return <article className="book-card library-book-card" key={book.id} onClick={()=>onRead({volumeId:volume!.id,chapterId:volume!.chapters[0]?.id??null})}>
          <div className="cover-wrap"><img src={display!.image} alt={"Cover of "+book.title}/><span className="cover-volume">Vol. {volume!.volume_number}</span></div>
          <div className="book-meta"><div className="rating"><Icon name="star" size={14}/>{book.rating_avg?Number(book.rating_avg).toFixed(1):display!.rating}</div><span>{book.genres[0]??"Novel"}</span></div>
          <h3>{book.title}</h3><p>{book.alternate_title??""}</p><small>{book.author??"Unknown author"} · {Math.round(progress.get(volume!.id)??0)}% read</small>
          <div className="library-controls" onClick={e=>e.stopPropagation()}>
            <label>Shelf status<select value={status} disabled={saving==="shelf:"+book.id} onChange={e=>void changeShelf(book.id,e.target.value)}>
              <option value="">Not on shelf</option><option value="reading">Reading</option><option value="plan_to_read">Plan to Read</option><option value="completed">Completed</option><option value="dropped">Dropped</option>
            </select></label>
            <label>Series rating<select value={seriesRating} disabled={saving==="rating:series"} onChange={e=>void changeRating("series",book.id,volume!.id,e.target.value)}>
              <option value="">Not rated</option>{Array.from({length:10},(_,i)=>i+1).map(score=><option key={score} value={score}>{score}/10</option>)}
            </select></label>
            <label>{"Vol. "+volume!.volume_number+" rating"}<select value={volumeRating} disabled={saving==="rating:volume:"+volume!.id} onChange={e=>void changeRating("volume:"+volume!.id,book.id,volume!.id,e.target.value)}>
              <option value="">Not rated</option>{Array.from({length:10},(_,i)=>i+1).map(score=><option key={score} value={score}>{score}/10</option>)}
            </select></label>
          </div>
        </article>;
      })}</div>:<div className="result-placeholder"><Icon name="library"/><strong>Your catalog is empty.</strong><p>Once Supabase is connected and titles are published, add series to your shelf here.</p></div>}
    </section>
    <section className="library-stats"><div><span>Bookmarks</span><strong>{bookmarks.length}</strong></div><div><span>Shelf titles</span><strong>{shelf.length}</strong></div><div><span>Synced titles</span><strong>{displayBooks.filter(({volume})=>progress.has(volume!.id)).length}</strong></div></section>
  </main>;
}

function CommunityView({user,onAuth}:{user:User|null;onAuth:()=>void}){
  const [posts,setPosts]=useState<CommunityPost[]>([]); const [content,setContent]=useState(""); const [isSpoiler,setIsSpoiler]=useState(false); const [revealed,setRevealed]=useState<Record<string,boolean>>({}); const [spoilerComments,setSpoilerComments]=useState<Record<string,boolean>>({}); const [loading,setLoading]=useState(true); const [message,setMessage]=useState(""); const [commentDrafts,setCommentDrafts]=useState<Record<string,string>>({});
  async function refresh(){setLoading(true);try{setPosts(await fetchCommunityPosts());}catch(error){setMessage(error instanceof Error?error.message:"Community feed failed.");}finally{setLoading(false);}}
  useEffect(()=>{void refresh();},[]);
  async function submitPost(){if(!user){onAuth();return;}if(!content.trim())return;try{await createCommunityPost({userId:user.id,content,isSpoiler});setContent("");setIsSpoiler(false);await refresh();}catch(error){setMessage(error instanceof Error?error.message:"Could not publish post.");}}
  async function submitComment(postId:string){if(!user){onAuth();return;}const text=commentDrafts[postId]?.trim();if(!text)return;try{await createCommunityComment({userId:user.id,postId,content:text,isSpoiler:spoilerComments[postId]});setCommentDrafts(prev=>({...prev,[postId]:""}));setSpoilerComments(prev=>({...prev,[postId]:false}));await refresh();}catch(error){setMessage(error instanceof Error?error.message:"Could not add comment.");}}
  return <main className="page community-page"><div className="search-intro"><span className="hero-kicker dark"><Icon name="users" size={16}/> COMMUNITY</span><h1>Talk about the worlds you’re reading.</h1><p>Discuss chapters, characters, theories, and favorite moments.</p></div>
    <section className="community-compose"><div className="avatar">{user?((user.user_metadata?.full_name as string|undefined)?.slice(0,2).toUpperCase()||"LR"):"LR"}</div><div><textarea rows={3} value={content} onChange={e=>setContent(e.target.value)} onFocus={()=>{if(!user)onAuth();}} placeholder={user?"Share a spoiler-safe thought…":"Sign in to start a discussion."}/><div className="community-compose-footer"><small>{content.length}/4000</small><label className="spoiler-toggle"><input type="checkbox" checked={isSpoiler} onChange={e=>setIsSpoiler(e.target.checked)}/> Contains spoilers</label><Button onClick={()=>void submitPost()} disabled={!content.trim()}>Post</Button></div></div></section>
    {message&&<div className="upload-message">{message}</div>}{loading?<div className="result-placeholder"><Icon name="clock"/><strong>Loading community…</strong></div>:<section className="community-feed">{posts.length?posts.map(post=><article className="community-post" key={post.id}><div className="community-post-head"><span className="avatar">{post.display_name.slice(0,2).toUpperCase()}</span><div><strong>{post.display_name}</strong><small>{new Date(post.created_at).toLocaleString()}{post.novel_title?" · "+post.novel_title:""}</small></div></div><div className="community-post-content">{post.is_spoiler&&!revealed[post.id]?<button type="button" className="spoiler-content" onClick={()=>setRevealed(prev=>({...prev,[post.id]:true}))}>Spoiler hidden · click to reveal</button>:<p>{post.content}</p>}</div><div className="community-comments">{post.comments.map(comment=><div className="community-comment" key={comment.id}><strong>{comment.display_name}</strong>{comment.is_spoiler&&!revealed[comment.id]?<button type="button" className="spoiler-content" onClick={()=>setRevealed(prev=>({...prev,[comment.id]:true}))}>Spoiler hidden · click to reveal</button>:<span>{comment.content}</span>}</div>)}</div><div className="community-comment-box"><input value={commentDrafts[post.id]??""} onChange={e=>setCommentDrafts(prev=>({...prev,[post.id]:e.target.value}))} onFocus={()=>{if(!user)onAuth();}} placeholder={user?"Write a comment…":"Sign in to comment"}/><label className="spoiler-toggle"><input type="checkbox" checked={Boolean(spoilerComments[post.id])} onChange={e=>setSpoilerComments(prev=>({...prev,[post.id]:e.target.checked}))}/> Spoiler</label><Button variant="secondary" onClick={()=>void submitComment(post.id)} disabled={!commentDrafts[post.id]?.trim()}>Reply</Button></div></article>):<div className="result-placeholder"><Icon name="users"/><strong>No discussions yet.</strong><p>Be the first reader to start a conversation.</p></div>}</section>}
  </main>;
}

function TakedownView(){
  const [requesterName,setRequesterName]=useState("");
  const [requesterEmail,setRequesterEmail]=useState("");
  const [rightsHolder,setRightsHolder]=useState("");
  const [contentUrl,setContentUrl]=useState("");
  const [reason,setReason]=useState("");
  const [volumeId,setVolumeId]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const [message,setMessage]=useState("");
  const [complete,setComplete]=useState(false);
  async function submit(){
    if(!requesterName.trim()||!requesterEmail.trim()||!rightsHolder.trim()||reason.trim().length<10){
      setMessage("Complete your name, contact email, rights-holder name, and a reason of at least 10 characters.");return;
    }
    if(!supabase){
      setMessage("The submission service is not connected yet. The form will become active after the Supabase database is configured.");
      return;
    }
    setSubmitting(true);setMessage("");
    try{
      const {error}=await (supabase as any).from("content_takedown_requests").insert({
        requester_name:requesterName.trim().slice(0,180),
        requester_email:requesterEmail.trim().slice(0,320),
        rights_holder:rightsHolder.trim().slice(0,300),
        content_url:contentUrl.trim().slice(0,2000)||null,
        reason:reason.trim().slice(0,5000),
        volume_id:volumeId.trim()||null
      });
      if(error)throw error;
      setComplete(true);
      setMessage("Your request has been submitted for review.");
    }catch(error){setMessage(error instanceof Error?error.message:"Your request could not be submitted.");}
    finally{setSubmitting(false);}
  }
  return <main className="page rights-page">
    <div className="search-intro"><span className="hero-kicker dark">RIGHTS & CONTENT SAFETY</span><h1>Request a content review.</h1><p>Rights holders and authorized representatives can report a volume for review or removal. Include enough information for the moderation team to locate the work and verify the request.</p></div>
    <section className="rights-card">
      <div className="rights-notice"><strong>What to include</strong><p>Provide the rights holder, a URL or volume identifier, and the reason for your request. Please do not submit passwords, identity documents, or other sensitive information through this form.</p></div>
      {!complete&&<div className="rights-form">
        <label>Your name<input value={requesterName} maxLength={180} onChange={e=>setRequesterName(e.target.value)} autoComplete="name" required/></label>
        <label>Contact email<input type="email" value={requesterEmail} maxLength={320} onChange={e=>setRequesterEmail(e.target.value)} autoComplete="email" required/></label>
        <label>Rights holder / represented party<input value={rightsHolder} maxLength={300} onChange={e=>setRightsHolder(e.target.value)} required/></label>
        <label>Content URL (optional)<input type="url" value={contentUrl} maxLength={2000} onChange={e=>setContentUrl(e.target.value)} placeholder="https://…"/></label>
        <label>Volume ID (optional)<input value={volumeId} onChange={e=>setVolumeId(e.target.value)} placeholder="UUID shown in the volume record"/></label>
        <label>Reason and requested action<textarea rows={6} value={reason} maxLength={5000} onChange={e=>setReason(e.target.value)} placeholder="Explain the rights concern and whether you request review, correction, or removal." required/></label>
        <div className="rights-form-footer"><small>{reason.length}/5000 characters</small><Button onClick={()=>void submit()} disabled={submitting}>{submitting?"Submitting…":"Submit review request"}</Button></div>
      </div>}
      {message&&<div className={complete?"rights-success":"upload-message"}>{message}</div>}
      {complete&&<Button variant="secondary" onClick={()=>{setRequesterName("");setRequesterEmail("");setRightsHolder("");setContentUrl("");setReason("");setVolumeId("");setComplete(false);setMessage("");}}>Submit another request</Button>}
    </section>
    <p className="rights-footnote">Submission is a request for human review, not a guarantee of any legal outcome. The service operator should review and respond through an established contact process.</p>
  </main>;
}

function AuthDialog({ open, onClose, onSignedIn }: { open: boolean; onClose: () => void; onSignedIn: (user: User) => void }) {
  const [mode,setMode]=useState<"signin"|"signup">("signin");
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [name,setName]=useState(""); const [message,setMessage]=useState(""); const [loading,setLoading]=useState(false);
  if (!open) return null;
  async function submit() {
    setLoading(true); setMessage("");
    try {
      if (mode==="signin") {
        const result=await signIn(email.trim(),password); if(result.error) throw result.error;
        if(result.data.user){onSignedIn(result.data.user);onClose();}
      } else {
        const result=await signUp(email.trim(),password,name.trim()||"Lumen Reader"); if(result.error) throw result.error;
        if(result.data.session?.user){onSignedIn(result.data.session.user);onClose();} else setMessage("Account created. Check your email to confirm the account.");
      }
    } catch(error) { setMessage(error instanceof Error ? error.message : "Authentication failed."); }
    finally { setLoading(false); }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="auth-modal" role="dialog" aria-modal="true" onMouseDown={(e)=>e.stopPropagation()}><button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button><div className="auth-brand"><span className="logo-mark">L</span><div><strong>Lumen</strong><small>{mode==="signin"?"Welcome back, reader.":"Create your reader account."}</small></div></div><div className="auth-tabs"><button type="button" className={mode==="signin"?"active":""} onClick={()=>setMode("signin")}>Sign in</button><button type="button" className={mode==="signup"?"active":""} onClick={()=>setMode("signup")}>Create account</button></div>{mode==="signup"&&<label>Display name<input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your reader name"/></label>}<label>Email<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password"/></label>{message&&<div className="auth-message">{message}</div>}<button type="button" className="btn btn-primary auth-submit" onClick={submit} disabled={loading}>{loading?"Working…":mode==="signin"?"Sign in":"Create account"}</button><small className="auth-note">Your account syncs progress and bookmarks across devices.</small></section></div>;
}


export default function App() {
  const initialReader = typeof window !== "undefined" && window.location.hash.startsWith("#reader?") ? new URLSearchParams(window.location.hash.slice(8)) : null;
  const [view, setView] = useState<View>(initialReader ? "reader" : "home");
  const [user, setUser] = useState<User | null>(null);
  const [catalog, setCatalog] = useState<CatalogBook[]>([]);
  const [progress, setProgress] = useState<Map<string, number>>(new Map());
  const [bookmarks, setBookmarks] = useState<UserBookmark[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [readerTarget, setReaderTarget] = useState<{volumeId:string; chapterId:string|null}>(
    initialReader?.get("volume") ? { volumeId: initialReader.get("volume")!, chapterId: initialReader.get("chapter") } : { volumeId: "", chapterId: null }
  );
  const [, forceCatalogRefresh] = useState(0);

  async function refreshCatalog() {
    const items = await fetchCatalog();
    setCatalog(items);
    if (items.length) {
      books = catalogToDisplayBooks(items);
      forceCatalogRefresh((v) => v + 1);
    } else {
      // Keep demo cards visible until the real catalog is connected and contains published novels.
      books = [
        { title: "The Saint of Hollow Skies", alt: "Sora no Seijo", author: "Mina Kurosawa", image: photos.castle, rating: "4.9", tag: "Fantasy", volume: "Vol. 4", fresh: true },
        { title: "Asteria Academy", alt: "Mahō Gakuen Asteria", author: "Ren Ishikawa", image: photos.tower, rating: "4.8", tag: "Academy", volume: "Vol. 7", fresh: true },
        { title: "The Last Cartographer", alt: "Saigo no Chizu-shi", author: "Aya Mori", image: photos.hill, rating: "4.7", tag: "Adventure", volume: "Vol. 3", fresh: false },
        { title: "Letters Beyond the Moon", alt: "Tsuki no Tegami", author: "Haru Senda", image: photos.moon, rating: "4.9", tag: "Drama", volume: "Vol. 6", fresh: false },
      ];
      forceCatalogRefresh((v) => v + 1);
    }
  }

  useEffect(() => {
    let active = true;
    refreshCatalog().catch(() => undefined);
    if (!active) return () => { active = false; };
    
    if (!supabase) return () => { active = false; };
    supabase.auth.getSession().then(({ data }) => { if (active) setUser(data.session?.user ?? null); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user) { setProgress(new Map()); setBookmarks([]); return; }
    Promise.all([fetchUserProgress(user.id), fetchUserBookmarks(user.id)]).then(([items, saved]) => {
      setProgress(new Map(items.map((item) => [item.volume_id, Number(item.progress_percent)])));
      setBookmarks(saved);
      if (!readerTarget.volumeId && items[0]?.volume_id) {
        setReaderTarget({ volumeId: items[0].volume_id, chapterId: items[0].chapter_id });
      }
    }).catch(() => undefined);
  }, [user]);

  function openReader(target?: { volumeId?: string | null; chapterId?: string | null; book?: DisplayBook }) {
    const volumeId = target?.volumeId ?? target?.book?.volumeId;
    const chapterId = target?.chapterId ?? target?.book?.chapterId ?? null;
    const fallbackVolume = catalog.find((book) => book.volumes.some((volume) => progress.has(volume.id)))?.volumes.find((volume) => progress.has(volume.id))
      ?? catalog.find((book) => book.featured)?.volumes.at(-1)
      ?? catalog[0]?.volumes.at(-1);
    const finalVolumeId = volumeId ?? fallbackVolume?.id ?? "";
    const finalChapterId = chapterId ?? fallbackVolume?.chapters[0]?.id ?? null;
    if (!finalVolumeId) { setView("search"); return; }
    setReaderTarget({ volumeId: finalVolumeId, chapterId: finalChapterId });
    setView("reader");
    if (typeof window !== "undefined") {
      const params = new URLSearchParams({ volume: finalVolumeId });
      if (finalChapterId) params.set("chapter", finalChapterId);
      window.history.replaceState(null, "", `#reader?${params.toString()}`);
    }
  }

  const targetBook = catalog.find((book) => book.volumes.some((volume) => volume.id === readerTarget.volumeId));
  const targetVolume = targetBook?.volumes.find((volume) => volume.id === readerTarget.volumeId) ?? targetBook?.volumes.at(-1);
  const targetChapter = targetVolume?.chapters.find((chapter) => chapter.id === readerTarget.chapterId) ?? targetVolume?.chapters[0];

  function selectReaderChapter(chapterId:string) {
    if (!targetVolume) return;
    setReaderTarget({ volumeId: targetVolume.id, chapterId });
    if (typeof window !== "undefined") {
      const params = new URLSearchParams({ volume: targetVolume.id, chapter: chapterId });
      window.history.replaceState(null, "", `#reader?${params.toString()}`);
    }
  }

  async function handleSignOut() { await signOut(); setUser(null); setReaderTarget({volumeId:"",chapterId:null}); setView("home"); if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname + window.location.search); }

  return <><div className="app-shell"><Sidebar view={view} setView={setView} onAuth={() => setAuthOpen(true)} user={user}/><div className="main-shell"><Topbar title={view === "admin" ? "Content operations" : view === "library" ? "My library" : undefined} setView={setView} user={user} onAuth={() => setAuthOpen(true)}/>{view === "home" && <Home setView={setView} catalog={catalog} progress={progress} onRead={(book)=>openReader({book})}/>} {view === "rights" && <TakedownView/>} {view === "community" && <CommunityView user={user} onAuth={()=>setAuthOpen(true)}/>} {view === "search" && <SearchView setView={setView} user={user} onAuth={() => setAuthOpen(true)} onRead={(target)=>openReader(target)}/>} {view === "admin" && <AdminView catalog={catalog} user={user} onAuth={() => setAuthOpen(true)} onCatalogChanged={refreshCatalog}/>} {view === "library" && <LibraryView user={user} progress={progress} bookmarks={bookmarks} catalog={catalog} onAuth={() => setAuthOpen(true)} onRead={openReader}/>}</div><BottomNav view={view} setView={(next)=> next === "reader" ? openReader() : setView(next)}/></div>{view === "reader" && <Reader setView={(next)=>{if(next !== "reader") { setView(next); if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname + window.location.search); }}} user={user} onAuth={() => setAuthOpen(true)} syncVolumeId={targetVolume?.id ?? null} syncChapterId={targetChapter?.id ?? null} volume={targetVolume} chapter={targetChapter} onSelectChapter={selectReaderChapter}/>}<AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} onSignedIn={(nextUser) => setUser(nextUser)}/>{user && <button type="button" className="signout-fab" onClick={handleSignOut}>Sign out</button>}</>;
}