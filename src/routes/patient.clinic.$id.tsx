import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Star, MessageCircle, Users, Check, Banknote, BadgeCheck, CalendarPlus, Navigation, Phone, Clock3, Sparkles, UserPlus, UserCheck, Play, Settings, Pencil, Plus, Trash2, ImagePlus, X, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ClinicQrCard } from "@/components/ClinicQrCard";
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

export const Route = createFileRoute("/patient/clinic/$id")({
  head: () => ({
    meta: [
      { title: "تفاصيل العيادة — سندي" },
      { name: "description", content: "احجز موعدك في العيادة." },
    ],
  }),
  component: ClinicDetail,
});

function ClinicDetail() {
  const { id } = useParams({ from: "/patient/clinic/$id" });
  const [clinic, setClinic] = useState<Clinic | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [extras, setExtras] = useState<ClinicProfileExtras | null>(null);
  const [queue, setQueue] = useState<QueueStats | null>(null);
  const [following, setFollowing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const postInputRef = useRef<HTMLInputElement>(null);

  const refreshExtras = useCallback(async () => {
    setExtras(await getClinicProfileExtras(id));
  }, [id]);

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

  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);
  const [bookingCode, setBookingCode] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"about" | "book">("about");

  const confirmBooking = async () => {
    if (!clinic || !slot || submitting) return;
    setSubmitting(true);
    const b = await createBooking({
      clinicId: clinic.id,
      patientName: "مريض سندي",
      patientPhone: "",
      dayLabel: `${days[dayIdx].label} — ${days[dayIdx].date}`,
      slot,
    });
    setSubmitting(false);
    if (b) {
      setBookingCode(b.code);
      setBooked(true);
    }
  };

  if (!loaded) return <AppShell title="جاري التحميل…" backTo="/patient/search"><div /></AppShell>;
  if (!clinic || (!clinic.isVerified && !isOwner)) {
    return (
      <AppShell title="عيادة غير متاحة" backTo="/patient/search">
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
          <p className="mt-1 text-sm text-muted-foreground">
            احتفظ بكود الحجز واعرضه في العيادة
          </p>
          <div className="mt-4 rounded-2xl border-2 border-dashed border-primary bg-primary-soft p-4 text-center">
            <p className="text-xs font-bold text-primary">كود الحجز</p>
            <p className="mt-1 text-2xl font-extrabold tracking-widest text-primary">{bookingCode}</p>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-success/10 p-3 text-right">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/20 text-success">
              <Banknote className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">الدفع نقداً في العيادة</p>
              <p className="text-xs text-muted-foreground">مفيش أي رسوم على الحجز عبر سندي</p>
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
    <AppShell title={clinic.doctor} subtitle={spec?.name} backTo="/patient/search">
      {/* Premium dark profile header */}
      <div className="-mx-4 -mt-4 sm:-mx-5 sm:-mt-5">
        {/* Cover */}
        <div className="relative h-40 w-full bg-surface-deep sm:h-48">
          {extras?.coverUrl ? (
            <img src={extras.coverUrl} alt={`غلاف عيادة ${clinic.doctor}`} className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,var(--gold-soft),transparent_65%)] opacity-80" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_75%,var(--primary-soft),transparent_60%)] opacity-70" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
          <div className="absolute bottom-3 left-4 flex items-center gap-1.5 rounded-full border border-gold/40 bg-background/70 px-3 py-1 text-[10px] font-extrabold text-gold backdrop-blur">
            <Sparkles className="h-3 w-3" /> عيادة مميزة
          </div>
          {isOwner && (
            <div className="absolute bottom-3 right-4 flex items-center gap-2">
              <button
                onClick={() => setEditOpen(true)}
                aria-label="تعديل البروفايل"
                className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-background/70 px-3 py-1.5 text-[11px] font-extrabold text-gold backdrop-blur"
              >
                <Pencil className="h-3.5 w-3.5" /> تعديل البروفايل
              </button>
              <button
                onClick={() => postInputRef.current?.click()}
                aria-label="إضافة منشور"
                className="grid h-8 w-8 place-items-center rounded-full border border-gold/40 bg-background/70 text-gold backdrop-blur"
              >
                {busy === "post" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </button>
              <Link
                to="/doctor-settings"
                aria-label="إعدادات العيادة"
                className="grid h-8 w-8 place-items-center rounded-full border border-gold/40 bg-background/70 text-gold backdrop-blur"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
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
        </div>

        <div className="px-4 sm:px-5">
          {/* Avatar with story gradient ring */}
          <div className="-mt-12 flex items-end justify-between gap-3">
            <div className="relative">
              <div className="gradient-story grid h-24 w-24 place-items-center rounded-full p-[3px] shadow-gold sm:h-28 sm:w-28">
                {extras?.avatarUrl ? (
                  <img
                    src={extras.avatarUrl}
                    alt={`صورة ${clinic.doctor}`}
                    className="h-full w-full rounded-full border-2 border-background object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center rounded-full border-2 border-background bg-card text-4xl">
                    {spec?.emoji ?? "🩺"}
                  </div>
                )}
              </div>
              {clinic.isVerified && (
                <span
                  className="absolute -left-1 bottom-1 grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-[#1D9BF0]"
                  aria-label="حساب موثّق"
                >
                  <BadgeCheck className="h-4 w-4 text-white" />
                </span>
              )}
            </div>
            {clinic.availableNow ? (
              <span className="mb-1 rounded-full bg-success/15 px-3 py-1 text-[11px] font-extrabold text-success">
                مفتوح دلوقتي
              </span>
            ) : (
              <span className="mb-1 rounded-full bg-secondary px-3 py-1 text-[11px] font-extrabold text-muted-foreground">
                مغلق دلوقتي
              </span>
            )}
          </div>

          {/* Name + specialty */}
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black tracking-tight text-foreground">{clinic.doctor}</h2>
              {clinic.isVerified && <BadgeCheck className="h-5 w-5 shrink-0 text-[#1D9BF0]" aria-label="موثّق" />}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {spec?.name} • {clinic.area || "—"}
            </p>
          </div>

          {/* Stats row */}
          <div className="mt-4 grid grid-cols-3 divide-x divide-border/60 rounded-2xl border border-gold/20 bg-card/60 py-3 text-center [direction:ltr]">
            <Stat value={String(extras?.followers ?? 0)} label="متابع" />
            <Stat value={String(extras?.postsCount ?? 0)} label="منشور" />
            <Stat
              value={`${extras?.reviewsCount ? extras.ratingAvg : clinic.rating || 0} ⭐`}
              label={`${extras?.reviewsCount ?? clinic.reviews ?? 0} تقييم`}
            />
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={async () => {
                const next = !following;
                setFollowing(next);
                const res = await toggleFollowClinic(id, next);
                if (res) setExtras((prev) => (prev ? { ...prev, followers: res.followers } : prev));
                else setFollowing(!next);
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl border py-3 text-xs font-extrabold transition-colors ${
                following
                  ? "border-gold/60 bg-gold/15 text-gold"
                  : "border-gold/40 bg-card text-gold hover:bg-gold/10"
              }`}
            >
              {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {following ? "بتتابعه" : "متابعة"}
            </button>
            <a
              href={whatsappLink(clinic.phone, `أهلاً، عايز أستفسر عن مواعيد ${clinic.doctor}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-border bg-card py-3 text-xs font-extrabold text-foreground transition-colors hover:bg-secondary"
            >
              <MessageCircle className="h-4 w-4 text-success" /> رسالة
            </a>
            <button
              onClick={() => setTab("book")}
              className="gradient-gold flex flex-[1.4] items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-black text-gold-foreground shadow-gold"
            >
              <CalendarPlus className="h-4 w-4" /> احجز أونلاين
            </button>
          </div>

          {/* Secondary quick actions */}
          <div className="mt-2 flex items-center gap-2">
            <a
              href={clinic.phone ? `tel:${clinic.phone}` : "#"}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-border bg-card py-2.5 text-[11px] font-bold text-foreground"
            >
              <Phone className="h-4 w-4 text-primary" /> اتصال مباشر
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${clinic.lat},${clinic.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-border bg-card py-2.5 text-[11px] font-bold text-foreground"
            >
              <Navigation className="h-4 w-4 text-primary" /> الموقع على الخريطة
            </a>
          </div>

          {/* Highlights */}
          <div className="-mx-4 mt-5 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
            <div className="flex gap-4 pb-1">
              {[
                ["قبل وبعد", "✨"],
                ["جولة العيادة", "🏥"],
                ["تصميم الابتسامة", "😁"],
                ["آراء المرضى", "💬"],
                ["الأجهزة", "🔬"],
              ].map(([label, emoji]) => (
                <button key={label} className="shrink-0 text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-full border border-gold/50 bg-card/70 text-2xl">
                    {emoji}
                  </span>
                  <span className="mt-1.5 block max-w-[68px] truncate text-[10px] font-bold text-muted-foreground">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Live turn card */}
          <div className="glow-gold mt-5 rounded-3xl border border-gold/30 bg-surface-deep p-5 text-center">
            <p className="flex items-center justify-center gap-2 text-[11px] font-extrabold tracking-widest text-gold">
              <span className="grid h-2 w-2 animate-pulse place-items-center rounded-full bg-destructive" />
              الدور المباشر الآن
            </p>
            <p className="mt-1 text-6xl font-black leading-none text-foreground sm:text-7xl">
              {queue?.nowServing ?? clinic.nowServing}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              في الانتظار: {queue?.waiting ?? clinic.waitingCount}
              {(queue?.delayMinutes ?? clinic.delayMinutes)
                ? ` • تأخير ${queue?.delayMinutes ?? clinic.delayMinutes} دقيقة`
                : ""}
            </p>
          </div>

          {/* Tabs */}
          <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-secondary/60 p-1">
            {([
              ["about", "حول الطبيب"],
              ["book", "نبذة ومواعيد الكشف"],
            ] as const).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-xl py-2 text-xs font-bold ${
                  tab === k ? "bg-card text-gold shadow-soft" : "text-muted-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === "about" && (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-bold">نبذة</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {extras?.bio
                ? extras.bio
                : `${clinic.doctor} — أخصائي ${spec?.name}. الحجز عن طريق سندي، والدفع نقداً في العيادة.`}
            </p>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-secondary p-3">
              <span className="text-xs text-muted-foreground">سعر الكشف</span>
              <span className="font-extrabold">{clinic.price ? `${clinic.price} جنيه` : "غير محدد"}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
              <Phone className="h-4 w-4 text-primary" /> {clinic.phone || "—"}
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
                        n <= Math.round(extras?.reviewsCount ? extras.ratingAvg : clinic.rating || 0)
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
              التقييم بيتحدّث تلقائياً من تقييمات المرضى بعد الكشف.
            </p>
          </div>

          {/* FAQ */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-bold">أسئلة شائعة</p>
            <div className="mt-2 divide-y divide-border">
              {[
                ["إزاي أحجز؟", "اختار اليوم والساعة من تبويب مواعيد الكشف، وهيوصلك كود حجز تعرضه في العيادة."],
                ["الدفع إزاي؟", "الدفع نقداً في العيادة، مفيش أي دفع أونلاين."],
                ["أقدر أعرف دوري؟", "أيوه، من صفحة متابعة الدور بتشوف رقم الدور الحالي لحظياً."],
                ["لو اتأخرت أو عايز ألغي؟", "كلّم العيادة على الواتساب أو الرقم المباشر وهيتم تعديل حجزك."],
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

          {/* Instagram-style media grid */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold">من العيادة</p>
              {isOwner && (
                <button
                  onClick={() => postInputRef.current?.click()}
                  className="flex items-center gap-1 rounded-full border border-gold/40 px-2.5 py-1 text-[11px] font-extrabold text-gold"
                >
                  <ImagePlus className="h-3.5 w-3.5" /> إضافة منشور
                </button>
              )}
            </div>
            {extras && extras.posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
                {isOwner ? "لسه مفيش منشورات — اضغط «إضافة منشور» وارفع صور العيادة." : "العيادة لسه ما نشرتش صور."}
              </div>
            ) : (
              <div className="-mx-4 grid grid-cols-3 gap-[3px] sm:mx-0">
                {(extras?.posts ?? []).map((p) => (
                  <div key={p.id} className="relative aspect-square overflow-hidden bg-surface-deep">
                    {p.mediaType === "video" ? (
                      <>
                        <video src={p.url} className="h-full w-full object-cover" muted playsInline />
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
                      <button
                        aria-label="حذف المنشور"
                        onClick={async () => {
                          setBusy(p.id);
                          if (await deleteClinicPost(p.id)) await refreshExtras();
                          setBusy(null);
                        }}
                        className="absolute bottom-1.5 left-1.5 grid h-6 w-6 place-items-center rounded-full bg-background/80 text-destructive"
                      >
                        {busy === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                ))}
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
          <Clock3 className="h-4 w-4 text-primary" /> مواعيد الكشف المتاحة — اختار اليوم والساعة.
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
          disabled={!slot || submitting}
          onClick={confirmBooking}
          className="w-full rounded-2xl gradient-primary py-4 text-base font-extrabold text-white shadow-soft disabled:opacity-50"
        >
          {submitting ? "جاري الحفظ…" : slot ? `أكد الحجز — ${slot}` : "اختار الساعة الأول"}
        </button>
      </div>
      </>
      )}
    </AppShell>
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