import type { Dispatch, RefObject, SetStateAction } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarPlus,
  Camera,
  Clapperboard,
  Clock3,
  Grid3x3,
  Info,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  MessagesSquare,
  MoreVertical,
  Navigation,
  Pencil,
  Phone,
  Plus,
  Settings,
  Share2,
  Star,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { directionsPath } from "@/lib/directions";
import { openConversation } from "@/lib/chat";
import { NotificationsBell } from "@/components/NotificationsBell";
import {
  toggleFollowClinic,
  uploadClinicMedia,
  type ClinicProfileExtras,
} from "@/lib/clinic-profile";
import { type ClinicStories, type StoryItem } from "@/lib/stories";
import { signOutStaff, whatsappLink, type Clinic } from "@/lib/mock-data";
import type { PatientSession } from "@/lib/patient-session";

type NavigateFn = ReturnType<typeof useNavigate>;

export function ClinicDetailHeader({
  id,
  clinic,
  specName,
  extras,
  setExtras,
  stories,
  isOwner,
  following,
  setFollowing,
  busy,
  setBusy,
  tab,
  setTab,
  ownerMenu,
  setOwnerMenu,
  setCreateSheet,
  setEditOpen,
  setAvatarSheet,
  setStoryView,
  setBookingOpen,
  setUrgentOpen,
  postInputRef,
  storyInputRef,
  storyTargetHighlight,
  requirePatient,
  shareProfile,
  navigate,
  pendingAction,
  setAuthOpen,
  refreshExtras,
}: {
  id: string;
  clinic: Clinic;
  specName: string;
  extras: ClinicProfileExtras | null;
  setExtras: Dispatch<SetStateAction<ClinicProfileExtras | null>>;
  stories: ClinicStories;
  isOwner: boolean;
  following: boolean;
  setFollowing: (v: boolean) => void;
  busy: string | null;
  setBusy: (v: string | null) => void;
  tab: "info" | "reviews" | "posts" | "reels";
  setTab: (v: "info" | "reviews" | "posts" | "reels") => void;
  ownerMenu: boolean;
  setOwnerMenu: Dispatch<SetStateAction<boolean>>;
  setCreateSheet: (v: boolean) => void;
  setEditOpen: (v: boolean) => void;
  setAvatarSheet: (v: boolean) => void;
  setStoryView: (v: { items: StoryItem[]; title: string } | null) => void;
  setBookingOpen: (v: boolean) => void;
  setUrgentOpen: (v: boolean) => void;
  postInputRef: RefObject<HTMLInputElement | null>;
  storyInputRef: RefObject<HTMLInputElement | null>;
  storyTargetHighlight: { current: string | null };
  requirePatient: (action: (s: PatientSession) => void) => void;
  shareProfile: () => Promise<void>;
  navigate: NavigateFn;
  pendingAction: { current: ((s: PatientSession) => void) | null };
  setAuthOpen: (v: boolean) => void;
  refreshExtras: () => Promise<void>;
}) {
  const realReviewsCount = clinic.isDemo ? 0 : (extras?.reviewsCount ?? 0);
  const realRating = extras?.ratingAvg ?? 0;
  return (
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
            {specName || "استشاري وأخصائي"}
          </p>
        </div>
      </div>

      {/* 🌟 3. Trust Metrics Ribbon */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setTab("reviews")}
          aria-label="عرض تقييمات العيادة"
          className="flex flex-col items-center justify-center rounded-3xl tile-3d p-2.5 text-center"
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

        <div className="flex flex-col items-center justify-center rounded-3xl tile-3d p-2.5 text-center">
          <span className="text-sm font-black text-primary">
            {clinic.nowServing > 0 ? `#${clinic.nowServing}` : "جاهز"}
          </span>
          <span className="mt-0.5 text-xs font-bold text-muted-foreground">
            {clinic.nowServing > 0 ? "بيكشف عليه" : "طابور الكشف"}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center rounded-3xl tile-3d p-2.5 text-center">
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
        className="mt-4 flex min-h-13 w-full items-center justify-center gap-2.5 rounded-full gradient-primary px-5 py-3.5 text-sm font-black text-primary-foreground shadow-soft btn-3d disabled:cursor-not-allowed disabled:opacity-50"
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
                className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-3xl tile-3d p-2 text-center"
              >
                <MessageCircle className="h-4 w-4 text-success" />
                <span className="text-xs font-bold text-foreground">واتساب</span>
              </a>
            )}
            {clinic.phone && (
              <a
                href={`tel:${clinic.phone}`}
                className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-3xl tile-3d p-2 text-center"
              >
                <Phone className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">اتصال</span>
              </a>
            )}
          </>
        )}
        <a
          href={directionsPath(clinic.lat, clinic.lng, clinic.doctor)}
          className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-3xl tile-3d p-2 text-center"
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
            className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-3xl tile-3d p-2 text-center"
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
  );
}
