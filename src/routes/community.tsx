import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  CalendarPlus,
  Flag,
  Heart,
  ImagePlus,
  Lock,
  MessageCircle,
  PenLine,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { unreadCounts } from "@/lib/chat";
import { AppShell } from "@/components/AppShell";
import { PatientAuthModal } from "@/components/PatientAuthModal";
import { StoryViewer } from "@/components/StoryViewer";
import { supabase } from "@/integrations/supabase/client";
import { useDoctorClinicId } from "@/lib/use-doctor-mode";
import { specialties, getSpecialty } from "@/lib/mock-data";
import { getFollowerKey } from "@/lib/clinic-profile";
import { svrFollowedStories } from "@/lib/community.functions";
import { getClinicStories, type StoryItem } from "@/lib/stories";
import { compressImage } from "@/lib/media-upload";

export const Route = createFileRoute("/community")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "مجتمع سند — اسأل واستشر أطباء مصر" },
      {
        name: "description",
        content:
          "مجتمع سند الطبي: انشر سؤالك أو صورة تحليلك، وتلقَّ ردود أطباء معتمدين وتجارب المرضى.",
      },
      { property: "og:title", content: "مجتمع سند — اسأل واستشر أطباء مصر" },
      {
        property: "og:description",
        content: "انشر استشارتك بنص أو صورة أو بطاقة ملونة، وتفاعل مع أطباء معتمدين.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommunityPage,
});

const BGS = ["navy", "ocean", "emerald", "gold", "rose", "lavender", "sunset", "night"] as const;
const FONTS = [
  { id: "alexandria", label: "عصري" },
  { id: "kufi", label: "كوفي" },
  { id: "ruqaa", label: "رقعة" },
  { id: "lalezar", label: "عريض" },
  { id: "amiri", label: "نسخ" },
  { id: "marhey", label: "مرح" },
] as const;
const SPECIALTY_CATEGORIES = [
  { id: "popular", label: "الشائعة" },
  { id: "surgical", label: "جراحية" },
  { id: "family", label: "أطفال وأسرة" },
  { id: "therapy", label: "علاجات" },
] as const;
const REPORT_REASONS = [
  { id: "spam", label: "محتوى مزعج أو غير مرغوب" },
  { id: "harassment", label: "إساءة أو مضايقة" },
  { id: "medical_misinformation", label: "معلومة طبية مضللة" },
  { id: "privacy", label: "انتهاك الخصوصية" },
  { id: "other", label: "سبب آخر" },
] as const;
type ReportReason = (typeof REPORT_REASONS)[number]["id"];

type Post = {
  id: string;
  is_mine: boolean;
  author_name: string;
  is_anonymous: boolean;
  clinic_id: string | null;
  kind: string;
  body: string;
  bg_style: string;
  font_style: string;
  image_path: string;
  specialty_id: string;
  created_at: string;
};
type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  clinic_id: string | null;
  body: string;
  created_at: string;
};
type ClinicLite = { id: string; doctor: string; specialty_id: string; is_verified: boolean };

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

function CommunityPage() {
  const doctorClinicId = useDoctorClinicId();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [clinics, setClinics] = useState<Record<string, ClinicLite>>({});
  const [images, setImages] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("");
  const [specialtyCategory, setSpecialtyCategory] = useState<string>("popular");
  const [noReplyOnly, setNoReplyOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState<null | "post" | "card">(null);
  const [composerAnonymous, setComposerAnonymous] = useState(false);
  const [quickImageFile, setQuickImageFile] = useState<File | null>(null);
  const imagePickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUserId(u?.id ?? null);
      const md = (u?.user_metadata ?? {}) as Record<string, string>;
      setUserName(md.full_name || md.name || (u?.email ? u.email.split("@")[0] : "") || "عضو سند");
    });
  }, [authOpen]);

  const load = useCallback(async () => {
    let q = supabase
      .from("community_feed")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (filter) q = q.eq("specialty_id", filter);
    const { data, error } = await q;
    if (error) {
      toast.error("تعذّر تحميل منشورات المجتمع");
      setLoading(false);
      return;
    }
    const list = (data ?? []) as Post[];
    if (list.length === 0) {
      setPosts([]);
      setComments({});
      setLikes({});
      setLiked({});
      setClinics({});
      setLoading(false);
      return;
    }
    setPosts(list);
    setLoading(false);
    const ids = list.map((p) => p.id);
    if (!ids.length) return;
    const [{ data: cs }, { data: ls }] = await Promise.all([
      supabase.from("community_comments").select("*").in("post_id", ids).order("created_at"),
      supabase.from("community_likes").select("post_id, user_id").in("post_id", ids),
    ]);
    const cmap: Record<string, Comment[]> = {};
    for (const c of (cs ?? []) as Comment[]) (cmap[c.post_id] ??= []).push(c);
    setComments(cmap);
    const lc: Record<string, number> = {};
    const me: Record<string, boolean> = {};
    const { data: u } = await supabase.auth.getUser();
    for (const l of ls ?? []) {
      lc[l.post_id] = (lc[l.post_id] ?? 0) + 1;
      if (l.user_id === u.user?.id) me[l.post_id] = true;
    }
    setLikes(lc);
    setLiked(me);
    const cids = [
      ...new Set(
        [
          ...list.map((p) => p.clinic_id),
          ...((cs ?? []) as Comment[]).map((c) => c.clinic_id),
        ].filter(Boolean) as string[],
      ),
    ];
    if (cids.length) {
      const { data: cl } = await supabase
        .from("clinics")
        .select("id, doctor, specialty_id, is_verified")
        .in("id", cids);
      setClinics(Object.fromEntries((cl ?? []).map((c) => [c.id, c as ClinicLite])));
    }
    const paths = list.map((p) => p.image_path).filter(Boolean);
    if (paths.length) {
      const { data: signed } = await supabase.storage
        .from("community")
        .createSignedUrls(paths, 60 * 60);
      setImages(
        Object.fromEntries(
          (signed ?? [])
            .filter((s) => s.signedUrl)
            .map((s) => [s.path ?? "", s.signedUrl as string]),
        ),
      );
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  useEffect(() => {
    if (!userId) {
      setUnreadTotal(0);
      return;
    }
    void unreadCounts(userId)
      .then((m) => setUnreadTotal(Object.values(m).reduce((a, b) => a + b, 0)))
      .catch(() => {});
  }, [userId]);

  const requireAuth = () => {
    if (!userId) {
      setAuthOpen(true);
      return false;
    }
    return true;
  };

  const toggleLike = async (id: string) => {
    if (!requireAuth()) return;
    const on = !liked[id];
    setLiked((s) => ({ ...s, [id]: on }));
    setLikes((s) => ({ ...s, [id]: (s[id] ?? 0) + (on ? 1 : -1) }));
    if (on) await supabase.from("community_likes").insert({ post_id: id, user_id: userId! });
    else await supabase.from("community_likes").delete().eq("post_id", id).eq("user_id", userId!);
  };

  const addComment = async (postId: string, body: string) => {
    if (!requireAuth()) return false;
    const { error } = await supabase.from("community_comments").insert({
      post_id: postId,
      author_id: userId!,
      body: body.trim().slice(0, 1000),
      author_name: doctorClinicId ? clinics[doctorClinicId]?.doctor || userName : userName,
      clinic_id: doctorClinicId,
    });
    if (error) {
      toast.error("تعذّر إرسال التعليق");
      return false;
    }
    void load();
    return true;
  };

  const deletePost = async (id: string) => {
    if (!confirm("حذف المنشور؟")) return;
    await supabase.from("community_posts").delete().eq("id", id);
    setPosts((p) => p.filter((x) => x.id !== id));
  };
  const deleteComment = async (c: Comment) => {
    await supabase.from("community_comments").delete().eq("id", c.id);
    void load();
  };
  const submitReport = async (
    target: { postId?: string; commentId?: string },
    reason: ReportReason,
    details: string,
  ) => {
    if (!requireAuth()) return false;
    try {
      const { error } = await supabase.from("community_reports").insert({
        post_id: target.postId ?? null,
        comment_id: target.commentId ?? null,
        reason,
        details: details.trim(),
      });
      if (error) {
        if (error.code === "23505") toast.info("سبق وأبلغت عن هذا المحتوى");
        else toast.error("تعذّر إرسال البلاغ");
        return false;
      }
      toast.success("تم إرسال البلاغ للمراجعة");
      return true;
    } catch (error) {
      console.error("Community report submission failed", error);
      toast.error("تعذّر إرسال البلاغ؛ تحقق من اتصالك وحاول مرة أخرى");
      return false;
    }
  };
  const visiblePosts = posts.filter(
    (post) => !noReplyOnly || (comments[post.id]?.length ?? 0) === 0,
  );
  const visibleSpecialties = specialties.filter(
    (specialty) => specialty.category === specialtyCategory,
  );

  // Make sure the doctor's own clinic name is known for their comments.
  useEffect(() => {
    if (!doctorClinicId || clinics[doctorClinicId]) return;
    void supabase
      .from("clinics")
      .select("id, doctor, specialty_id, is_verified")
      .eq("id", doctorClinicId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setClinics((s) => ({ ...s, [data.id]: data as ClinicLite }));
      });
  }, [doctorClinicId, clinics]);

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
            className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground"
          >
            <Search className="h-5 w-5" />
          </button>
          <Link
            to="/messages"
            aria-label="الرسائل"
            className="relative grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground"
          >
            <MessageCircle className="h-5 w-5" />
            {unreadTotal > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-xs font-black text-destructive-foreground ring-2 ring-card">
                {unreadTotal > 9 ? "9+" : unreadTotal}
              </span>
            )}
          </Link>
        </>
      }
    >
      {searchOpen && <SearchOverlay posts={posts} onClose={() => setSearchOpen(false)} />}
      <div className="space-y-4 px-4 pb-28 pt-3">
        <input
          ref={imagePickerRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (!file.type.startsWith("image/")) {
              toast.error("اختر صورة فقط");
              return;
            }
            setQuickImageFile(file);
            setComposerAnonymous(false);
            setComposer("post");
          }}
        />
        <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-bold leading-relaxed text-foreground">
          للتوعية فقط ولا يغني عن الكشف الطبي — في الطوارئ اتصل بـ 123.
        </div>
        <StoriesBar
          isDoctor={!!doctorClinicId}
          onCompose={() => {
            if (doctorClinicId) return false;
            if (!userId) {
              setAuthOpen(true);
              return true;
            }
            setComposerAnonymous(false);
            setComposer("card");
            return true;
          }}
        />

        <div className="rounded-3xl border border-border bg-card p-3 shadow-soft">
          <button
            type="button"
            onClick={() => requireAuth() && setComposer("post")}
            className="w-full rounded-2xl bg-secondary px-4 py-3 text-right text-sm text-muted-foreground"
          >
            {doctorClinicId
              ? "شارك نصيحة طبية مع المرضى..."
              : "اكتب استشارتك أو سؤالك الطبي هنا..."}
          </button>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => requireAuth() && setComposer("card")}
              className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-primary hover:bg-primary-soft"
            >
              <PenLine className="h-4 w-4" />
              بطاقة ملونة
            </button>
            <button
              type="button"
              onClick={() => {
                if (!requireAuth()) return;
                setComposerAnonymous(false);
                imagePickerRef.current?.click();
              }}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl py-2 text-success hover:bg-secondary"
            >
              <ImagePlus className="h-4 w-4" />
              صورة / تحليل
            </button>
            <button
              type="button"
              onClick={() => {
                if (!requireAuth()) return;
                setComposerAnonymous(true);
                setComposer("post");
              }}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl py-2 text-muted-foreground hover:bg-secondary"
            >
              <Lock className="h-4 w-4" />
              مجهول
            </button>
          </div>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {SPECIALTY_CATEGORIES.map((category) => (
            <Chip
              key={category.id}
              active={specialtyCategory === category.id}
              onClick={() => {
                setSpecialtyCategory(category.id);
                if (
                  filter &&
                  !specialties.some((s) => s.id === filter && s.category === category.id)
                ) {
                  setFilter("");
                }
              }}
            >
              {category.label}
            </Chip>
          ))}
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <Chip active={!filter} onClick={() => setFilter("")}>
            الكل
          </Chip>
          {visibleSpecialties.map((s) => (
            <Chip key={s.id} active={filter === s.id} onClick={() => setFilter(s.id)}>
              {s.emoji} {s.name}
            </Chip>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={noReplyOnly}
          onClick={() => setNoReplyOnly((current) => !current)}
          className={`min-h-11 rounded-full border px-4 text-xs font-bold ${noReplyOnly ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}
        >
          بدون رد
        </button>

        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-3xl bg-secondary" />
            ))}
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <p>
              {noReplyOnly
                ? "لا توجد منشورات بلا رد حالياً."
                : filter
                  ? "لا توجد منشورات في هذا التخصص حالياً."
                  : "لا توجد منشورات بعد."}
            </p>
            {(filter || noReplyOnly) && (
              <button
                type="button"
                onClick={() => {
                  setFilter("");
                  setNoReplyOnly(false);
                }}
                className="mt-3 min-h-11 rounded-xl bg-primary px-4 font-bold text-primary-foreground"
              >
                عرض الكل
              </button>
            )}
          </div>
        ) : (
          visiblePosts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              image={images[p.image_path]}
              clinic={p.clinic_id ? clinics[p.clinic_id] : undefined}
              comments={comments[p.id] ?? []}
              clinics={clinics}
              likes={likes[p.id] ?? 0}
              liked={!!liked[p.id]}
              userId={userId}
              onLike={() => toggleLike(p.id)}
              onComment={(b) => addComment(p.id, b)}
              onDelete={() => deletePost(p.id)}
              onDeleteComment={deleteComment}
              onReport={(target, reason, details) => submitReport(target, reason, details)}
              onRequestReport={requireAuth}
            />
          ))
        )}
      </div>

      {composer && userId && (
        <Composer
          mode={composer}
          initialAnonymous={composerAnonymous}
          initialFile={quickImageFile}
          userId={userId}
          userName={doctorClinicId ? clinics[doctorClinicId]?.doctor || userName : userName}
          clinicId={doctorClinicId}
          onClose={() => {
            setComposer(null);
            setComposerAnonymous(false);
            setQuickImageFile(null);
          }}
          onDone={() => {
            setComposer(null);
            setComposerAnonymous(false);
            setQuickImageFile(null);
            void load();
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

function SearchOverlay({ posts, onClose }: { posts: Post[]; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [docs, setDocs] = useState<{ id: string; doctor: string; specialty_id: string }[]>([]);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setDocs([]);
      return;
    }
    const t = setTimeout(() => {
      const specIds = specialties.filter((s) => s.name.includes(term)).map((s) => s.id);
      let query = supabase
        .from("clinics")
        .select("id, doctor, specialty_id")
        .eq("is_verified", true)
        .limit(15);
      query = specIds.length
        ? query.or(`doctor.ilike.%${term}%,specialty_id.in.(${specIds.join(",")})`)
        : query.ilike("doctor", `%${term}%`);
      void query.then(({ data }) => setDocs((data ?? []) as typeof docs));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  const term = q.trim();
  const matched =
    term.length >= 2
      ? posts
          .filter((p) => (!p.is_anonymous && p.author_name.includes(term)) || p.body.includes(term))
          .slice(0, 10)
      : [];
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-border bg-card p-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="grid h-10 w-10 place-items-center rounded-full bg-secondary"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-full bg-secondary px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن طبيب، تخصص، أو منشور..."
            className="h-10 w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {term.length < 2 && (
          <p className="pt-10 text-center text-sm text-muted-foreground">
            اكتب حرفين على الأقل للبحث
          </p>
        )}
        {docs.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-extrabold text-muted-foreground">الأطباء والعيادات</h3>
            <div className="space-y-2">
              {docs.map((d) => (
                <Link
                  key={d.id}
                  to="/patient/clinic/$id"
                  params={{ id: d.id }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-full gradient-gold font-black text-gold-foreground">
                    {d.doctor.replace(/^د\.?\s*/, "").charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{d.doctor}</span>
                    <span className="text-xs text-muted-foreground">
                      {getSpecialty(d.specialty_id)?.name ?? ""}
                    </span>
                  </span>
                  <BadgeCheck className="h-4 w-4 text-success" />
                </Link>
              ))}
            </div>
          </section>
        )}
        {matched.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-extrabold text-muted-foreground">المنشورات</h3>
            <div className="space-y-2">
              {matched.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    setTimeout(
                      () =>
                        document
                          .getElementById(`post-${p.id}`)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                      50,
                    );
                  }}
                  className="block w-full rounded-2xl border border-border bg-card p-3 text-right"
                >
                  <span className="block text-xs font-bold text-muted-foreground">
                    {p.author_name}
                  </span>
                  <span className="line-clamp-2 text-sm">{p.body || "📷 صورة"}</span>
                </button>
              ))}
            </div>
          </section>
        )}
        {term.length >= 2 && !docs.length && !matched.length && (
          <p className="pt-10 text-center text-sm text-muted-foreground">لا توجد نتائج</p>
        )}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}
    >
      {children}
    </button>
  );
}

const STORY_TIPS = [
  { bg: "ocean", text: "🚶 30 دقيقة مشي يومياً تحمي قلبك وتحسّن مزاجك" },
  { bg: "emerald", text: "💧 اشرب 8 أكواب ماء موزعة على اليوم" },
  { bg: "gold", text: "😴 نوم 7-8 ساعات يقوّي مناعتك وذاكرتك" },
  { bg: "lavender", text: "🥗 أضف سلطة خضراء لوجبتين يومياً" },
];

function StoriesBar({ isDoctor, onCompose }: { isDoctor: boolean; onCompose: () => boolean }) {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<
    {
      id: string;
      doctor: string;
      avatar: string;
      phone: string;
      hasStory: boolean;
      cover: string;
    }[]
  >([]);
  const [open, setOpen] = useState<{
    items: StoryItem[];
    clinic: { id: string; doctor: string; avatar: string; phone: string };
  } | null>(null);
  useEffect(() => {
    void svrFollowedStories({ data: { followerKey: getFollowerKey() } })
      .then((r) => setClinics(r.clinics))
      .catch(() => {});
  }, []);
  const openClinic = async (c: { id: string; doctor: string; avatar: string; phone: string }) => {
    const s = await getClinicStories(c.id);
    if (s.stories.length) setOpen({ items: s.stories, clinic: c });
    else void navigate({ to: "/patient/clinic/$id", params: { id: c.id } });
  };
  return (
    <>
      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {/* Create-story card (always first) */}
        <button
          type="button"
          onClick={() => {
            if (onCompose()) return;
            void navigate({ to: "/doctor/stories" });
          }}
          className="relative h-44 w-[6.5rem] shrink-0 overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
        >
          <span className="absolute inset-0 card-bg-navy opacity-90" />
          <span className="absolute inset-0 grid place-items-center">
            <span className="flex flex-col items-center gap-2">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/25">
                <Plus className="h-6 w-6" />
              </span>
              <span className="text-xs font-extrabold text-white">
                {isDoctor ? "إنشاء قصة" : "إنشاء بطاقة باسمك"}
              </span>
            </span>
          </span>
        </button>

        {clinics.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => void openClinic(c)}
            className="relative h-44 w-[6.5rem] shrink-0 overflow-hidden rounded-2xl border border-border shadow-soft"
          >
            {c.cover ? (
              <img
                src={c.cover}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
            ) : c.avatar ? (
              <img
                src={c.avatar}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="absolute inset-0 card-bg-ocean" />
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
            <span className="absolute right-2 top-2">
              <span
                className={`block rounded-full ${c.hasStory ? "gradient-story p-[2.5px] shadow-[0_0_10px_2px_rgb(59_130_246/0.6)]" : "p-[1.5px] ring-1 ring-white/40"}`}
              >
                <span className="block h-9 w-9 overflow-hidden rounded-full border border-background/60 bg-secondary">
                  {c.avatar ? (
                    <img
                      src={c.avatar}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-sm font-black text-white">
                      {c.doctor.replace(/^د\.?\s*/, "").charAt(0)}
                    </span>
                  )}
                </span>
              </span>
            </span>
            <span className="absolute inset-x-1.5 bottom-2 line-clamp-2 text-center text-xs font-extrabold leading-tight text-white drop-shadow">
              {c.doctor}
            </span>
          </button>
        ))}

        {STORY_TIPS.map((t, i) => (
          <span key={i} className="relative h-44 w-[6.5rem] shrink-0 overflow-hidden rounded-2xl">
            <span className={`absolute inset-0 card-bg-${t.bg}`} />
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
              <span className="rounded-full bg-black/25 px-2 py-0.5 text-xs font-extrabold text-white">
                نصيحة سند
              </span>
              <span className="text-xs font-bold leading-relaxed text-white">{t.text}</span>
            </span>
          </span>
        ))}
      </div>
      {open && (
        <StoryViewer
          items={open.items}
          title={open.clinic.doctor}
          avatar={open.clinic.avatar}
          clinicId={open.clinic.id}
          phone={open.clinic.phone}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function DoctorBadge({ clinic }: { clinic: ClinicLite }) {
  if (!clinic.is_verified) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-extrabold text-success">
      <BadgeCheck className="h-3 w-3" />
      طبيب معتمد
      {getSpecialty(clinic.specialty_id) ? ` • ${getSpecialty(clinic.specialty_id)!.name}` : ""}
    </span>
  );
}

function PostCard({
  post,
  image,
  clinic,
  comments,
  clinics,
  likes,
  liked,
  userId,
  onLike,
  onComment,
  onDelete,
  onDeleteComment,
  onReport,
  onRequestReport,
}: {
  post: Post;
  image?: string;
  clinic?: ClinicLite;
  comments: Comment[];
  clinics: Record<string, ClinicLite>;
  likes: number;
  liked: boolean;
  userId: string | null;
  onLike: () => void;
  onComment: (b: string) => Promise<boolean>;
  onDelete: () => void;
  onDeleteComment: (c: Comment) => void;
  onReport: (
    target: { postId?: string; commentId?: string },
    reason: ReportReason,
    details: string,
  ) => Promise<boolean>;
  onRequestReport: () => boolean;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ postId?: string; commentId?: string } | null>(
    null,
  );
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const spec = getSpecialty(post.specialty_id);
  const sorted = useMemo(
    () =>
      [...comments].sort(
        (a, b) =>
          Number(!!b.clinic_id && !!clinics[b.clinic_id]?.is_verified) -
          Number(!!a.clinic_id && !!clinics[a.clinic_id]?.is_verified),
      ),
    [comments, clinics],
  );
  const hasVerifiedAnswer = comments.some(
    (comment) => !!comment.clinic_id && !!clinics[comment.clinic_id]?.is_verified,
  );
  useEffect(() => {
    if (commentsOpen) commentInputRef.current?.focus();
  }, [commentsOpen]);

  return (
    <article
      id={`post-${post.id}`}
      className={`scroll-mt-20 overflow-hidden rounded-3xl border bg-card shadow-soft ${clinic?.is_verified ? "border-gold/50" : "border-border"}`}
    >
      <header className="flex items-center gap-3 p-4 pb-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${clinic?.is_verified ? "gradient-gold text-gold-foreground" : post.is_anonymous ? "bg-secondary text-muted-foreground" : "bg-primary-soft text-primary"}`}
        >
          {post.is_anonymous ? (
            <Lock className="h-4 w-4" />
          ) : (
            post.author_name.replace(/^د\.?\s*/, "").charAt(0)
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-bold">{post.author_name}</span>
            {clinic?.is_verified && <DoctorBadge clinic={clinic} />}
          </div>
          <div className="text-xs text-muted-foreground">
            {timeAgo(post.created_at)}
            {spec ? ` • ${spec.emoji} ${spec.name}` : ""}
          </div>
          {hasVerifiedAnswer && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-xs font-bold text-success">
              <BadgeCheck className="h-3.5 w-3.5" />
              تمت الإجابة من طبيب
            </span>
          )}
        </div>
        {post.is_mine && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="حذف"
            className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>

      {post.kind === "card" ? (
        <div
          className={`card-bg-${post.bg_style || "navy"} card-ink grid min-h-64 place-items-center px-6 py-10 text-center`}
        >
          <p
            className={`font-card-${post.font_style || "alexandria"} whitespace-pre-wrap text-2xl leading-relaxed`}
          >
            {post.body}
          </p>
        </div>
      ) : (
        <>
          {post.body && (
            <p className="whitespace-pre-wrap px-4 pb-3 text-[15px] leading-relaxed">{post.body}</p>
          )}
          {post.image_path &&
            (image ? (
              <img
                src={image}
                alt="صورة مرفقة"
                loading="lazy"
                className="max-h-[28rem] w-full bg-secondary object-contain"
              />
            ) : (
              <div className="h-60 animate-pulse bg-secondary" />
            ))}
        </>
      )}

      <div className="flex items-center gap-1 border-t border-border px-2 py-1.5 text-sm">
        <button
          type="button"
          onClick={onLike}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 font-bold ${liked ? "text-destructive" : "text-muted-foreground"}`}
        >
          <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
          {likes || ""} دعم
        </button>
        <button
          type="button"
          aria-expanded={commentsOpen}
          onClick={() => setCommentsOpen(true)}
          className="flex min-h-11 items-center gap-1.5 rounded-xl px-3 py-2 font-bold text-muted-foreground hover:bg-secondary"
        >
          <MessageCircle className="h-5 w-5" />
          التعليقات ({comments.length})
        </button>
        <button
          type="button"
          onClick={() => {
            if (onRequestReport()) setReportTarget({ postId: post.id });
          }}
          aria-label="الإبلاغ عن المنشور"
          className="mr-auto grid h-11 w-11 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
        >
          <Flag className="h-4 w-4" />
        </button>
      </div>

      {commentsOpen && comments.length > 0 && (
        <div className="space-y-2 px-4 pb-2">
          {sorted.map((c) => {
            const dc = c.clinic_id ? clinics[c.clinic_id] : undefined;
            return dc?.is_verified ? (
              <div key={c.id} className="rounded-2xl border border-gold/50 bg-gold-soft p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-extrabold">🩺 {c.author_name || dc.doctor}</span>
                  <DoctorBadge clinic={dc} />
                  {userId === c.author_id && (
                    <button
                      type="button"
                      onClick={() => onDeleteComment(c)}
                      aria-label="حذف التعليق"
                      className="mr-auto grid h-11 w-11 place-items-center text-muted-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {userId !== c.author_id && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onRequestReport()) setReportTarget({ commentId: c.id });
                      }}
                      aria-label="الإبلاغ عن التعليق"
                      className="grid h-11 w-11 place-items-center text-muted-foreground"
                    >
                      <Flag className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{c.body}</p>
                <Link
                  to="/patient/clinic/$id"
                  params={{ id: dc.id }}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  احجز في عيادة {dc.doctor}
                </Link>
              </div>
            ) : (
              <div key={c.id} className="rounded-2xl bg-secondary px-3 py-2">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {c.author_name}
                  <span className="font-medium text-muted-foreground">• عضو 💬</span>
                  {userId === c.author_id && (
                    <button
                      type="button"
                      onClick={() => onDeleteComment(c)}
                      aria-label="حذف التعليق"
                      className="mr-auto grid h-11 w-11 place-items-center text-muted-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {userId !== c.author_id && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onRequestReport()) setReportTarget({ commentId: c.id });
                      }}
                      aria-label="الإبلاغ عن التعليق"
                      className="grid h-11 w-11 place-items-center text-muted-foreground"
                    >
                      <Flag className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.body}</p>
              </div>
            );
          })}
        </div>
      )}

      {commentsOpen && (
        <form
          className="flex items-center gap-2 border-t border-border p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!text.trim() || sending) return;
            setSending(true);
            if (await onComment(text)) setText("");
            setSending(false);
          }}
        >
          <input
            ref={commentInputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            placeholder="اكتب تعليقاً..."
            className="h-11 flex-1 rounded-full bg-secondary px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label="إرسال"
            className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          >
            <Send className="h-4 w-4 -scale-x-100" />
          </button>
        </form>
      )}
      {reportTarget && (
        <ReportDialog
          onClose={() => setReportTarget(null)}
          onSubmit={async (reason, details) => {
            if (await onReport(reportTarget, reason, details)) setReportTarget(null);
          }}
        />
      )}
    </article>
  );
}

function ReportDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (reason: ReportReason, details: string) => Promise<void>;
}) {
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[130] grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-report-title"
    >
      <form
        className="w-full max-w-md space-y-4 rounded-3xl border border-border bg-card p-5 shadow-soft"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          await onSubmit(reason, details);
          setBusy(false);
        }}
      >
        <div>
          <h2 id="community-report-title" className="text-base font-extrabold">
            الإبلاغ عن محتوى
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            لن يظهر البلاغ لصاحب المنشور أو التعليق.
          </p>
        </div>
        <label className="block space-y-2 text-sm font-bold">
          سبب البلاغ
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value as ReportReason)}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal"
          >
            {REPORT_REASONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2 text-sm font-bold">
          تفاصيل إضافية (اختياري)
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            maxLength={500}
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm font-normal"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-xl border border-border px-4 text-sm font-bold"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 flex-1 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "جارٍ الإرسال..." : "إرسال البلاغ"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Composer({
  mode,
  initialAnonymous,
  initialFile,
  userId,
  userName,
  clinicId,
  onClose,
  onDone,
}: {
  mode: "post" | "card";
  initialAnonymous: boolean;
  initialFile: File | null;
  userId: string;
  userName: string;
  clinicId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [isCard, setIsCard] = useState(mode === "card");
  const [body, setBody] = useState("");
  const [bg, setBg] = useState<(typeof BGS)[number]>("navy");
  const [font, setFont] = useState<string>("alexandria");
  const [file, setFile] = useState<File | null>(initialFile);
  const [preview, setPreview] = useState("");
  const [anon, setAnon] = useState(initialAnonymous);
  const [spec, setSpec] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(() => {
    if (!initialFile) return;
    setIsCard(false);
    setPreview(URL.createObjectURL(initialFile));
  }, [initialFile]);

  const pick = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("اختر صورة فقط");
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setIsCard(false);
  };

  const submit = async () => {
    if (busy) return;
    if (isCard && !body.trim()) return toast.error("اكتب نص البطاقة");
    if (!isCard && !body.trim() && !file) return toast.error("اكتب نصاً أو أضف صورة");
    setBusy(true);
    try {
      let image_path = "";
      if (!isCard && file) {
        const small = await compressImage(file, 1440, 0.8);
        const ext = small.name.split(".").pop() || "jpg";
        image_path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("community")
          .upload(image_path, small, { contentType: small.type });
        if (error) throw error;
      }
      const { error } = await supabase.from("community_posts").insert({
        author_id: userId,
        author_name: userName,
        is_anonymous: clinicId ? false : anon,
        clinic_id: clinicId,
        kind: isCard ? "card" : image_path ? "image" : "text",
        body: body.trim().slice(0, isCard ? 280 : 2000),
        bg_style: isCard ? bg : "",
        font_style: isCard ? font : "",
        image_path,
        specialty_id: spec,
      });
      if (error) throw error;
      toast.success("تم النشر 💙");
      onDone();
    } catch {
      toast.error("تعذّر النشر، حاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-background" dir="rtl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="rounded-full p-2 hover:bg-secondary"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex rounded-full bg-secondary p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setIsCard(false)}
            className={`rounded-full px-3 py-1.5 ${!isCard ? "bg-card shadow" : "text-muted-foreground"}`}
          >
            منشور
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCard(true);
              setFile(null);
              setPreview("");
            }}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 ${isCard ? "bg-card shadow" : "text-muted-foreground"}`}
          >
            <PenLine className="h-3.5 w-3.5" />
            بطاقة
          </button>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "..." : "نشر"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-4 mt-4 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-bold leading-relaxed">
          للتوعية فقط ولا يغني عن الكشف الطبي — في الطوارئ اتصل بـ 123.
        </div>
        {isCard ? (
          <div
            className={`card-bg-${bg} card-ink relative grid min-h-[55vh] place-items-center px-6 transition-[background] duration-300`}
          >
            <textarea
              autoFocus
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={280}
              placeholder="اكتب ما يدور في بالك..."
              className={`font-card-${font} w-full resize-none bg-transparent text-center text-3xl leading-relaxed outline-none placeholder:text-current placeholder:opacity-60`}
              rows={5}
            />
            <span className="absolute bottom-3 left-4 text-xs opacity-70">{body.length}/280</span>
          </div>
        ) : (
          <div className="p-4">
            <textarea
              autoFocus
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              rows={6}
              placeholder={
                clinicId
                  ? "شارك نصيحة أو معلومة طبية..."
                  : "اشرح حالتك أو سؤالك... (السن، الأعراض، المدة)"
              }
              className="w-full resize-none bg-transparent text-base leading-relaxed outline-none"
            />
            {preview ? (
              <div className="relative mt-2 overflow-hidden rounded-2xl border border-border">
                <img src={preview} alt="" className="max-h-80 w-full object-contain bg-secondary" />
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview("");
                  }}
                  className="absolute left-2 top-2 rounded-full bg-background/90 p-1.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-8 text-sm font-bold text-muted-foreground"
              >
                <ImagePlus className="h-5 w-5" />
                أضف صورة (تحليل، أشعة، روشتة...)
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => pick(e.target.files?.[0])}
            />
          </div>
        )}

        <div className="space-y-4 p-4">
          {isCard && (
            <>
              <div>
                <div className="mb-2 text-xs font-bold text-muted-foreground">لون الخلفية</div>
                <div className="flex flex-wrap gap-2.5">
                  {BGS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      aria-label={b}
                      onClick={() => setBg(b)}
                      className={`card-bg-${b} h-10 w-10 rounded-full transition-transform ${bg === b ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-bold text-muted-foreground">نوع الخط</div>
                <div className="flex flex-wrap gap-2">
                  {FONTS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFont(f.id)}
                      className={`font-card-${f.id} rounded-xl border px-3 py-1.5 text-base ${font === f.id ? "border-primary bg-primary-soft text-primary" : "border-border"}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          <div>
            <div className="mb-2 text-xs font-bold text-muted-foreground">التخصص (اختياري)</div>
            <select
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
            >
              <option value="">عام</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.emoji} {s.name}
                </option>
              ))}
            </select>
          </div>
          {!clinicId && (
            <label className="flex items-center justify-between rounded-2xl bg-secondary p-3 text-sm font-bold">
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                انشر بدون اسم
              </span>
              <input
                type="checkbox"
                checked={anon}
                onChange={(e) => setAnon(e.target.checked)}
                className="h-5 w-5 accent-primary"
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
