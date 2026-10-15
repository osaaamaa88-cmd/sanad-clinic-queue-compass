import { APP_VERSION_LABEL } from "@/lib/app-version";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SoundToggle, ThemeSetting } from "@/components/SoundControls";
import { useCallback, useEffect, useState } from "react";
import {
  MapPin,
  Save,
  UserPlus,
  Zap,
  Clock,
  CheckCircle2,
  Sparkles,
  Lock,
  LogOut,
  BookOpen,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StaffAuth, authErrorMessage } from "@/components/StaffAuth";
import { supabase } from "@/integrations/supabase/client";
import { svrAddSecretary, svrCreateMyClinic, svrListSecretaries } from "@/lib/staff.functions";
import { resetDoctorModeCache } from "@/lib/use-doctor-mode";
import {
  specialties,
  upsertClinic,
  getMyClinicMembership,
  registerDoctorAccount,
  signOutStaff,
  type Clinic,
} from "@/lib/mock-data";

export const Route = createFileRoute("/doctor-settings")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "إعدادات العيادة — سَنَد" },
      { name: "description", content: "دخول الطبيب لإدارة بروفايل عيادته وحساب السكرتير ومتابعة التوثيق." },
      { property: "og:title", content: "إعدادات العيادة — سَنَد" },
      { property: "og:description", content: "سجّل عيادتك على سَنَد وأدر بياناتك وحساب السكرتير." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DoctorSettings,
});

type Mode = "login" | "signup";

function DoctorSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [role, setRole] = useState<"doctor" | "secretary" | null>(null);
  const [mode, setMode] = useState<Mode>("login");

  const [clinicId, setClinicId] = useState<string | undefined>(undefined);
  const [isVerified, setIsVerified] = useState(false);
  const [name, setName] = useState("");
  const [spec, setSpec] = useState(specialties[0].id);
  const [street, setStreet] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [area, setArea] = useState("");
  const [phone, setPhone] = useState("");
  const [price, setPrice] = useState("");
  const [available, setAvailable] = useState(false);
  const [saved, setSaved] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  // signup fields
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [signupError, setSignupError] = useState("");
  const [creating, setCreating] = useState(false);

  // secretary accounts
  const [secretaries, setSecretaries] = useState<{ id: string; full_name: string }[]>([]);
  const [secName, setSecName] = useState("");
  const [secEmail, setSecEmail] = useState("");
  const [secPass, setSecPass] = useState("");
  const [secError, setSecError] = useState("");
  const [secBusy, setSecBusy] = useState(false);

  const hydrate = (c: Clinic) => {
    setClinicId(c.id);
    setIsVerified(c.isVerified);
    setName(c.doctor);
    setSpec(c.specialtyId);
    setArea(c.area);
    setPhone(c.phone);
    setPrice(String(c.price));
    setAvailable(c.availableNow);
    setStreet(c.address);
  };

  const loadSecretaries = useCallback(async () => {
    try {
      const { rows } = await svrListSecretaries();
      setSecretaries(rows as { id: string; full_name: string }[]);
    } catch {
      setSecretaries([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setSignedIn(false);
      setRole(null);
      setClinicId(undefined);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    const membership = await getMyClinicMembership();
    setRole(membership.role);
    if (membership.clinic) hydrate(membership.clinic);
    if (membership.role === "doctor") await loadSecretaries();
    setLoading(false);
  }, [loadSecretaries]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = async () => {
    if (!name.trim() || !phone.trim()) return;
    let targetId = clinicId;
    if (!targetId) {
      try {
        const res = await svrCreateMyClinic({ data: { doctor: name.trim(), specialtyId: spec, phone: phone.trim().replace(/^0/, "20") } });
        targetId = res.id;
        setClinicId(targetId);
        resetDoctorModeCache();
      } catch {
        return;
      }
    }
    const address = [street, building, floor].filter(Boolean).join("، ");
    const updated = await upsertClinic({
      id: targetId,
      doctor: name.trim(),
      specialtyId: spec,
      address: address || street.trim(),
      area: area.trim(),
      distanceKm: 0,
      price: Number(price) || 0,
      rating: 0,
      reviews: 0,
      availableNow: available,
      phone: phone.trim().replace(/^0/, "20"),
      nowServing: 0,
      yourNumber: 0,
      waitingCount: 0,
      lat: 30.0444,
      lng: 31.2357,
    });
    if (!updated) return;
    setIsVerified(updated.isVerified);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const doSignup = async () => {
    setSignupError("");
    if (!name.trim()) return setSignupError("من فضلك اكتب اسم الطبيب");
    if (!phone.trim()) return setSignupError("من فضلك اكتب رقم الموبايل / الواتساب");
    if (!email.trim()) return setSignupError("من فضلك اكتب البريد الإلكتروني");
    if (pass.length < 8) return setSignupError("كلمة السر لازم تكون ٨ حروف أو أرقام على الأقل");
    setCreating(true);
    const res = await registerDoctorAccount({
      email: email.trim(),
      password: pass,
      doctor: name.trim(),
      specialtyId: spec,
      phone: phone.trim().replace(/^0/, "20"),
    });
    setCreating(false);
    if (!res.ok) return setSignupError(authErrorMessage(res.code));
    setJustSubmitted(true);
    setPass("");
    await refresh();
  };

  const addSecretary = async () => {
    setSecError("");
    if (!secName.trim()) return setSecError("اكتب اسم السكرتير");
    if (!secEmail.trim()) return setSecError("اكتب بريد السكرتير");
    if (secPass.length < 6) return setSecError("كلمة السر لازم ٦ حروف أو أرقام على الأقل");
    setSecBusy(true);
    try {
      await svrAddSecretary({
        data: { email: secEmail.trim(), password: secPass, fullName: secName.trim() },
      });
      setSecName("");
      setSecEmail("");
      setSecPass("");
      await loadSecretaries();
    } catch (e) {
      setSecError(authErrorMessage((e as Error)?.message));
    }
    setSecBusy(false);
  };

  const signOut = async () => {
    await signOutStaff();
    setSignedIn(false);
    setRole(null);
    setClinicId(undefined);
    navigate({ to: "/doctor/login", replace: true });
  };

  if (loading) {
    return (
      <AppShell title="إعدادات العيادة" backTo="/doctor">
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> جاري التحميل…
        </div>
      </AppShell>
    );
  }

  // Not signed in → login or create account
  if (!signedIn) {
    return (
      <AppShell title="حساب الطبيب" subtitle="دخول أو إنشاء حساب" backTo="/doctor">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["login", "تسجيل الدخول"],
              ["signup", "حساب جديد"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-xl py-2.5 text-sm font-bold ${
                mode === m ? "gradient-primary text-white" : "border border-border bg-card"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {mode === "login" ? (
            <StaffAuth
              title="دخول الطبيب أو السكرتير"
              hint="استخدم البريد وكلمة السر اللي سجلت بيهم."
              onSignedIn={refresh}
            />
          ) : (
            <>
              <div className="rounded-2xl border border-primary bg-primary-soft p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <p className="text-xs font-bold leading-relaxed text-primary">
                    ٥ بيانات بس وحسابك يبقى جاهز. تقدر تكمّل باقي بيانات بروفايلك بعد الدخول للوحة التحكم.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-4 rounded-2xl border border-border bg-card p-4">
                <Field label="اسم الطبيب *" value={name} onChange={setName} placeholder="د. الاسم الكامل" />
                <div>
                  <label className="text-xs font-bold text-muted-foreground">التخصص *</label>
                  <div className="mt-2 -mx-1 overflow-x-auto px-1">
                    <div className="flex gap-2">
                      {specialties.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSpec(s.id)}
                          className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
                            spec === s.id ? "gradient-primary text-white" : "bg-secondary"
                          }`}
                        >
                          {s.emoji} {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground">رقم الموبايل / الواتساب *</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    placeholder="01xxxxxxxxx"
                    className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-bold outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground">البريد الإلكتروني *</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    dir="ltr"
                    placeholder="doctor@email.com"
                    className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-bold outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" /> كلمة السر *
                  </label>
                  <input
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    type="password"
                    dir="ltr"
                    placeholder="٦ حروف أو أرقام على الأقل"
                    className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-bold outline-none focus:border-primary"
                  />
                </div>
                {signupError && (
                  <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
                    {signupError}
                  </p>
                )}
              </div>

              <button
                onClick={doSignup}
                disabled={creating}
                className="mt-5 w-full rounded-2xl gradient-primary py-4 text-base font-extrabold text-white shadow-soft disabled:opacity-60"
              >
                {creating ? "جاري الإنشاء…" : "إنشاء حساب العيادة الآن"}
              </button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
                بتسجيلك أنت موافق على{" "}
                <Link to="/terms" className="font-bold text-primary underline">
                  شروط الاستخدام وإخلاء المسؤولية
                </Link>
                . سَنَد أداة تنظيم مواعيد فقط ولا تقدم استشارات طبية.
              </p>
            </>
          )}
        </div>
      </AppShell>
    );
  }

  // Signed in as secretary → send them to the booking sheet
  if (role === "secretary") {
    return (
      <AppShell title="حساب السكرتير" backTo="/doctor">
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
            <BookOpen className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-bold">أنت داخل بحساب سكرتير</p>
          <p className="mt-1 text-xs text-muted-foreground">دفتر الحجز هو شاشتك الأساسية.</p>
          <button
            onClick={() => navigate({ to: "/reception" })}
            className="mt-4 w-full rounded-xl gradient-primary py-3 text-sm font-extrabold text-white"
          >
            افتح دفتر الحجز
          </button>
          <button onClick={signOut} className="mt-2 w-full rounded-xl border border-border py-3 text-sm font-bold">
            خروج
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="إعدادات العيادة"
      subtitle="بروفايل عيادتك"
      backTo="/doctor"
      right={
        <button
          onClick={signOut}
          aria-label="خروج"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-secondary"
        >
          <LogOut className="h-5 w-5" />
        </button>
      }
    >
      <div className="mb-4"><SoundToggle />
<ThemeSetting /></div>
      {clinicId && !isVerified && (
        <div className="mb-4 rounded-2xl border border-warning bg-warning/10 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/20 text-warning">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-foreground">حسابك قيد المراجعة والتوثيق</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                حسابك قيد المراجعة والتوثيق من قبل إدارة التطبيق، وسيتم تفعيله فور التأكد من البيانات.
                لحد ما يتم التوثيق، عيادتك مش هتظهر للمرضى في البحث أو الخريطة.
              </p>
            </div>
          </div>
        </div>
      )}
      {clinicId && isVerified && (
        <div className="mb-4 rounded-2xl border border-success bg-success/10 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/20 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-foreground">حسابك موثّق ✓</p>
              <p className="mt-1 text-xs text-muted-foreground">عيادتك ظاهرة للمرضى في البحث والخريطة.</p>
            </div>
          </div>
        </div>
      )}

      {/* Availability */}
      <div
        className={`flex items-center gap-3 rounded-2xl p-4 shadow-soft sm:gap-4 ${
          available ? "gradient-primary text-white" : "border border-border bg-card"
        }`}
      >
        <div
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
            available ? "bg-white/20" : "bg-primary-soft text-primary"
          }`}
        >
          <Zap className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{available ? "متاح الآن — طوارئ" : "العيادة مقفولة"}</p>
          <p className={`text-xs ${available ? "opacity-90" : "text-muted-foreground"}`}>
            {available ? "المرضى بيشوفوك في قايمة المتاح دلوقتي" : "فعّل عشان تظهر للمرضى فوراً"}
          </p>
        </div>
        <button
          onClick={() => setAvailable((v) => !v)}
          aria-label="تبديل حالة الإتاحة"
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${
            available ? "bg-white/30" : "bg-secondary"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
              available ? "right-0.5" : "right-[calc(100%-1.625rem)]"
            }`}
          />
        </button>
      </div>

      {/* Quick link to the booking sheet */}
      <Link
        to="/reception"
        className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-extrabold"
      >
        <BookOpen className="h-4 w-4 text-primary" /> افتح دفتر الحجز
      </Link>
      <Link
        to="/doctor/stories"
        className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-extrabold"
      >
        <Sparkles className="h-4 w-4 text-primary" /> إدارة القصص والهايلايت
      </Link>

      {/* Profile form */}
      <div className="mt-6 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold">بيانات العيادة</h2>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          اختيارية — أضفها لاحقاً
        </span>
      </div>
      <div className="mt-3 space-y-4 rounded-2xl border border-border bg-card p-4">
        <Field label="اسم الطبيب *" value={name} onChange={setName} placeholder="د. الاسم الكامل" />
        <div>
          <label className="text-xs font-bold text-muted-foreground">التخصص</label>
          <div className="mt-2 -mx-1 overflow-x-auto px-1">
            <div className="flex gap-2">
              {specialties.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSpec(s.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
                    spec === s.id ? "gradient-primary text-white" : "bg-secondary"
                  }`}
                >
                  {s.emoji} {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Field label="المنطقة / الحي (اختياري)" value={area} onChange={setArea} placeholder="مثال: المهندسين" />
        <Field label="الشارع (اختياري)" value={street} onChange={setStreet} placeholder="اسم الشارع" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="العمارة (اختياري)" value={building} onChange={setBuilding} placeholder="عمارة رقم…" />
          <Field label="الدور (اختياري)" value={floor} onChange={setFloor} placeholder="الدور…" />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground">رقم الموبايل (واتساب) *</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="01xxxxxxxxx"
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-bold outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground">سعر الكشف (اختياري)</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="numeric"
            placeholder="مثال: 250"
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-bold outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Map picker */}
      <h2 className="mt-6 text-base font-bold">حدد الموقع على الخريطة (اختياري)</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative">
          <iframe
            title="اختيار موقع العيادة"
            className="h-56 w-full"
            loading="lazy"
            src="https://maps.google.com/maps?q=cairo%20egypt&z=13&output=embed"
          />
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <MapPin className="h-10 w-10 fill-destructive text-destructive drop-shadow" />
          </div>
        </div>
      </div>

      {/* Secretary accounts */}
      <h2 className="mt-6 text-base font-bold">حسابات السكرتير</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        السكرتير بيدخل بالبريد وكلمة السر ويقدر يفتح دفتر الحجز ويعدّل رقم الدور — المرضى مش بيقدروا.
      </p>
      <div className="mt-3 space-y-2">
        {secretaries.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary">
              {(s.full_name || "س").charAt(0)}
            </div>
            <p className="min-w-0 flex-1 truncate text-sm font-bold">{s.full_name || "سكرتير"}</p>
            <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">مفعّل</span>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2 rounded-2xl border-2 border-dashed border-border p-3">
        <input
          value={secName}
          onChange={(e) => setSecName(e.target.value)}
          placeholder="اسم السكرتير"
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <input
          value={secEmail}
          onChange={(e) => setSecEmail(e.target.value)}
          placeholder="بريد السكرتير"
          type="email"
          dir="ltr"
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <input
          value={secPass}
          onChange={(e) => setSecPass(e.target.value)}
          placeholder="كلمة سر السكرتير"
          type="password"
          dir="ltr"
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        {secError && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-[12px] font-bold text-destructive">{secError}</p>
        )}
        <button
          onClick={addSecretary}
          disabled={secBusy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-2.5 text-sm font-bold disabled:opacity-60"
        >
          {secBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} إضافة حساب سكرتير
        </button>
      </div>

      <button
        onClick={save}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-4 text-base font-extrabold text-white shadow-soft"
      >
        <Save className="h-5 w-5" /> {saved ? "تم الحفظ ✓" : "حفظ التعديلات"}
      </button>

      {justSubmitted && !isVerified && (
        <div className="mt-4 rounded-2xl border border-primary bg-primary-soft p-4 text-sm text-primary">
          تم تسجيل عيادتك بنجاح في فترة البيتا التجريبية، وحسابك قيد التفعيل من إدارة سَنَد.
        </div>
      )}
      <p className="mt-6 text-center text-[11px] text-muted-foreground" dir="ltr">SANAD {APP_VERSION_LABEL} · Stable</p>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
      />
    </div>
  );
}
