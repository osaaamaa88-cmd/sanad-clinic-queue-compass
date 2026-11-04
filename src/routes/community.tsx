import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUp, Info, MessageCircle, Plus, Search, SlidersHorizontal } from "lucide-react";
import { unreadCounts } from "@/lib/chat";
import { AppShell } from "@/components/AppShell";
import { NotificationsBell } from "@/components/NotificationsBell";
import { PatientAuthModal } from "@/components/PatientAuthModal";
import { supabase } from "@/integrations/supabase/client";
import { useDoctorClinicId } from "@/lib/use-doctor-mode";
import { specialties, getSpecialty } from "@/lib/mock-data";
import { getFollowerKey } from "@/lib/clinic-profile";
import { StoriesRow } from "@/components/community/StoriesRow";
import { FeedTabs } from "@/components/community/FeedTabs";
import { PostCard, type PostActions } from "@/components/community/PostCard";
import { CommentsSheet } from "@/components/community/CommentsSheet";
import { ComposerSheet } from "@/components/community/ComposerSheet";
import { SearchOverlay } from "@/components/community/SearchOverlay";
import { FilterSheet, RulesSheet, RULES_KEY } from "@/components/community/CommunitySheets";
import { ReportDialog, type ReportReason } from "@/components/community/ReportDialog";
import {
  fetchFeedPage,
  getHiddenPosts,
  hidePostLocally,
  setLiked,
  setSaved,
  sharePost,
  signImages,
} from "@/components/community/community-api";
import {
  flattenPages,
  nextCursor,
  type AnsweredFilter,
  type FeedCursor,
  type FeedPost,
  type FeedTab,
} from "@/components/community/community-logic";

export const Route = createFileRoute("/community")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "مجتمع سند — اسأل واستشر أطباء مصر" },
      {
        name: "description",
        content: "مجتمع سند الطبي: انشر سؤالك أو صورة تحليلك، وتلقَّ ردود أطباء معتمدين وتجارب المرضى.",
      },
      { property: "og:title", content: "مجتمع سند — اسأل واستشر أطباء مصر" },
      { property: "og:description", content: "اسأل، شارك تجربتك، واحصل على إجابات أطباء موثّقين." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommunityPage,
});

const POPULAR = specialties.filter((s) => s.category === "popular");
type Composer = null | "question" | "card";

function CommunityPage() {
  const doctorClinicId = useDoctorClinicId();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [tab, setTab] = useState<FeedTab>("for_you");
  const [answered, setAnswered] = useState<AnsweredFilter>("all");
  const [specialty, setSpecialty] = useState("");
  const [followerKey, setFollowerKey] = useState("");
  const [composer, setComposer] = useState<Composer>(null);
  const [commentsFor, setCommentsFor] = useState<FeedPost | null>(null);
  const [report, setReport] = useState<{ postId?: string; commentId?: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [images, setImages] = useState<Record<string, string>>({});
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [hasNew, setHasNew] = useState(false);
  const [pull, setPull] = useState(0);
  const pullStart = useRef<number | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFollowerKey(getFollowerKey());
    setHidden(getHiddenPosts());
    if (!localStorage.getItem(RULES_KEY)) setRulesOpen(true);
  }, []);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUserId(u?.id ?? null);
      const md = (u?.user_metadata ?? {}) as Record<string, string>;
      setUserName(md.full_name || md.name || (u?.email ? u.email.split("@")[0] : "") || "عضو سند");
    });
  }, [authOpen]);

  useEffect(() => {
    if (!doctorClinicId) return;
    void supabase
      .from("clinics")
      .select("doctor")
      .eq("id", doctorClinicId)
      .maybeSingle()
      .then(({ data }) => setDoctorName(data?.doctor ?? ""));
  }, [doctorClinicId]);

  useEffect(() => {
    if (!userId) return setUnreadTotal(0);
    void unreadCounts(userId)
      .then((m) => setUnreadTotal(Object.values(m).reduce((a, b) => a + b, 0)))
      .catch(() => {});
  }, [userId]);

  const params = { tab, specialty, answered, followerKey };
  const queryKey = useMemo(
    () => ["community-feed", tab, specialty, tab === "questions" ? answered : "all", followerKey, userId ?? "anon"],
    [tab, specialty, answered, followerKey, userId],
  );

  const feed = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchFeedPage(params, pageParam as FeedCursor),
    initialPageParam: null as FeedCursor,
    getNextPageParam: (last) => nextCursor(last),
    staleTime: 30_000,
  });

  const posts = useMemo(
    () => flattenPages(feed.data?.pages ?? []).filter((p) => !hidden.has(p.id)),
    [feed.data, hidden],
  );

  // Sign images only for loaded posts (cached ~50 min).
  useEffect(() => {
    const paths = posts.map((p) => p.image_path).filter((p) => p && !images[p]);
    if (!paths.length) return;
    void signImages(paths).then((m) => setImages((s) => ({ ...s, ...m })));
  }, [posts, images]);

  // Infinite scroll.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [feed.hasNextPage, feed.isFetchingNextPage, feed.fetchNextPage]);

  // "New posts" badge: poll every 60s while the tab is visible.
  useEffect(() => {
    setHasNew(false);
    const id = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const top = feed.data?.pages[0]?.[0];
      try {
        const fresh = await fetchFeedPage(params, null);
        if (fresh[0] && top && fresh[0].id !== top.id) setHasNew(true);
      } catch {
        /* ignore */
      }
    }, 60_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, feed.data?.pages[0]?.[0]?.id]);

  const refresh = useCallback(async () => {
    setHasNew(false);
    await queryClient.resetQueries({ queryKey });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [queryClient, queryKey]);

  const requireAuth = () => {
    if (userId) return true;
    setAuthOpen(true);
    return false;
  };

  const patchPost = (id: string, fn: (p: FeedPost) => FeedPost) =>
    queryClient.setQueryData<InfiniteData<FeedPost[]>>(queryKey, (d) =>
      d ? { ...d, pages: d.pages.map((pg) => pg.map((p) => (p.id === id ? fn(p) : p))) } : d,
    );

  const actions: PostActions = {
    onLike: async (p) => {
      if (!requireAuth()) return;
      const on = !p.my_liked;
      patchPost(p.id, (x) => ({ ...x, my_liked: on, likes_count: x.likes_count + (on ? 1 : -1) }));
      try {
        await setLiked(p.id, userId!, on);
      } catch {
        patchPost(p.id, (x) => ({ ...x, my_liked: !on, likes_count: x.likes_count + (on ? -1 : 1) }));
        toast.error("تعذّر الحفظ، حاول تاني");
      }
    },
    onSave: async (p) => {
      if (!requireAuth()) return;
      const on = !p.my_saved;
      patchPost(p.id, (x) => ({ ...x, my_saved: on }));
      try {
        await setSaved(p.id, userId!, on);
        if (on) toast.success("اتحفظ المنشور");
      } catch {
        patchPost(p.id, (x) => ({ ...x, my_saved: !on }));
        toast.error("تعذّر الحفظ، حاول تاني");
      }
    },
    onShare: (p) => void sharePost(p.id),
    onComments: (p) => setCommentsFor(p),
    onHide: (p) => {
      hidePostLocally(p.id);
      setHidden((s) => new Set(s).add(p.id));
      toast("تم إخفاء المنشور");
    },
    onReport: (p) => requireAuth() && setReport({ postId: p.id }),
    onDelete: async (p) => {
      if (!confirm("حذف المنشور؟")) return;
      const { error } = await supabase.from("community_posts").delete().eq("id", p.id);
      if (error) return void toast.error("تعذّر الحذف");
      setHidden((s) => new Set(s).add(p.id));
    },
  };

  const submitReport = async (reason: ReportReason, details: string) => {
    if (!report) return;
    const { error } = await supabase.from("community_reports").insert({
      post_id: report.postId ?? null,
      comment_id: report.commentId ?? null,
      reason,
      details: details.trim(),
    });
    if (error) {
      if (error.code === "23505") toast.info("سبق وأبلغت عن هذا المحتوى");
      else toast.error("تعذّر إرسال البلاغ");
      return;
    }
    toast.success("تم إرسال البلاغ للمراجعة");
    setReport(null);
  };

  const openComposer = (type: Exclude<Composer, null>) => {
    if (!requireAuth()) return;
    setComposer(type);
  };

  const spec = getSpecialty(specialty);

  return (
    <AppShell
      title="مجتمع سند"
      subtitle="اسأل • شارك • اطمّن"
      backTo={doctorClinicId ? "/doctor" : "/patient"}
      right={
        <>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="بحث"
            className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-foreground"
          >
            <Search className="h-5 w-5" />
          </button>
          {doctorClinicId && (
            <Link
              to="/messages"
              aria-label="الرسائل"
              className="relative grid h-11 w-11 place-items-center rounded-full bg-secondary text-foreground"
            >
              <MessageCircle className="h-5 w-5" />
              {unreadTotal > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-xs font-black text-destructive-foreground ring-2 ring-card">
                  {unreadTotal > 9 ? "9+" : unreadTotal}
                </span>
              )}
            </Link>
          )}
          {doctorClinicId ? (
            <NotificationsBell audience="clinic" clinicId={doctorClinicId} />
          ) : (
            <NotificationsBell audience="patient" />
          )}
        </>
      }
    >
      <div
        className="pb-32"
        onTouchStart={(e) => {
          pullStart.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
        }}
        onTouchMove={(e) => {
          if (pullStart.current == null) return;
          setPull(Math.max(0, Math.min(80, e.touches[0].clientY - pullStart.current)));
        }}
        onTouchEnd={() => {
          if (pull > 64) void refresh();
          pullStart.current = null;
          setPull(0);
        }}
      >
        {pull > 0 && (
          <div className="grid h-10 place-items-center text-xs font-bold text-muted-foreground" style={{ opacity: pull / 80 }}>
            {pull > 64 ? "اترك للتحديث" : "اسحب للتحديث"}
          </div>
        )}

        <div className="px-4 pt-3">
          <StoriesRow isDoctor={!!doctorClinicId} onCompose={() => openComposer("card")} />
        </div>

        <div className="sticky top-0 z-20 mt-2 bg-background">
          <FeedTabs
            value={tab}
            onChange={(t) => {
              setTab(t);
              window.scrollTo({ top: 0 });
            }}
          />
          <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-bold ${spec && !POPULAR.some((s) => s.id === specialty) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {spec && !POPULAR.some((s) => s.id === specialty) ? spec.name : "تصفية"}
            </button>
            {tab === "questions" &&
              (["all", "unanswered", "answered"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAnswered(a)}
                  className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold ${answered === a ? "border-foreground bg-foreground text-background" : "border-border bg-card"}`}
                >
                  {a === "all" ? "الكل" : a === "unanswered" ? "بدون رد" : "تمت الإجابة"}
                </button>
              ))}
            {tab !== "questions" &&
              POPULAR.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSpecialty((c) => (c === s.id ? "" : s.id))}
                  className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold ${specialty === s.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
                >
                  {s.emoji} {s.name}
                </button>
              ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => openComposer("question")}
          className="flex min-h-14 w-full items-center gap-3 border-b border-border px-4 text-right"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-black text-primary">
            {(doctorName || userName || "س").replace(/^د\.?\s*/, "").charAt(0)}
          </span>
          <span className="flex-1 text-sm text-muted-foreground">
            {doctorClinicId ? "شارك نصيحة طبية مع المرضى..." : "ما سؤالك؟"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          className="flex min-h-11 w-full items-center gap-2 px-4 text-xs font-bold text-muted-foreground"
        >
          <Info className="h-4 w-4" /> للتوعية فقط ولا يغني عن الكشف — في الطوارئ 123 · قواعد المجتمع
        </button>

        {hasNew && (
          <div className="pointer-events-none sticky top-28 z-20 flex justify-center">
            <button
              type="button"
              onClick={() => void refresh()}
              className="pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-soft"
            >
              <ArrowUp className="h-4 w-4" /> منشورات جديدة
            </button>
          </div>
        )}

        {feed.isPending ? (
          <div className="space-y-4 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="community-skeleton h-10 w-10 rounded-full" />
                  <div className="community-skeleton h-4 w-32 rounded" />
                </div>
                <div className="community-skeleton h-24 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : feed.isError ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <p>تعذّر تحميل المنشورات</p>
            <button type="button" onClick={() => void feed.refetch()} className="mt-3 min-h-11 rounded-xl bg-primary px-4 font-bold text-primary-foreground">
              إعادة المحاولة
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <p>
              {tab === "following"
                ? "تابع عيادات علشان تشوف منشوراتها هنا."
                : tab === "doctors"
                  ? "لا توجد منشورات من أطباء موثّقين حالياً."
                  : "لا توجد منشورات هنا بعد."}
            </p>
            {(specialty || answered !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSpecialty("");
                  setAnswered("all");
                }}
                className="mt-3 min-h-11 rounded-xl bg-primary px-4 font-bold text-primary-foreground"
              >
                عرض الكل
              </button>
            )}
          </div>
        ) : (
          posts.map((p, i) => (
            <PostCard key={p.id} post={p} image={images[p.image_path]} reveal={i < 4} actions={actions} />
          ))
        )}
        <div ref={sentinel} className="h-10" />
        {feed.isFetchingNextPage && <div className="community-skeleton mx-4 h-24 rounded-2xl" />}
      </div>

      <button
        type="button"
        onClick={() => openComposer("question")}
        aria-label="منشور جديد"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft active:scale-95 transition-transform"
      >
        <Plus className="h-7 w-7" />
      </button>

      {searchOpen && (
        <SearchOverlay
          onClose={() => setSearchOpen(false)}
          onOpenPost={(p) => {
            setSearchOpen(false);
            setCommentsFor(p);
          }}
        />
      )}
      {filterOpen && (
        <FilterSheet
          value={specialty}
          onChange={(id) => {
            setSpecialty(id);
            setFilterOpen(false);
          }}
          onClose={() => setFilterOpen(false)}
        />
      )}
      {rulesOpen && (
        <RulesSheet
          onClose={() => {
            localStorage.setItem(RULES_KEY, "1");
            setRulesOpen(false);
          }}
        />
      )}
      {commentsFor && (
        <CommentsSheet
          postId={commentsFor.id}
          userId={userId}
          authorName={doctorClinicId ? doctorName || userName : userName}
          clinicId={doctorClinicId}
          onClose={() => setCommentsFor(null)}
          requireAuth={requireAuth}
          onReport={(commentId) => requireAuth() && setReport({ commentId })}
          onCountChange={(d) => patchPost(commentsFor.id, (x) => ({ ...x, comments_count: x.comments_count + d }))}
        />
      )}
      {report && <ReportDialog onClose={() => setReport(null)} onSubmit={submitReport} />}
      {composer && userId && (
        <ComposerSheet
          initialType={composer}
          userId={userId}
          userName={doctorClinicId ? doctorName || userName : userName}
          clinicId={doctorClinicId}
          onClose={() => setComposer(null)}
          onDone={() => {
            setComposer(null);
            void refresh();
          }}
        />
      )}
      {authOpen && (
        <PatientAuthModal
          title="سجّل دخولك للتفاعل في مجتمع سند"
          onClose={() => setAuthOpen(false)}
          onDone={() => setAuthOpen(false)}
        />
      )}
    </AppShell>
  );
}
