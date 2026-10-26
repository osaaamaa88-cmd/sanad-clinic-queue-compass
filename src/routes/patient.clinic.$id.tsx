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
  Check,
  Banknote,
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
  CheckCircle2,
} from "lucide-react";
import { MessagesSquare, MoreVertical } from "lucide-react";
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
import {
  getPatientSession,
  saveBookingLocally,
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
  timeSlots,
  days,
  whatsappLink,
  createBooking,
  signOutStaff,
  type Clinic,
} from "@/lib/mock-data";
import {
  getClinicProfileExtras,
  getQueueStats,
  isFollowingClinic,
  toggleFollowClinic,
  saveClinicProfile,
  uploadClinicMedia,
  deleteClinicPost,
  type ClinicProfileExtras,
  type QueueStats,
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
  const [queue, setQueue] = useState<QueueStats | null>(null);
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

  // Profile extras (media, posts, followers, real rating) + live queue numbers.
  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      const q = await getQueueStats(id);
      if (!cancelled && q) setQueue(q);
    };
    (async () => {
      const [e, f] = await Promise.all([getClinicProfileExtras(id), isFollowingClinic(id)]);
      if (cancelled) return;
      setExtras(e);
      setFollowing(f);
    })();
    pull();
    const timer = window.setInterval(pull, 15000);
    const unsub = subscribeClinic(id, (c) => {
      setClinic(c);
      pull();
    });
    return () => {
      cancelled = true;
      window.clearInterval(timer);
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

  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);
  const [bookingCode, setBookingCode] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"posts" | "reels" | "info" | "reviews" | "book">("posts");
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

  const doBooking = async (who: PatientSession) => {
    if (!clinic || !slot || submitting) return;
    setSubmitting(true);
    const dayLabel = `${days[dayIdx].label} — ${days[dayIdx].date}`;
    const b = await createBooking({
      clinicId: clinic.id,
      patientName: who.name,
      patientPhone: who.phone,
      dayLabel,
      slot,
    });
    setSubmitting(false);
    if (b) {
      saveBookingLocally({
        code: b.code,
        clinicId: clinic.id,
        clinicName: clinic.doctor,
        dayLabel,
        slot,
      });
      setBookingCode(b.code);
      setBooked(true);
    }
  };

  const confirmBooking = async () => {
    if (!clinic || !slot || submitting) return;
    const who = patient ?? getPatientSession();
    if (!who) {
      setAuthOpen(true);
      return;
    }
    await doBooking(who);
  };

  const backTarget = isOwner ? "/doctor" : "/patient/search";
  if (!loaded)
    return (
      <AppShell title="جاري التحميل…" backTo={backTarget}>
        <div />
      </AppShell>
    );
  if (!clinic) {
    return (
      <AppShell title="عيادة غير متاحة" backTo={backTarget}>
        <div className="mt-4 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          العيادة دي مش موجودة أو لسه ما تمّش توثيقها.
        </div>
      </AppShell>
    );
  }
  const spec = getSpecialty(clinic.specialtyId);

  if (booked) {
    const msg = `أهلاً، حجزت عند ${clinic.doctor} يوم ${days[dayIdx].date} الساعة ${slot}.\nكود الحجز: ${bookingCode}\nالدفع نقداً في العيادة.\nالعنوان: ${clinic.address} — ${clinic.area}.`;
    return (
      <AppShell title="تم الحجز" backTo="/patient" tone="primary">
        <div className="-mt-6 rounded-3xl bg-card p-6 text-center shadow-soft">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success text-success-foreground">
            <Check className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl font-extrabold">تم تأكيد حجزك 🎉</h2>
          <p className="mt-1 text-sm text-muted-foreground">احتفظ بكود الحجز واعرضه في العيادة</p>
          <div className="mt-4 rounded-2xl border-2 border-dashed border-primary bg-primary-soft p-4 text-center">
            <p className="text-xs font-bold text-primary">كود الحجز</p>
            <p className="mt-1 text-2xl font-extrabold tracking-widest text-primary">
              {bookingCode}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-success/10 p-3 text-right">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/20 text-success">
              <Banknote className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">الدفع نقداً في العيادة</p>
              <p className="text-xs text-muted-foreground">مفيش أي رسوم على الحجز عبر سند</p>
            </div>
          </div>
          <div className="mt-5 space-y-2 rounded-2xl bg-secondary p-4 text-right">
            <Row label="كود الحجز" value={bookingCode} />
            <Row label="الطبيب" value={clinic.doctor} />
            <Row label="التخصص" value={spec?.name ?? ""} />
            <Row label="اليوم" value={`${days[dayIdx].label} — ${days[dayIdx].date}`} />
            <Row label="الساعة" value={slot ?? ""} />
            <Row label="العنوان" value={`${clinic.address} — ${clinic.area}`} />
            <Row label="سعر الكشف" value={`${clinic.price} جنيه — يُدفع نقداً`} />
          </div>
          <a
            href={whatsappLink(clinic.phone, msg)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-success py-4 text-base font-extrabold text-success-foreground"
          >
            <MessageCircle className="h-5 w-5" /> تواصل مع العيادة على واتساب
          </a>
          <Link
            to="/patient/queue/$id"
            params={{ id: clinic.id }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-4 text-base font-extrabold text-white shadow-soft"
          >
            <Users className="h-5 w-5" /> شوف دورك في العيادة
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={clinic.doctor} subtitle={spec?.name} backTo={backTarget}>
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
        {/* Instagram header: avatar + stats */}
        <div className="flex items-center gap-5 pt-1">
          <div className="shrink-0">
            <div className="relative">
              <button
                onClick={() => {
                  if (isOwner) setAvatarSheet(true);
                  else if (stories.stories.length)
                    setStoryView({ items: stories.stories, title: clinic.doctor });
                }}
                aria-label={stories.stories.length ? "مشاهدة ستوري العيادة" : "إضافة ستوري"}
                className={`relative block aspect-square h-24 w-24 shrink-0 overflow-hidden rounded-full p-[3px] shadow-gold sm:h-28 sm:w-28 ${
                  stories.stories.length ? "gradient-story" : "bg-border"
                }`}
              >
                {extras?.avatarUrl ? (
                  <span className="relative block h-full w-full overflow-hidden rounded-full border-2 border-background bg-card">
                    <img
                      src={extras.avatarUrl}
                      alt={`صورة ${clinic.doctor}`}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      draggable={false}
                    />
                  </span>
                ) : (
                  <div className="grid h-full w-full place-items-center rounded-full border-2 border-background bg-primary/10 text-3xl font-black text-primary">
                    {(clinic.doctor || "د")
                      .replace(/^(د\.?|دكتور|دكتورة)\s*/, "")
                      .trim()
                      .charAt(0) || "د"}
                  </div>
                )}
              </button>
              {isOwner && (
                <button
                  onClick={() => {
                    storyTargetHighlight.current = null;
                    storyInputRef.current?.click();
                  }}
                  aria-label="إضافة ستوري جديدة"
                  className="absolute -right-1 bottom-1 grid h-7 w-7 place-items-center rounded-full border-2 border-background gradient-gold text-gold-foreground"
                >
                  {busy === "story" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
              {clinic.isVerified && (
                <span
                  className="absolute -left-1 bottom-1 grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-[#1D9BF0]"
                  aria-label="حساب موثّق"
                >
                  <BadgeCheck className="h-4 w-4 text-white" />
                </span>
              )}
            </div>
          </div>
          <div className="grid flex-1 grid-cols-3 text-center">
            <Stat value={String(extras?.postsCount ?? 0)} label="منشور" />
            <Stat value={String(extras?.followers ?? 0)} label="متابع" />
            <Stat
              value={String(extras?.reviewsCount ? extras.ratingAvg : clinic.rating || 0)}
              label={`${extras?.reviewsCount ?? clinic.reviews ?? 0} تقييم`}
            />
          </div>
        </div>

        {/* Name + bio */}
        <div className="mt-3">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-black text-foreground">{clinic.doctor}</h2>
            {clinic.isVerified && (
              <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="موثّق" />
            )}
          </div>
          <p className="text-xs font-bold text-muted-foreground">
            {spec?.name} • {clinic.area || "—"}
          </p>
          {clinic.workingHours && (
            <p className="mt-1 flex items-start gap-1 text-xs font-bold text-foreground">
              <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {clinic.workingHours}
            </p>
          )}
          {extras?.bio && (
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-foreground">
              {extras.bio}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold">
            {clinic.availableNow ? (
              <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-success">
                مفتوح دلوقتي
              </span>
            ) : (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-muted-foreground">
                مغلق دلوقتي
              </span>
            )}
            {clinic.price ? (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-foreground">
                الكشف {clinic.price} ج
              </span>
            ) : null}
            <span className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-muted-foreground">
              متابعة الدور (قريباً)
            </span>
            <span className="ms-auto">
              <NotificationsBell
                audience={isOwner ? "clinic" : "patient"}
                clinicId={clinic.id}
                tone="gold"
              />
            </span>
          </div>
        </div>

        {/* Actions */}
        {isOwner ? (
          <div className="relative mt-3 flex items-center justify-between gap-2 rounded-xl bg-secondary/60 p-1.5">
            <span className="px-2 text-[11px] font-extrabold text-muted-foreground">
              بروفايلك زي ما المريض بيشوفه
            </span>
            <button
              type="button"
              onClick={() => setCreateSheet(true)}
              aria-label="إنشاء قصة أو منشور"
              className="ms-auto grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setOwnerMenu((v) => !v)}
              aria-label="خيارات العيادة"
              aria-expanded={ownerMenu}
              className="grid h-8 w-8 place-items-center rounded-full border border-gold/40 bg-background/70 text-gold backdrop-blur"
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
                      setEditOpen(true);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-right hover:bg-secondary"
                  >
                    <Pencil className="h-4 w-4 text-primary" /> تعديل البروفايل
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setOwnerMenu(false);
                      postInputRef.current?.click();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-right hover:bg-secondary"
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
                    className="flex w-full items-center gap-2 px-4 py-2.5 hover:bg-secondary"
                  >
                    <Grid3x3 className="h-4 w-4 text-primary" /> لوحة الطبيب
                  </Link>
                  <Link
                    role="menuitem"
                    to="/doctor-settings"
                    className="flex w-full items-center gap-2 px-4 py-2.5 hover:bg-secondary"
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
                    className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-right text-destructive hover:bg-secondary"
                  >
                    <LogOut className="h-4 w-4" /> تسجيل الخروج
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <button
            onClick={() =>
              requirePatient(async () => {
                const next = !following;
                setFollowing(next);
                const res = await toggleFollowClinic(id, next);
                if (res) setExtras((prev) => (prev ? { ...prev, followers: res.followers } : prev));
                else setFollowing(!next);
              })
            }
            className={`flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-extrabold ${
              following ? "bg-secondary text-foreground" : "bg-primary text-primary-foreground"
            }`}
          >
            {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {following ? "بتتابعه" : "متابعة"}
          </button>
          {!isOwner && (
            <button
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
              className="flex items-center justify-center gap-1 rounded-lg bg-primary/15 py-2 text-xs font-extrabold text-primary"
            >
              <MessagesSquare className="h-4 w-4" /> مراسلة
            </button>
          )}
          <button
            onClick={() =>
              requirePatient(() =>
                window.open(
                  whatsappLink(clinic.phone, `أهلاً، عايز أستفسر عن مواعيد ${clinic.doctor}.`),
                  "_blank",
                  "noopener",
                ),
              )
            }
            className="flex items-center justify-center gap-1 rounded-lg bg-secondary py-2 text-xs font-extrabold text-foreground"
          >
            <MessageCircle className="h-4 w-4 text-success" /> واتساب
          </button>
          <button
            onClick={() =>
              requirePatient(() => {
                if (clinic.phone) window.location.href = `tel:${clinic.phone}`;
              })
            }
            className="flex items-center justify-center gap-1 rounded-lg bg-secondary py-2 text-xs font-extrabold text-foreground"
          >
            <Phone className="h-4 w-4 text-primary" /> اتصال
          </button>
          <a
            href={directionsPath(clinic.lat, clinic.lng, clinic.doctor)}
            className="flex items-center justify-center gap-1 rounded-lg bg-secondary py-2 text-xs font-extrabold text-foreground"
          >
            <Navigation className="h-4 w-4 text-primary" /> اتجاهات
          </a>
          <button
            onClick={shareProfile}
            className="flex items-center justify-center gap-1 rounded-lg bg-secondary py-2 text-xs font-extrabold text-foreground"
          >
            <Share2 className="h-4 w-4" /> مشاركة
          </button>
          <button
            type="button"
            disabled
            title="الحجز أونلاين قريباً"
            className="flex cursor-not-allowed items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-[11px] font-extrabold text-muted-foreground"
          >
            <CalendarPlus className="h-4 w-4" /> حجز (قريباً)
          </button>
        </div>

        {/* Highlights */}
        <div className="-mx-4 sm:-mx-5">
          {/* Highlights */}
          <div className="-mx-4 mt-5 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
            <div className="flex gap-4 pb-1">
              {isOwner && (
                <button
                  onClick={() => {
                    setHlPicked([]);
                    setHlMsg("");
                    setNewHighlight(true);
                  }}
                  className="shrink-0 text-center"
                  aria-label="هايلايت جديد"
                >
                  <span className="grid h-[68px] w-[68px] place-items-center rounded-full border-2 border-dashed border-border bg-card/70 text-foreground">
                    <Plus className="h-6 w-6" />
                  </span>
                  <span className="mt-1.5 block max-w-[68px] truncate text-[10px] font-bold text-gold">
                    هايلايت جديد
                  </span>
                </button>
              )}
              {stories.highlights.map((h) => (
                <div key={h.id} className="relative shrink-0 text-center">
                  <button
                    onClick={() => {
                      if (h.items.length) setStoryView({ items: h.items, title: h.title });
                      else if (isOwner) {
                        storyTargetHighlight.current = h.id;
                        storyInputRef.current?.click();
                      }
                    }}
                    className="block"
                  >
                    <span className="block h-[68px] w-[68px] rounded-full border border-border p-[3px]">
                      <span className="relative grid h-full w-full place-items-center overflow-hidden rounded-full bg-secondary text-2xl">
                        {h.items[0]?.url && h.items[0].mediaType === "image" ? (
                          <img
                            src={h.items[0].url}
                            alt={h.title}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          h.emoji
                        )}
                      </span>
                    </span>
                    <span className="mt-1.5 block max-w-[68px] truncate text-[11px] font-semibold text-foreground">
                      {h.title}
                    </span>
                  </button>
                  {isOwner && (
                    <span className="absolute -top-1 right-0 flex flex-col gap-1">
                      <button
                        onClick={() => {
                          storyTargetHighlight.current = h.id;
                          storyInputRef.current?.click();
                        }}
                        aria-label={`إضافة لـ ${h.title}`}
                        className="grid h-5 w-5 place-items-center rounded-full gradient-gold text-gold-foreground"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={async () => {
                          if (await deleteHighlight(h.id)) await refreshStories();
                        }}
                        aria-label={`حذف ${h.title}`}
                        className="grid h-5 w-5 place-items-center rounded-full bg-background/90 text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>
              ))}
              {!isOwner && stories.highlights.length === 0 && (
                <p className="py-4 text-[11px] text-muted-foreground">
                  لسه مفيش هايلايتس من العيادة.
                </p>
              )}
            </div>
          </div>
        </div>
        {isOwner && (
          <button
            onClick={() => setUrgentOpen(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/50 bg-destructive/10 py-2.5 text-[11px] font-extrabold text-destructive"
          >
            <AlertTriangle className="h-4 w-4" /> نشر تنبيه عاجل للمتابعين (ستوري نصية)
          </button>
        )}

        {/* Tabs */}
        <div className="-mx-4 mt-4 grid grid-cols-4 border-t border-border sm:-mx-5">
          {(
            [
              ["posts", Grid3x3, "المنشورات"],
              ["reels", Clapperboard, "الفيديو"],
              ["info", Info, "العيادة"],
              ["reviews", Star, "التقييمات"],
            ] as const
          ).map(([k, Icon, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              aria-label={l}
              className={`-mt-px flex flex-col items-center gap-0.5 border-t-2 py-2.5 text-[10px] font-bold ${
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
          {(extras?.posts ?? []).filter((p) => tab === "posts" || p.mediaType === "video")
            .length === 0 ? (
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
                .filter(({ p }) => (tab === "reels" ? p.mediaType === "video" : true))
                .map(({ p, i }) => (
                  <button
                    key={p.id}
                    onClick={() => setViewerIndex(i)}
                    aria-label={p.mediaType === "video" ? "تشغيل الفيديو" : "فتح المنشور"}
                    className={`relative overflow-hidden bg-surface-deep ${tab === "reels" ? "aspect-[9/16]" : "aspect-square"}`}
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
                    {isOwner && (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="حذف المنشور"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setBusy(p.id);
                          if (await deleteClinicPost(p.id)) await refreshExtras();
                          setBusy(null);
                        }}
                        className="absolute bottom-1.5 left-1.5 grid h-6 w-6 place-items-center rounded-full bg-background/80 text-destructive"
                      >
                        {busy === p.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </span>
                    )}
                    <span className="absolute bottom-1.5 right-1.5 flex items-center gap-2 rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-extrabold backdrop-blur">
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
                  </button>
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
          {/* Working hours */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Clock3 className="h-4 w-4 text-primary" /> مواعيد وأيام العمل
            </p>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {clinic.workingHours || "لم تُضف العيادة مواعيدها بعد — اتصل للاستفسار."}
            </p>
          </div>
          <div className="rounded-3xl border border-dashed border-border bg-card/60 p-5 text-center">
            <p className="text-sm font-extrabold text-foreground">الدور المباشر والحجز أونلاين</p>
            <p className="mt-1 text-xs text-muted-foreground">
              قريباً — هتقدر تحجز وتتابع دورك لحظياً من سند.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-bold">نبذة</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {extras?.bio
                ? extras.bio
                : `${clinic.doctor} — أخصائي ${spec?.name}. الحجز عن طريق سند، والدفع نقداً في العيادة.`}
            </p>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-secondary p-3">
              <span className="text-xs text-muted-foreground">سعر الكشف</span>
              <span className="font-extrabold">
                {clinic.price ? `${clinic.price} جنيه` : "غير محدد"}
              </span>
            </div>
            {clinic.price ? (
              <div className="mt-2 flex items-start gap-2 rounded-xl bg-success/10 p-3 text-[11px] font-bold leading-relaxed text-success">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>سعر صافٍ وشفاف — لا توجد أي رسوم إدارية أو مصاريف خفية من سند.</span>
              </div>
            ) : null}
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
              <Phone className="h-4 w-4 text-primary" /> {clinic.phone || "—"}
            </div>
            <div className="mt-2 rounded-xl border border-dashed border-border p-3 text-[11px] leading-relaxed text-muted-foreground">
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

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">العنوان</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{clinic.address || "—"}</p>
                <p className="text-sm text-muted-foreground">{clinic.area}</p>
              </div>
            </div>
            <iframe
              title="خريطة العيادة"
              className="mt-3 h-40 w-full rounded-xl border border-border"
              loading="lazy"
              src={`https://maps.google.com/maps?q=${clinic.lat},${clinic.lng}&z=15&output=embed`}
            />
          </div>
          {/* FAQ */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-bold">أسئلة شائعة</p>
            <div className="mt-2 divide-y divide-border">
              {[
                [
                  "إزاي أحجز؟",
                  "الحجز أونلاين قريباً — حالياً تواصل مع العيادة بالاتصال أو الواتساب.",
                ],
                ["الدفع إزاي؟", "الدفع نقداً في العيادة، مفيش أي دفع أونلاين."],
                ["أقدر أعرف دوري؟", "متابعة الدور لحظياً ميزة قادمة قريباً."],
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
                {extras?.reviewsCount ? extras.ratingAvg : clinic.rating || 0}
              </div>
              <div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`h-4 w-4 ${
                        n <=
                        Math.round(extras?.reviewsCount ? extras.ratingAvg : clinic.rating || 0)
                          ? "fill-warning text-warning"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {(extras?.reviewsCount ?? 0) > 0
                    ? `${extras?.reviewsCount} تقييم من المرضى`
                    : "لسه مفيش تقييمات"}
                </p>
              </div>
            </div>
            <p className="mt-3 rounded-xl bg-secondary p-3 text-[11px] text-muted-foreground">
              التقييم بيتحدّث تلقائياً من تقييمات المرضى اللي خلصوا كشف فعلاً.
            </p>

            {/* Real reviews */}
            <div className="mt-3 space-y-2">
              {reviews.length === 0 ? (
                <p className="text-xs text-muted-foreground">لسه مفيش تعليقات من المرضى.</p>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border bg-secondary/50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold">{r.patientName}</span>
                        {r.visited && (
                          <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
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
              <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-center text-[11px] font-bold text-muted-foreground">
                التقييم بكود الحجز قريباً ⏳
              </p>
            )}
            {/* Verified review form — shipped behind a flag until codes reach patients. */}
            {REVIEW_FORM_ENABLED && !isOwner && (
              <div className="mt-3 rounded-xl border border-dashed border-border p-3">
                <p className="text-xs font-extrabold">قيّم الطبيب بعد الكشف</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  اكتب كود الحجز بتاعك (SND-XXXXX) — التقييم متاح بعد ما العيادة تسجّل إنك خلصت كشف.
                </p>
                <div className="mt-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setReviewRating(n)} aria-label={`${n} نجوم`}>
                      <Star
                        className={`h-6 w-6 ${n <= reviewRating ? "fill-warning text-warning" : "text-muted-foreground"}`}
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
                {reviewMsg && (
                  <p className="mt-2 text-[11px] font-bold text-primary">{reviewMsg}</p>
                )}
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

      {tab === "book" && (
        <>
          {/* Day picker */}
          <div className="mt-4">
            <div className="mb-3 flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
              <Clock3 className="h-4 w-4 text-primary" /> مواعيد الكشف المتاحة — اختار اليوم
              والساعة.
            </div>
            <h3 className="text-base font-bold">اختار اليوم</h3>
            <div className="-mx-5 mt-3 overflow-x-auto px-5">
              <div className="flex gap-2">
                {days.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => setDayIdx(i)}
                    className={`shrink-0 rounded-2xl border px-4 py-3 text-center ${
                      dayIdx === i
                        ? "gradient-primary border-transparent text-white shadow-soft"
                        : "border-border bg-card text-foreground"
                    }`}
                  >
                    <div className="text-xs opacity-80">{d.label}</div>
                    <div className="mt-0.5 text-sm font-bold">{d.date}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Time picker */}
          <div className="mt-6">
            <h3 className="text-base font-bold">اختار الساعة</h3>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {timeSlots.map((t) => (
                <button
                  key={t}
                  onClick={() => setSlot(t)}
                  className={`rounded-xl border py-2.5 text-sm font-bold ${
                    slot === t
                      ? "gradient-primary border-transparent text-white"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Confirm */}
          <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-border bg-card/95 p-4 backdrop-blur">
            <button
              disabled
              className="w-full cursor-not-allowed rounded-2xl gradient-primary py-4 text-base font-extrabold text-white shadow-soft opacity-50"
            >
              الحجز أونلاين قريباً ⏳ — كلّم العيادة مباشرة
            </button>
          </div>
        </>
      )}

      {authOpen && (
        <PatientAuthModal
          title={pendingAction.current ? undefined : "بياناتك لتأكيد الدور"}
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
            else void doBooking(s);
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
                  <span className="block text-[11px] text-muted-foreground">{d}</span>
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
                className="grid h-8 w-8 place-items-center rounded-full bg-secondary"
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
              await deleteStory(storyId);
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
                className="grid h-8 w-8 place-items-center rounded-full bg-secondary"
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
                <p className="mt-1 text-[11px] text-muted-foreground">
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
                          <span className="absolute inset-0 grid place-items-center p-1 text-[10px] font-bold">
                            {st.caption}
                          </span>
                        )}
                        <span
                          className={`absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-white text-[10px] font-black ${idx >= 0 ? "bg-gold text-gold-foreground" : "bg-black/30"}`}
                        >
                          {idx >= 0 ? idx + 1 : ""}
                        </span>
                        {idx === 0 && (
                          <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-[9px] font-bold text-white">
                            الغلاف
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  أول ستوري تختارها هتبقى غلاف الهايلايت.
                </p>
              </>
            )}
            {hlMsg && <p className="mt-2 text-[11px] font-bold text-destructive">{hlMsg}</p>}
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
                className="grid h-8 w-8 place-items-center rounded-full bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
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
            className="grid h-9 w-9 place-items-center rounded-full bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSheet(true)}
            className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-gold/40 p-3 text-[11px] font-bold text-gold"
          >
            {uploading === "avatar" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            تعديل الصورة الشخصية
          </button>
          <label className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border border-dashed border-gold/40 p-3 text-[11px] font-bold text-gold">
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
            <p className="mt-1 text-[11px] text-muted-foreground">
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-1">
      <p className="text-base font-black text-foreground">{value}</p>
      <p className="text-[10px] font-bold text-muted-foreground">{label}</p>
    </div>
  );
}
