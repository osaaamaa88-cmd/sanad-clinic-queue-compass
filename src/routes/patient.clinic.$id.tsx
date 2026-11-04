import { youtubeId } from "@/lib/youtube";
import { directionsPath } from "@/lib/directions";
import { PlayCircle } from "lucide-react";
import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  MapPin,
  Star,
  MessageCircle,
  Users,
  BadgeCheck,
  CalendarPlus,
  Navigation,
  Phone,
  Clock3,
  Sparkles,
  UserPlus,
  UserCheck,
  Play,
  Settings,
  Pencil,
  Plus,
  Trash2,
  ImagePlus,
  X,
  Loader2,
  LogOut,
  Heart,
  Share2,
  Camera,
  AlertTriangle,
  Grid3x3,
  Clapperboard,
  Info,
} from "lucide-react";
import { MessagesSquare, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { openConversation } from "@/lib/chat";
import { AppShell } from "@/components/AppShell";
import { AvatarActionSheet } from "@/components/AvatarActionSheet";
import { ClinicQrCard } from "@/components/ClinicQrCard";
import { PostViewer } from "@/components/PostViewer";
const StoryViewer = lazy(() =>
  import("@/components/StoryViewer").then((m) => ({ default: m.StoryViewer })),
);
import { NotificationsBell } from "@/components/NotificationsBell";
import {
  getClinicStories,
  addStory,
  deleteStory,
  createHighlight,
  deleteHighlight,
  pinStoriesToHighlight,
  removeClinicAvatar,
  type ClinicStories,
  type StoryItem,
} from "@/lib/stories";
import { clinicShareUrl, loadPostsSocial, shareLink, type PostSocial } from "@/lib/post-social";
import { listClinicReviews, submitVerifiedReview, type ClinicReview } from "@/lib/reviews";
import { PatientAuthModal } from "@/components/PatientAuthModal";
import { QuickBookingDrawer } from "@/components/booking/QuickBookingDrawer";
import {
  getPatientSession,
  syncPatientSessionFromAuth,
  type PatientSession,
} from "@/lib/patient-session";
import {
  getVerifiedClinic,
  getClinicById,
  getMyClinicMembership,
  getSpecialty,
  specialties,
  subscribeClinic,
  whatsappLink,
  signOutStaff,
  type Clinic,
} from "@/lib/mock-data";
import {
  getClinicProfileExtras,
  isFollowingClinic,
  toggleFollowClinic,
  saveClinicProfile,
  uploadClinicMedia,
  deleteClinicPost,
  type ClinicProfileExtras,
} from "@/lib/clinic-profile";

/** Feature flag: review form stays disabled until verified booking codes reach patients. */
const REVIEW_FORM_ENABLED = false;

export const Route = createFileRoute("/patient/clinic/$id")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "تفاصيل العيادة — سند" },
      {
        name: "description",
        content:
          "صفحة العيادة على سند: بيانات الطبيب، التخصص، العنوان، مواعيد العمل، الصور والتقييمات وطرق التواصل.",
      },
    ],
  }),
  component: ClinicDetail,
});

function ClinicDetail() {
  const { id } = useParams({ from: "/patient/clinic/$id" });
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<Clinic | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [ownerMenu, setOwnerMenu] = useState(false);
  const [createSheet, setCreateSheet] = useState(false);
  const [pendingStory, setPendingStory] = useState<{ file: File; url: string } | null>(null);
  const [storyHours, setStoryHours] = useState<12 | 24>(24);
  const [extras, setExtras] = useState<ClinicProfileExtras | null>(null);
  const [following, setFollowing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const postInputRef = useRef<HTMLInputElement>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [social, setSocial] = useState<PostSocial>({ likes: {}, liked: {}, comments: {} });
  const [shareToast, setShareToast] = useState("");
  const [stories, setStories] = useState<ClinicStories>({ stories: [], highlights: [] });
  const [storyView, setStoryView] = useState<{ items: StoryItem[]; title: string } | null>(null);
  const [newHighlight, setNewHighlight] = useState(false);
  const [hlTitle, setHlTitle] = useState("");
  const [hlEmoji, setHlEmoji] = useState("✨");
  const [hlPicked, setHlPicked] = useState<string[]>([]);
  const [hlMsg, setHlMsg] = useState("");
  const [avatarSheet, setAvatarSheet] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState("");
  const [urgentOpen, setUrgentOpen] = useState(false);
  const [urgentText, setUrgentText] = useState("");
  const storyInputRef = useRef<HTMLInputElement>(null);
  const storyTargetHighlight = useRef<string | null>(null);
  const [reviews, setReviews] = useState<ClinicReview[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewCode, setReviewCode] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");

  useEffect(() => {
    listClinicReviews(id).then(setReviews);
  }, [id]);

  const refreshStories = useCallback(async () => {
    setStories(await getClinicStories(id));
  }, [id]);

  const refreshExtras = useCallback(async () => {
    setExtras(await getClinicProfileExtras(id));
  }, [id]);

  useEffect(() => {
    refreshStories();
  }, [refreshStories]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const membership = await getMyClinicMembership().catch(() => null);
      const owner = membership?.clinic?.id === id;
      const c = owner ? await getClinicById(id) : await getVerifiedClinic(id);
      if (cancelled) return;
      setIsOwner(!!owner);
      setClinic(c);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Profile extras and follow state; clinic subscriptions provide live clinic updates.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [e, f] = await Promise.all([getClinicProfileExtras(id), isFollowingClinic(id)]);
      if (cancelled) return;
      setExtras(e);
      setFollowing(f);
    })();
    const unsub = subscribeClinic(id, setClinic);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [id]);

  // Real like / comment counters for the grid, plus deep-link (?post=) opening.
  useEffect(() => {
    const ids = (extras?.posts ?? []).map((p) => p.id);
    if (!ids.length) return;
    let cancelled = false;
    (async () => {
      const s = await loadPostsSocial(ids);
      if (!cancelled) setSocial(s);
    })();
    const target = new URLSearchParams(window.location.search).get("post");
    if (target) {
      const idx = ids.indexOf(target);
      if (idx >= 0) setViewerIndex(idx);
    }
    return () => {
      cancelled = true;
    };
  }, [extras]);

  const shareProfile = async () => {
    if (!clinic) return;
    const res = await shareLink({
      title: `${clinic.doctor} — سند`,
      text: `احجز مع ${clinic.doctor} على سند`,
      url: clinicShareUrl(clinic.id),
    });
    if (res === "copied") {
      setShareToast("تم نسخ رابط العيادة ✅");
      window.setTimeout(() => setShareToast(""), 1800);
    }
  };

  const [tab, setTab] = useState<"info" | "reviews" | "posts" | "reels">("info");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [patient, setPatient] = useState<PatientSession | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const pendingAction = useRef<((s: PatientSession) => void) | null>(null);
  /** Run an action that needs patient identity; ask guests to sign in first, then resume it. */
  const requirePatient = (action: (s: PatientSession) => void) => {
    const current = patient ?? getPatientSession();
    if (current) return action(current);
    pendingAction.current = action;
    setAuthOpen(true);
  };

  useEffect(() => {
    setPatient(getPatientSession());
    void syncPatientSessionFromAuth().then((s) => {
      if (s) setPatient(s);
    });
  }, []);

  const backTarget = isOwner ? "/doctor" : "/patient/search";
  const handleBack = () => {
    if (window.history.length > 1) window.history.back();
    else void navigate({ to: backTarget });
  };
  if (!loaded)
    return (
      <AppShell title="جاري التحميل…" backTo={backTarget} onBack={handleBack}>
        <div />
      </AppShell>
    );
  if (!clinic) {
    return (
      <AppShell title="عيادة غير متاحة" backTo={backTarget} onBack={handleBack}>
        <div className="mt-4 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          العيادة دي مش موجودة أو لسه ما تمّش توثيقها.
        </div>
      </AppShell>
    );
  }
  const spec = getSpecialty(clinic.specialtyId);
  const realReviewsCount = clinic.isDemo ? 0 : (extras?.reviewsCount ?? 0);
  const realRating = extras?.ratingAvg ?? 0;

  return (
    <AppShell title="تفاصيل العيادة" backTo={backTarget} onBack={handleBack}>
      <div>
        {clinic.isDemo && (
          <p className="mb-3 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs font-bold text-warning">
            هذه عيادة تجريبية لعرض التطبيق فقط، وليست عيادة حقيقية أو موثقة.
          </p>
        )}
        <input
          ref={postInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy("post");
            const res = await uploadClinicMedia({ clinicId: id, kind: "post", file });
            if (res.ok) await refreshExtras();
            setBusy(null);
          }}
        />
        {/* 🌟 1. Luxury Cover Banner & Floating Overlap */}
        <div className="relative -mx-1 -mt-1 overflow-hidden rounded-[2rem] shadow-soft">
          <div className="h-32 w-full gradient-primary">
            <div className="absolute inset-0 bg-[radial-gradient(var(--color-primary)_1px,transparent_1px)] opacity-25 [background-size:16px_16px]" />
          </div>
        </div>

        {/* 🌟 2. Avatar & Identity Header */}
        <div className="relative -mt-14 px-1">
          <div className="flex items-end justify-between gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (isOwner) setAvatarSheet(true);
                  else if (stories.stories.length)
                    setStoryView({ items: stories.stories, title: clinic.doctor });
                }}
                aria-label={stories.stories.length ? "مشاهدة ستوري العيادة" : "صورة العيادة"}
                className={`relative block aspect-square h-24 w-24 shrink-0 overflow-hidden rounded-full p-[3px] shadow-lg transition active:scale-95 ${
                  stories.stories.length
                    ? "gradient-story ring-4 ring-background"
                    : "border-4 border-background bg-card"
                }`}
              >
                {extras?.avatarUrl ? (
                  <span className="relative block h-full w-full overflow-hidden rounded-full bg-card">
                    <img
                      src={extras.avatarUrl}
                      alt={`صورة ${clinic.doctor}`}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      draggable={false}
                    />
                  </span>
                ) : (
                  <span className="grid h-full w-full place-items-center rounded-full bg-primary-soft text-3xl font-black text-primary">
                    {(clinic.doctor || "د")
                      .replace(/^(د\.?|دكتور|دكتورة)\s*/, "")
                      .trim()
                      .charAt(0) || "د"}
                  </span>
                )}
              </button>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    storyTargetHighlight.current = null;
                    storyInputRef.current?.click();
                  }}
                  aria-label="إضافة ستوري جديدة"
                  className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-2 border-background gradient-gold text-gold-foreground shadow-md transition active:scale-90"
                >
                  {busy === "story" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>

            {/* Live Status Pill & Follow Action */}
            <div className="flex items-center gap-2 pb-1">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black shadow-xs ${
                  clinic.availableNow
                    ? "border border-success/30 bg-success/15 text-success"
                    : "border border-border bg-secondary text-muted-foreground"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    clinic.availableNow ? "animate-pulse bg-success" : "bg-muted-foreground/60"
                  }`}
                />
                {clinic.availableNow ? "مفتوح دلوقتي" : "مغلق الآن"}
              </span>
              <button
                type="button"
                onClick={() =>
                  requirePatient(async () => {
                    const next = !following;
                    setFollowing(next);
                    const res = await toggleFollowClinic(id, next);
                    if (res)
                      setExtras((prev) => (prev ? { ...prev, followers: res.followers } : prev));
                    else setFollowing(!next);
                  })
                }
                className="flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-xs font-bold shadow-xs transition active:scale-95"
              >
                {following ? (
                  <UserCheck className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" />
                )}
                {following ? "مُتابع" : "متابعة"}
              </button>
            </div>
          </div>

          {/* Doctor Name & Title */}
          <div className="mt-3">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-black text-foreground">{clinic.doctor}</h2>
              {clinic.isVerified && !clinic.isDemo && (
                <BadgeCheck
                  className="h-5 w-5 shrink-0 fill-primary/10 text-primary"
                  aria-label="طبيب موثّق"
                />
              )}
            </div>
            <p className="mt-0.5 text-xs font-bold text-muted-foreground">
              {spec?.name || "استشاري وأخصائي"}
            </p>
          </div>
        </div>

        {/* 🌟 3. Trust Metrics Ribbon */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setTab("reviews")}
            aria-label="عرض تقييمات العيادة"
            className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card/70 p-2.5 text-center shadow-xs backdrop-blur-sm transition active:scale-95"
          >
            <div className="flex items-center gap-1 text-warning">
              <Star className="h-4 w-4 fill-warning" />
              <span className="text-sm font-black text-foreground">
                {realReviewsCount > 0 ? realRating.toFixed(1) : "جديد"}
              </span>
            </div>
            <span className="mt-0.5 text-xs font-bold text-muted-foreground">
              {realReviewsCount > 0 ? `${realReviewsCount} تقييم` : "تقييم العيادة"}
            </span>
          </button>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card/70 p-2.5 text-center shadow-xs backdrop-blur-sm">
            <span className="text-sm font-black text-primary">
              {clinic.nowServing > 0 ? `#${clinic.nowServing}` : "جاهز"}
            </span>
            <span className="mt-0.5 text-xs font-bold text-muted-foreground">
              {clinic.nowServing > 0 ? "بيكشف عليه" : "طابور الكشف"}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card/70 p-2.5 text-center shadow-xs backdrop-blur-sm">
            <span className="text-sm font-black text-foreground">
              {clinic.price ? `${clinic.price} ج` : "غير محدد"}
            </span>
            <span className="mt-0.5 text-xs font-bold text-muted-foreground">قيمة الكشف</span>
          </div>
        </div>

        {/* Actions */}
        {isOwner ? (
          <div className="relative mt-3 flex items-center justify-between gap-2 rounded-xl bg-secondary/60 p-1.5">
            <span className="px-2 text-xs font-extrabold text-muted-foreground">
              بروفايلك زي ما المريض بيشوفه
            </span>
            <button
              type="button"
              onClick={() => setCreateSheet(true)}
              aria-label="إنشاء قصة أو منشور"
              className="ms-auto grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setOwnerMenu((v) => !v)}
              aria-label="خيارات العيادة"
              aria-expanded={ownerMenu}
              className="grid h-11 w-11 place-items-center rounded-full border border-gold/40 bg-background/70 text-gold backdrop-blur"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {ownerMenu && (
              <>
                <button
                  type="button"
                  aria-label="إغلاق"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setOwnerMenu(false)}
                />
                <div
                  role="menu"
                  className="absolute left-1.5 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-border bg-card py-1 text-sm font-bold shadow-xl"
                >
                  <button
                    role="menuitem"
                    onClick={() => {
                      setOwnerMenu(false);
                      void shareProfile();
                    }}
                    className="flex min-h-11 w-full items-center gap-2 px-4 py-2.5 text-right hover:bg-secondary"
                  >
                    <Share2 className="h-4 w-4 text-primary" /> مشاركة البروفايل
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setOwnerMenu(false);
                      setEditOpen(true);
                    }}
                    className="flex min-h-11 w-full items-center gap-2 px-4 py-2.5 text-right hover:bg-secondary"
                  >
                    <Pencil className="h-4 w-4 text-primary" /> تعديل البروفايل
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setOwnerMenu(false);
                      postInputRef.current?.click();
                    }}
                    className="flex min-h-11 w-full items-center gap-2 px-4 py-2.5 text-right hover:bg-secondary"
                  >
                    {busy === "post" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 text-primary" />
                    )}{" "}
                    إضافة منشور
                  </button>
                  <Link
                    role="menuitem"
                    to="/doctor"
                    className="flex min-h-11 w-full items-center gap-2 px-4 py-2.5 hover:bg-secondary"
                  >
                    <Grid3x3 className="h-4 w-4 text-primary" /> لوحة الطبيب
                  </Link>
                  <Link
                    role="menuitem"
                    to="/doctor-settings"
                    className="flex min-h-11 w-full items-center gap-2 px-4 py-2.5 hover:bg-secondary"
                  >
                    <Settings className="h-4 w-4 text-primary" /> إعدادات العيادة
                  </Link>
                  <button
                    role="menuitem"
                    onClick={async () => {
                      setOwnerMenu(false);
                      await signOutStaff();
                      navigate({ to: "/doctor/login", replace: true });
                    }}
                    className="flex min-h-11 w-full items-center gap-2 border-t border-border px-4 py-2.5 text-right text-destructive hover:bg-secondary"
                  >
                    <LogOut className="h-4 w-4" /> تسجيل الخروج
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}
        {/* 🌟 4. Primary Hero Booking Button */}
        <button
          type="button"
          onClick={() => setBookingOpen(true)}
          disabled={clinic.bookingsClosed || clinic.isDemo}
          className="mt-4 flex min-h-13 w-full items-center justify-center gap-2.5 rounded-2xl bg-primary px-5 py-3.5 text-sm font-black text-primary-foreground shadow-md shadow-primary/20 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarPlus className="h-5 w-5" />
          <span>
            {clinic.isDemo
              ? "بيانات تجريبية — الحجز غير متاح"
              : clinic.bookingsClosed
                ? "الحجز مقفول مؤقتاً"
                : "احجز كشفك الآن"}
          </span>
        </button>

        {/* 🌟 5. Unified 4-Action Capsule Bar */}
        <div
          className={`mt-2.5 grid gap-2 ${
            clinic.isDemo ? "grid-cols-3" : clinic.phone ? "grid-cols-4" : "grid-cols-2"
          }`}
        >
          {/* العيادة التجريبية: بياناتها محاكية — نمنع الاتصال والواتساب عشان ميتواصلش أرقام وهمية */}
          {clinic.isDemo ? null : (
            <>
              {clinic.phone && (
                <a
                  href={whatsappLink(
                    clinic.phone,
                    `أهلاً دكتور، عايز أستفسر بخصوص عيادة ${clinic.doctor}.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl border border-border/70 bg-card p-2 text-center shadow-xs transition active:scale-95 hover:bg-secondary/60"
                >
                  <MessageCircle className="h-4 w-4 text-success" />
                  <span className="text-xs font-bold text-foreground">واتساب</span>
                </a>
              )}
              {clinic.phone && (
                <a
                  href={`tel:${clinic.phone}`}
                  className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl border border-border/70 bg-card p-2 text-center shadow-xs transition active:scale-95 hover:bg-secondary/60"
                >
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">اتصال</span>
                </a>
              )}
            </>
          )}
          <a
            href={directionsPath(clinic.lat, clinic.lng, clinic.doctor)}
            className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl border border-border/70 bg-card p-2 text-center shadow-xs transition active:scale-95 hover:bg-secondary/60"
          >
            <Navigation className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground">اللوكيشن</span>
          </a>
          {!isOwner ? (
            <button
              type="button"
              onClick={() =>
                requirePatient(async (s) => {
                  const convId = await openConversation(id, s.name);
                  if (convId) navigate({ to: "/messages/$id", params: { id: convId } });
                  else {
                    pendingAction.current = null;
                    setAuthOpen(true);
                  }
                })
              }
              className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl border border-border/70 bg-card p-2 text-center shadow-xs transition active:scale-95 hover:bg-secondary/60"
            >
              <MessagesSquare className="h-4 w-4 text-foreground" />
              <span className="text-xs font-bold text-foreground">مراسلة</span>
            </button>
          ) : null}
        </div>
        <div className="mt-2 flex min-h-11 items-center justify-end">
          <NotificationsBell
            audience={isOwner ? "clinic" : "patient"}
            clinicId={clinic.id}
            tone="gold"
          />
        </div>
        <section className="mt-3 grid gap-3 sm:grid-cols-2" aria-label="ملخص العيادة">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Clock3 className="h-4 w-4 text-primary" /> المواعيد والسعر
            </p>
            <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
              {clinic.workingHours || "لم تُضف العيادة مواعيدها بعد — اتصل للاستفسار."}
            </p>
            <p className="mt-3 border-t border-border pt-3 text-sm font-bold">
              سعر الكشف: {clinic.price ? `${clinic.price} جنيه` : "غير محدد"}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="flex items-center gap-2 text-sm font-bold">
              <MapPin className="h-4 w-4 text-primary" /> العنوان
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {clinic.address || "العنوان غير متاح"}
              {clinic.area ? `، ${clinic.area}` : ""}
            </p>
            <iframe
              title="خريطة العيادة"
              className="mt-3 h-28 w-full rounded-xl border border-border"
              loading="lazy"
              src={`https://maps.google.com/maps?q=${clinic.lat},${clinic.lng}&z=15&output=embed`}
            />
          </div>
        </section>

        {isOwner && (
          <button
            onClick={() => setUrgentOpen(true)}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/50 bg-destructive/10 py-2.5 text-xs font-extrabold text-destructive"
          >
            <AlertTriangle className="h-4 w-4" /> نشر تنبيه عاجل للمتابعين (ستوري نصية)
          </button>
        )}

        {/* Tabs */}
        <div className="-mx-4 mt-4 grid grid-cols-4 border-t border-border sm:-mx-5">
          {(
            [
              ["info", Info, "العيادة"],
              ["reviews", Star, "التقييمات"],
              ["posts", Grid3x3, "المنشورات"],
              ["reels", Clapperboard, "الفيديو"],
            ] as const
          ).map(([k, Icon, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              aria-label={l}
              aria-pressed={tab === k}
              className={`-mt-px flex min-h-11 flex-col items-center gap-0.5 border-t-2 py-2.5 text-xs font-bold ${
                tab === k
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {l}
            </button>
          ))}
        </div>
      </div>

      {(tab === "posts" || tab === "reels") && (
        <div className="mt-0.5">
          {tab === "posts" && (stories.highlights.length > 0 || isOwner) && (
            <section className="mb-4 -mx-4 border-b border-border/70 px-4 pb-3 sm:mx-0 sm:px-0">
              <h2 className="mb-2 text-sm font-extrabold">أبرز القصص</h2>
              <div className="flex gap-4 overflow-x-auto pb-1">
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      setHlPicked([]);
                      setHlMsg("");
                      setNewHighlight(true);
                    }}
                    className="flex min-h-11 shrink-0 flex-col items-center text-center"
                    aria-label="هايلايت جديد"
                  >
                    <span className="grid h-[68px] w-[68px] place-items-center rounded-full border-2 border-dashed border-border bg-card text-foreground">
                      <Plus className="h-6 w-6" />
                    </span>
                    <span className="mt-1.5 block max-w-[68px] truncate text-xs font-bold text-gold">
                      هايلايت جديد
                    </span>
                  </button>
                )}
                {stories.highlights.map((highlight) => (
                  <div key={highlight.id} className="relative shrink-0 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (highlight.items.length) {
                          setStoryView({ items: highlight.items, title: highlight.title });
                        } else if (isOwner) {
                          storyTargetHighlight.current = highlight.id;
                          storyInputRef.current?.click();
                        }
                      }}
                      className="flex min-h-11 flex-col items-center"
                    >
                      <span className="block h-[68px] w-[68px] rounded-full border border-border p-[3px]">
                        <span className="relative grid h-full w-full place-items-center overflow-hidden rounded-full bg-secondary text-2xl">
                          {highlight.items[0]?.url && highlight.items[0].mediaType === "image" ? (
                            <img
                              src={highlight.items[0].url}
                              alt={highlight.title}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          ) : (
                            highlight.emoji
                          )}
                        </span>
                      </span>
                      <span className="mt-1.5 block max-w-[68px] truncate text-xs font-semibold text-foreground">
                        {highlight.title}
                      </span>
                    </button>
                    {isOwner && (
                      <span className="mt-1 flex justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            storyTargetHighlight.current = highlight.id;
                            storyInputRef.current?.click();
                          }}
                          aria-label={`إضافة قصة إلى ${highlight.title}`}
                          className="grid h-11 w-11 place-items-center rounded-full gradient-gold text-gold-foreground"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm(`هل تريد حذف هايلايت «${highlight.title}»؟`))
                              return;
                            try {
                              if (await deleteHighlight(highlight.id)) await refreshStories();
                              else toast.error("تعذر حذف الهايلايت.");
                            } catch (error) {
                              console.error("[ClinicDetail] Failed to delete highlight:", error);
                              toast.error("تعذر حذف الهايلايت.");
                            }
                          }}
                          aria-label={`حذف ${highlight.title}`}
                          className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
          {(extras?.posts ?? []).filter((p) =>
            tab === "reels" ? p.mediaType === "video" : p.mediaType !== "video",
          ).length === 0 ? (
            <div className="py-12 text-center">
              <Camera className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm font-bold">
                {tab === "reels" ? "لسه مفيش فيديوهات" : "لسه مفيش منشورات"}
              </p>
              {isOwner && (
                <button
                  onClick={() => postInputRef.current?.click()}
                  className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground"
                >
                  <ImagePlus className="me-1 inline h-4 w-4" /> إضافة منشور
                </button>
              )}
            </div>
          ) : (
            <div className="-mx-4 grid grid-cols-3 gap-[3px] sm:mx-0">
              {(extras?.posts ?? [])
                .map((p, i) => ({ p, i }))
                .filter(({ p }) =>
                  tab === "reels" ? p.mediaType === "video" : p.mediaType !== "video",
                )
                .map(({ p, i }) => (
                  <div
                    key={p.id}
                    className={`relative overflow-hidden bg-surface-deep ${tab === "reels" ? "aspect-[9/16]" : "aspect-square"}`}
                  >
                    <button
                      type="button"
                      onClick={() => setViewerIndex(i)}
                      aria-label={p.mediaType === "video" ? "تشغيل الفيديو" : "فتح المنشور"}
                      className="absolute inset-0 z-0 h-full w-full"
                    >
                      {p.mediaType === "video" ? (
                        <>
                          <video
                            src={p.url}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                          />
                          <span className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-background/70 text-gold">
                            <Play className="h-3 w-3" />
                          </span>
                        </>
                      ) : (
                        <img
                          src={p.url}
                          alt={p.caption || `منشور من عيادة ${clinic.doctor}`}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </button>
                    {isOwner && (
                      <button
                        type="button"
                        aria-label="حذف المنشور"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm("هل تريد حذف هذا المنشور؟")) return;
                          setBusy(p.id);
                          try {
                            if (await deleteClinicPost(p.id)) await refreshExtras();
                            else toast.error("تعذر حذف المنشور.");
                          } catch (error) {
                            console.error("[ClinicDetail] Failed to delete clinic post:", error);
                            toast.error("تعذر حذف المنشور.");
                          } finally {
                            setBusy(null);
                          }
                        }}
                        className="absolute bottom-1.5 left-1.5 z-10 grid h-11 w-11 place-items-center rounded-full bg-background/90 text-destructive"
                      >
                        {busy === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex items-center gap-2 rounded-full bg-background/70 px-2 py-0.5 text-xs font-extrabold backdrop-blur">
                      <span
                        className={`flex items-center gap-0.5 ${social.liked[p.id] ? "text-destructive" : ""}`}
                      >
                        <Heart className={`h-3 w-3 ${social.liked[p.id] ? "fill-current" : ""}`} />{" "}
                        {social.likes[p.id] ?? 0}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MessageCircle className="h-3 w-3" /> {social.comments[p.id] ?? 0}
                      </span>
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {tab === "info" && (
        <div className="mt-4 space-y-4">
          {clinic.youtubeUrl && youtubeId(clinic.youtubeUrl) && (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <p className="flex items-center gap-2 p-4 pb-3 text-sm font-bold">
                <PlayCircle className="h-4 w-4 text-primary" /> جولة داخل العيادة
              </p>
              <div className="relative aspect-video w-full bg-secondary">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${youtubeId(clinic.youtubeUrl)}?rel=0`}
                  title="فيديو العيادة"
                  loading="lazy"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-bold">نبذة</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {extras?.bio ? extras.bio : "لم تضف العيادة نبذة تعريفية بعد."}
            </p>
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
              <Phone className="h-4 w-4 text-primary" /> {clinic.phone || "—"}
            </div>
            <div className="mt-2 rounded-xl border border-dashed border-border p-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                آخر تحديث للبيانات:{" "}
                <span className="font-bold text-foreground">
                  {new Date(clinic.updatedAt || clinic.submittedAt).toLocaleDateString("ar-EG", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </p>
              <p className="mt-1">
                مصدر البيانات: مُدخلة ومُحدّثة من إدارة العيادة نفسها — يُفضّل تأكيد السعر والموعد
                بالاتصال قبل الزيارة.
              </p>
            </div>
          </div>
          {/* FAQ */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-bold">أسئلة شائعة</p>
            <div className="mt-2 divide-y divide-border">
              {[
                ["إزاي أحجز؟", "استخدم زر «احجز دورك» أعلى صفحة العيادة."],
                ["أتابع دوري؟", "بعد تأكيد الحجز، افتح «تابع دورك» من شاشة نجاح الحجز."],
                ["الدفع إزاي؟", "الدفع نقداً في العيادة، مفيش أي دفع أونلاين."],
                [
                  "لو اتأخرت أو عايز ألغي؟",
                  "كلّم العيادة على الواتساب أو الرقم المباشر وهيتم تعديل حجزك.",
                ],
              ].map(([q, a]) => (
                <details key={q} className="py-2">
                  <summary className="cursor-pointer text-sm font-bold">{q}</summary>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </div>
          {/* Print card + QR */}
          <ClinicQrCard clinic={clinic} specName={spec?.name ?? ""} />
        </div>
      )}

      {tab === "reviews" && (
        <div className="mt-4 space-y-4">
          {/* Reviews */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-bold">التقييم</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="text-3xl font-black text-primary">
                {clinic.isDemo ? "—" : realReviewsCount > 0 ? realRating.toFixed(1) : "جديد"}
              </div>
              <div>
                {!clinic.isDemo && realReviewsCount > 0 && (
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-4 w-4 ${n <= Math.round(realRating) ? "fill-warning text-warning" : "text-muted-foreground"}`}
                      />
                    ))}
                  </div>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {clinic.isDemo
                    ? "العيادة تجريبية ولا تملك تقييماً حقيقياً"
                    : realReviewsCount > 0
                      ? `${realReviewsCount} تقييم من المرضى`
                      : "لسه مفيش تقييمات"}
                </p>
              </div>
            </div>
            <p className="mt-3 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
              {clinic.isDemo
                ? "بيانات التقييمات التجريبية غير معروضة كتقييمات حقيقية."
                : "التقييم بيتحدّث تلقائياً من تقييمات المرضى اللي خلصوا كشف فعلاً."}
            </p>

            {/* Real reviews */}
            <div className="mt-3 space-y-2">
              {clinic.isDemo || reviews.length === 0 ? (
                <p className="text-xs text-muted-foreground">لسه مفيش تعليقات من المرضى.</p>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border bg-secondary/50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold">{r.patientName}</span>
                        {r.visited && (
                          <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-xs font-bold text-success">
                            <BadgeCheck className="h-3 w-3" /> مريض قام بالزيارة
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`h-3 w-3 ${n <= r.rating ? "fill-warning text-warning" : "text-muted-foreground"}`}
                          />
                        ))}
                      </div>
                    </div>
                    {r.comment && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {r.comment}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {!isOwner && (
              <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-center text-xs font-bold text-muted-foreground">
                التقييم بكود الحجز قريباً ⏳
              </p>
            )}
            {/* Verified review form — shipped behind a flag until codes reach patients. */}
            {REVIEW_FORM_ENABLED && !isOwner && (
              <div className="mt-3 rounded-xl border border-dashed border-border p-3">
                <p className="text-xs font-extrabold">قيّم الطبيب بعد الكشف</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  اكتب كود الحجز بتاعك (SND-XXXXX) — التقييم متاح بعد ما العيادة تسجّل إنك خلصت كشف.
                </p>
                <div className="mt-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setReviewRating(n)}
                      aria-label={`${n} نجوم`}
                      className="grid h-11 w-11 place-items-center"
                    >
                      <Star
                        className={`h-5 w-5 ${n <= reviewRating ? "fill-warning text-warning" : "text-muted-foreground"}`}
                      />
                    </button>
                  ))}
                </div>
                <input
                  value={reviewCode}
                  onChange={(e) => setReviewCode(e.target.value)}
                  placeholder="كود الحجز"
                  className="mt-2 w-full rounded-xl border border-border bg-background p-2 text-sm"
                />
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="رأيك في الدكتور والعيادة (اختياري)"
                  rows={2}
                  className="mt-2 w-full rounded-xl border border-border bg-background p-2 text-sm"
                />
                {reviewMsg && <p className="mt-2 text-xs font-bold text-primary">{reviewMsg}</p>}
                <button
                  disabled={busy === "review"}
                  onClick={() =>
                    requirePatient(async () => {
                      setReviewMsg("");
                      setBusy("review");
                      const res = await submitVerifiedReview({
                        clinicId: id,
                        bookingCode: reviewCode,
                        rating: reviewRating,
                        comment: reviewComment,
                      });
                      setBusy(null);
                      if (res.ok) {
                        setReviewMsg("تم إضافة تقييمك، شكراً ليك 🙏");
                        setReviewCode("");
                        setReviewComment("");
                        setReviews(await listClinicReviews(id));
                        refreshExtras();
                      } else {
                        setReviewMsg(res.error ?? "");
                      }
                    })
                  }
                  className="mt-2 w-full rounded-xl bg-primary p-2.5 text-sm font-extrabold text-primary-foreground disabled:opacity-60"
                >
                  {busy === "review" ? "جاري الإرسال…" : "إرسال التقييم"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {authOpen && (
        <PatientAuthModal
          title={pendingAction.current ? undefined : "بياناتك للمتابعة"}
          onClose={() => {
            pendingAction.current = null;
            setAuthOpen(false);
          }}
          onDone={(s) => {
            setPatient(s);
            setAuthOpen(false);
            const act = pendingAction.current;
            pendingAction.current = null;
            if (act) act(s);
          }}
        />
      )}

      {editOpen && isOwner && (
        <EditProfileModal
          clinic={clinic}
          initialBio={extras?.bio ?? ""}
          onClose={() => setEditOpen(false)}
          onSaved={async () => {
            const c = await getClinicById(id);
            if (c) setClinic(c);
            await refreshExtras();
          }}
        />
      )}

      {viewerIndex !== null && (extras?.posts.length ?? 0) > 0 && (
        <PostViewer
          posts={extras!.posts}
          startIndex={viewerIndex}
          doctor={clinic.doctor}
          isVerified={clinic.isVerified}
          isOwner={isOwner}
          onClose={async () => {
            setViewerIndex(null);
            const ids = (extras?.posts ?? []).map((p) => p.id);
            if (ids.length) setSocial(await loadPostsSocial(ids));
          }}
        />
      )}

      {shareToast && (
        <div className="fixed inset-x-0 bottom-6 z-[80] flex justify-center">
          <span className="rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background">
            {shareToast}
          </span>
        </div>
      )}

      {isOwner && (
        <input
          ref={storyInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (!storyTargetHighlight.current) {
              setPendingStory({ file, url: URL.createObjectURL(file) });
              setStoryHours(24);
              return;
            }
            setBusy("story");
            const res = await addStory({
              clinicId: id,
              file,
              highlightId: storyTargetHighlight.current,
              permanent: true,
            });
            storyTargetHighlight.current = null;
            setBusy(null);
            setShareToast(res.ok ? "اتضافت للهايلايت ✅" : "الرفع فشل، جرب صورة أصغر");
            window.setTimeout(() => setShareToast(""), 2500);
            if (res.ok) await refreshStories();
          }}
        />
      )}

      {isOwner && createSheet && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-background/70 backdrop-blur-sm"
          onClick={() => setCreateSheet(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl border border-border bg-card p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <p className="mb-2 text-center text-sm font-black">إنشاء</p>
            {(
              [
                [
                  Camera,
                  "قصة (ستوري)",
                  "تختفي بعد ١٢ أو ٢٤ ساعة",
                  () => {
                    storyTargetHighlight.current = null;
                    storyInputRef.current?.click();
                  },
                ],
                [AlertTriangle, "تنبيه عاجل", "ستوري نصية للمتابعين", () => setUrgentOpen(true)],
                [
                  Sparkles,
                  "هايلايت جديد",
                  "قصص دائمة على البروفايل",
                  () => {
                    setHlPicked([]);
                    setHlMsg("");
                    setNewHighlight(true);
                  },
                ],
                [
                  ImagePlus,
                  "منشور",
                  "صورة أو فيديو في الشبكة",
                  () => postInputRef.current?.click(),
                ],
              ] as const
            ).map(([Icon, l, d, fn]) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  setCreateSheet(false);
                  fn();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right hover:bg-secondary"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-extrabold">{l}</span>
                  <span className="block text-xs text-muted-foreground">{d}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isOwner && pendingStory && (
        <div className="fixed inset-0 z-[75] flex items-end justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-4 pb-8">
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label="إلغاء"
                onClick={() => {
                  URL.revokeObjectURL(pendingStory.url);
                  setPendingStory(null);
                }}
                className="grid h-11 w-11 place-items-center rounded-full bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-sm font-black">قصة جديدة</p>
              <span className="w-8" />
            </div>
            <div className="mx-auto mt-3 aspect-[9/16] max-h-[45vh] overflow-hidden rounded-2xl bg-surface-deep">
              {pendingStory.file.type.startsWith("video") ? (
                <video
                  src={pendingStory.url}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  autoPlay
                  loop
                />
              ) : (
                <img
                  src={pendingStory.url}
                  alt="معاينة القصة"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <p className="mt-4 text-xs font-bold text-muted-foreground">مدة ظهور القصة</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {([12, 24] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setStoryHours(h)}
                  className={`flex items-center justify-center gap-1 rounded-xl border py-2.5 text-sm font-extrabold ${storyHours === h ? "border-primary bg-primary/15 text-primary" : "border-border text-foreground"}`}
                >
                  <Clock3 className="h-4 w-4" /> {h === 12 ? "١٢ ساعة" : "٢٤ ساعة"}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={busy === "story"}
              onClick={async () => {
                setBusy("story");
                const res = await addStory({
                  clinicId: id,
                  file: pendingStory.file,
                  highlightId: null,
                  durationHours: storyHours,
                });
                setBusy(null);
                URL.revokeObjectURL(pendingStory.url);
                setPendingStory(null);
                setShareToast(
                  res.ok
                    ? `تم نشر القصة لمدة ${storyHours === 12 ? "١٢" : "٢٤"} ساعة ✅`
                    : "الرفع فشل، جرب صورة أصغر",
                );
                window.setTimeout(() => setShareToast(""), 2500);
                if (res.ok) await refreshStories();
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-extrabold text-primary-foreground disabled:opacity-60"
            >
              {busy === "story" && <Loader2 className="h-4 w-4 animate-spin" />} نشر لمدة{" "}
              {storyHours === 12 ? "١٢" : "٢٤"} ساعة
            </button>
          </div>
        </div>
      )}

      {storyView && (
        <Suspense fallback={null}>
          <StoryViewer
            items={storyView.items}
            title={storyView.title}
            isOwner={isOwner}
            onClose={() => setStoryView(null)}
            onDelete={async (storyId) => {
              try {
                if (!(await deleteStory(storyId))) {
                  toast.error("تعذر حذف القصة.");
                  return;
                }
              } catch (error) {
                console.error("[ClinicDetail] Failed to delete story:", error);
                toast.error("تعذر حذف القصة.");
                return;
              }
              setStoryView(null);
              await refreshStories();
            }}
          />
        </Suspense>
      )}

      {newHighlight && isOwner && (
        <div
          className="fixed inset-0 z-[100] flex items-end bg-black/70 sm:items-center sm:justify-center"
          onClick={() => setNewHighlight(false)}
        >
          <div
            className="w-full rounded-t-3xl border border-border bg-card p-5 sm:max-w-sm sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-extrabold">هايلايت جديد</p>
              <button
                onClick={() => setNewHighlight(false)}
                aria-label="إغلاق"
                className="grid h-11 w-11 place-items-center rounded-full bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="text-xs font-bold text-muted-foreground">اسم الهايلايت</label>
            <input
              value={hlTitle}
              onChange={(ev) => setHlTitle(ev.target.value)}
              placeholder="مثال: قبل وبعد"
              className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-gold"
            />
            {stories.stories.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-border p-4 text-center">
                <p className="text-sm font-bold">لازم تنشر ستوري واحدة على الأقل الأول</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  الهايلايت بيتعمل من الستوريز اللي نشرتها، زي إنستجرام.
                </p>
                <button
                  onClick={() => {
                    setNewHighlight(false);
                    storyTargetHighlight.current = null;
                    storyInputRef.current?.click();
                  }}
                  className="mt-3 rounded-xl gradient-gold px-4 py-2 text-xs font-extrabold text-gold-foreground"
                >
                  نشر ستوري الآن
                </button>
              </div>
            ) : (
              <>
                <label className="mt-4 block text-xs font-bold text-muted-foreground">
                  اختار الستوريز ({hlPicked.length})
                </label>
                <div className="mt-2 grid max-h-64 grid-cols-3 gap-1.5 overflow-y-auto">
                  {stories.stories.map((st) => {
                    const idx = hlPicked.indexOf(st.id);
                    return (
                      <button
                        key={st.id}
                        onClick={() =>
                          setHlPicked((p) =>
                            idx >= 0 ? p.filter((x) => x !== st.id) : [...p, st.id],
                          )
                        }
                        className={`relative aspect-[9/16] overflow-hidden rounded-lg bg-secondary ${idx >= 0 ? "ring-2 ring-gold" : ""}`}
                      >
                        {st.url && st.mediaType === "image" ? (
                          <img
                            src={st.url}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : st.url ? (
                          <video
                            src={st.url}
                            muted
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <span className="absolute inset-0 grid place-items-center p-1 text-xs font-bold">
                            {st.caption}
                          </span>
                        )}
                        <span
                          className={`absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-white text-xs font-black ${idx >= 0 ? "bg-gold text-gold-foreground" : "bg-black/30"}`}
                        >
                          {idx >= 0 ? idx + 1 : ""}
                        </span>
                        {idx === 0 && (
                          <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-xs font-bold text-white">
                            الغلاف
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  أول ستوري تختارها هتبقى غلاف الهايلايت.
                </p>
              </>
            )}
            {hlMsg && <p className="mt-2 text-xs font-bold text-destructive">{hlMsg}</p>}
            <button
              disabled={!hlTitle.trim() || hlPicked.length === 0 || busy === "hl"}
              onClick={async () => {
                setBusy("hl");
                setHlMsg("");
                const first = stories.stories.find((x) => x.id === hlPicked[0]);
                const newId = await createHighlight(
                  id,
                  hlTitle.trim(),
                  first?.mediaType === "image" ? "📸" : hlEmoji,
                );
                const ok = newId ? await pinStoriesToHighlight(newId, hlPicked) : false;
                setBusy(null);
                if (ok) {
                  setHlTitle("");
                  setHlPicked([]);
                  setNewHighlight(false);
                  await refreshStories();
                } else setHlMsg("تعذر إنشاء الهايلايت، حاول تاني.");
              }}
              className="mt-4 w-full rounded-2xl gradient-gold py-3.5 text-sm font-extrabold text-gold-foreground disabled:opacity-50"
            >
              {busy === "hl" ? "جاري الحفظ…" : "إنشاء الهايلايت"}
            </button>
          </div>
        </div>
      )}

      {isOwner && (
        <AvatarActionSheet
          open={avatarSheet}
          onClose={() => setAvatarSheet(false)}
          hasPhoto={Boolean(extras?.avatarUrl)}
          busy={busy === "avatar"}
          onViewStory={
            stories.stories.length
              ? () => setStoryView({ items: stories.stories, title: clinic.doctor })
              : undefined
          }
          onFile={async (file) => {
            setBusy("avatar");
            const res = await uploadClinicMedia({ clinicId: id, kind: "avatar", file });
            setBusy(null);
            setAvatarSheet(false);
            setAvatarMsg(
              res.ok
                ? "تم تحديث الصورة ✅"
                : res.error === "FILE_TOO_LARGE"
                  ? "الصورة كبيرة جداً (الحد ٥ ميجا)."
                  : "تعذر رفع الصورة.",
            );
            if (res.ok) await refreshExtras();
            setTimeout(() => setAvatarMsg(""), 2500);
          }}
          onRemove={async () => {
            setBusy("avatar");
            const ok = await removeClinicAvatar(id);
            setBusy(null);
            setAvatarSheet(false);
            setAvatarMsg(ok ? "تم حذف الصورة" : "تعذر حذف الصورة.");
            if (ok) await refreshExtras();
            setTimeout(() => setAvatarMsg(""), 2500);
          }}
        />
      )}
      {avatarMsg && (
        <div className="fixed inset-x-0 bottom-24 z-[130] mx-auto w-fit rounded-full bg-card px-4 py-2 text-xs font-bold shadow-lg">
          {avatarMsg}
        </div>
      )}

      {urgentOpen && isOwner && (
        <div
          className="fixed inset-0 z-[100] flex items-end bg-black/70 sm:items-center sm:justify-center"
          onClick={() => setUrgentOpen(false)}
        >
          <div
            className="w-full rounded-t-3xl border border-border bg-card p-5 sm:max-w-sm sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-extrabold text-destructive">تنبيه عاجل</p>
              <button
                onClick={() => setUrgentOpen(false)}
                aria-label="إغلاق"
                className="grid h-11 w-11 place-items-center rounded-full bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              هيوصل إشعار لكل متابعي العيادة، ويختفي بعد ٢٤ ساعة.
            </p>
            <textarea
              value={urgentText}
              onChange={(ev) => setUrgentText(ev.target.value)}
              rows={3}
              placeholder="مثال: العيادة مقفولة النهارده لطارئ."
              className="mt-3 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-destructive"
            />
            <button
              disabled={!urgentText.trim() || busy === "urgent"}
              onClick={async () => {
                setBusy("urgent");
                const res = await addStory({
                  clinicId: id,
                  caption: urgentText.trim(),
                  kind: "urgent",
                });
                setBusy(null);
                if (res.ok) {
                  setUrgentText("");
                  setUrgentOpen(false);
                  await refreshStories();
                }
              }}
              className="mt-4 w-full rounded-2xl bg-destructive py-3.5 text-sm font-extrabold text-white disabled:opacity-50"
            >
              {busy === "urgent" ? "جاري النشر…" : "نشر التنبيه"}
            </button>
          </div>
        </div>
      )}
      <QuickBookingDrawer clinic={clinic} isOpen={bookingOpen} onOpenChange={setBookingOpen} />
    </AppShell>
  );
}

function EditProfileModal({
  clinic,
  initialBio,
  onClose,
  onSaved,
}: {
  clinic: Clinic;
  initialBio: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [doctor, setDoctor] = useState(clinic.doctor);
  const [specialtyId, setSpecialtyId] = useState(clinic.specialtyId);
  const [price, setPrice] = useState(String(clinic.price || ""));
  const [phone, setPhone] = useState(clinic.phone);
  const [bio, setBio] = useState(initialBio);
  const [hours, setHours] = useState(clinic.workingHours ?? "");
  const [yt, setYt] = useState(clinic.youtubeUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const [msg, setMsg] = useState("");
  const [sheet, setSheet] = useState(false);

  const pick = (kind: "avatar" | "cover") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(kind);
    const res = await uploadClinicMedia({ clinicId: clinic.id, kind, file });
    setUploading(null);
    if (res.ok) {
      setMsg(kind === "avatar" ? "تم تحديث الصورة الشخصية ✅" : "تم تحديث صورة الغلاف ✅");
      await onSaved();
    } else {
      setMsg(
        res.error === "FILE_TOO_LARGE"
          ? "الصورة كبيرة جداً، جرب صورة أصغر."
          : "تعذر رفع الصورة، حاول تاني.",
      );
    }
  };

  const save = async () => {
    if (yt.trim() && !youtubeId(yt)) {
      setMsg("رابط يوتيوب غير صحيح — انسخ رابط الفيديو من يوتيوب.");
      return;
    }
    setSaving(true);
    const ok = await saveClinicProfile({
      clinicId: clinic.id,
      doctor,
      specialtyId,
      price: Number(price) || 0,
      phone,
      bio,
      workingHours: hours,
      youtubeUrl: yt,
    });
    setSaving(false);
    if (!ok) {
      setMsg("تعذر الحفظ، حاول تاني.");
      return;
    }
    await onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-background/80 p-0 backdrop-blur sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-gold/25 bg-card p-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black">تعديل البروفايل</h3>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="grid h-11 w-11 place-items-center rounded-full bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSheet(true)}
            className="flex min-h-11 flex-col items-center gap-1 rounded-2xl border border-dashed border-gold/40 p-3 text-xs font-bold text-gold"
          >
            {uploading === "avatar" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            تعديل الصورة الشخصية
          </button>
          <label className="flex min-h-11 cursor-pointer flex-col items-center gap-1 rounded-2xl border border-dashed border-gold/40 p-3 text-xs font-bold text-gold">
            {uploading === "cover" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            صورة الغلاف
            <input type="file" accept="image/*" className="hidden" onChange={pick("cover")} />
          </label>
        </div>

        <AvatarActionSheet
          open={sheet}
          onClose={() => setSheet(false)}
          hasPhoto
          busy={uploading === "avatar"}
          onFile={async (file) => {
            const fake = {
              target: { files: [file], value: "" },
            } as unknown as React.ChangeEvent<HTMLInputElement>;
            await pick("avatar")(fake);
            setSheet(false);
          }}
          onRemove={async () => {
            const ok = await removeClinicAvatar(clinic.id);
            setSheet(false);
            setMsg(ok ? "تم حذف الصورة الشخصية" : "تعذر حذف الصورة.");
            if (ok) await onSaved();
          }}
        />

        <div className="mt-4 space-y-3">
          <Field label="اسم الطبيب">
            <input
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary p-3 text-sm"
            />
          </Field>
          <Field label="التخصص">
            <select
              value={specialtyId}
              onChange={(e) => setSpecialtyId(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary p-3 text-sm"
            >
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.emoji} {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="سعر الكشف (جنيه)">
            <input
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-full rounded-xl border border-border bg-secondary p-3 text-sm"
            />
          </Field>
          <Field label="رقم الهاتف / واتساب">
            <input
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary p-3 text-sm"
            />
          </Field>
          <Field label="مواعيد وأيام العمل">
            <textarea
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              rows={2}
              placeholder="مثال: السبت للخميس 5م – 10م • الجمعة إجازة"
              className="w-full rounded-xl border border-border bg-secondary p-3 text-sm"
            />
          </Field>
          <Field label="فيديو العيادة (رابط يوتيوب)">
            <input
              dir="ltr"
              value={yt}
              onChange={(e) => setYt(e.target.value)}
              placeholder="https://youtu.be/..."
              className="w-full rounded-xl border border-border bg-secondary p-3 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              للفيديوهات الطويلة وجولات العيادة — ارفعه على يوتيوب والصق الرابط هنا.
            </p>
          </Field>
          <Field label="نبذة عن العيادة">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="اكتب نبذة قصيرة تظهر للمرضى"
              className="w-full rounded-xl border border-border bg-secondary p-3 text-sm"
            />
          </Field>
        </div>

        {msg && <p className="mt-3 rounded-xl bg-secondary p-3 text-xs font-bold">{msg}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="gradient-gold mt-4 w-full rounded-2xl py-4 text-base font-black text-gold-foreground shadow-gold disabled:opacity-60"
        >
          {saving ? "جاري الحفظ…" : "حفظ التعديلات"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-left font-bold">{value}</span>
    </div>
  );
}
