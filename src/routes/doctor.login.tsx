import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Sparkles, Loader2, BookOpen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { GoogleMark } from "@/components/GoogleMark";
import { AuthModeToggle } from "@/components/doctor-settings/AuthModeToggle";
import { LoadingState } from "@/components/LoadingState";
import { DoctorSignupFields } from "@/components/doctor-settings/DoctorSignupFields";
import { StorySplash, DOCTOR_STORY_SEEN_KEY } from "@/components/StorySplash";
import { StaffAuth } from "@/components/StaffAuth";
import { authErrorMessage } from "@/lib/auth-error-message";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import {
  specialties,
  getMyClinicMembership,
  registerDoctorAccount,
  signOutStaff,
} from "@/lib/mock-data";
import { getCachedProfile, saveCachedProfile } from "@/lib/user-profile-cache";
import { normalizeEgyptianMobile } from "@/lib/input-validation";
import { validateDoctorSignup } from "@/lib/doctor-signup";
import { svrCreateMyClinic } from "@/lib/staff.functions";
import { resetDoctorModeCache } from "@/lib/use-doctor-mode";

export const Route = createFileRoute("/doctor/login")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "دخول الطبيب — سند" },
      {
        name: "description",
        content: "دخول الطبيب لبروفايل عيادته على سند، أو إنشاء حساب عيادة جديد.",
      },
      { property: "og:title", content: "دخول الطبيب — سند" },
      { property: "og:description", content: "سجّل عيادتك على سند وافتح بروفايلك التفاعلي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DoctorEntry,
});

type Mode = "login" | "signup";

function DoctorEntry() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("login");
  const [noClinic, setNoClinic] = useState(false);

  // signup fields
  const [name, setName] = useState("");
  const [spec, setSpec] = useState(specialties[0].id);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [medicalLicense, setMedicalLicense] = useState("");
  const [syndicateNo, setSyndicateNo] = useState("");
  const [signupError, setSignupError] = useState("");
  const [creating, setCreating] = useState(false);
  const [gBusy, setGBusy] = useState(false);
  const [gErr, setGErr] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showStory, setShowStory] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(DOCTOR_STORY_SEEN_KEY)) setShowStory(true);
    } catch {
      /* ignore */
    }
  }, []);

  const route = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      setLoading(false);
      return;
    }
    // Auto-login: jump instantly using the cached profile while the server confirms.
    const cached = getCachedProfile();
    if (cached && cached.userId === session.user.id) {
      if (cached.role === "secretary") navigate({ to: "/reception", replace: true });
      else if (cached.clinicId)
        navigate({ to: "/patient/clinic/$id", params: { id: cached.clinicId }, replace: true });
    }
    const membership = await getMyClinicMembership();
    const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
    const role = membership.role === "secretary" ? "secretary" : "doctor";
    saveCachedProfile({
      userId: session.user.id,
      name:
        (membership.clinic as { doctor?: string } | undefined)?.doctor ||
        (typeof meta.full_name === "string" ? meta.full_name : "") ||
        session.user.email ||
        "",
      email: session.user.email,
      avatar: (membership.clinic as { avatar?: string } | undefined)?.avatar,
      phone: (membership.clinic as { phone?: string } | undefined)?.phone,
      role,
      clinicId: membership.clinic?.id,
    });
    if (
      cached &&
      cached.userId === session.user.id &&
      (cached.role === "secretary" || cached.clinicId)
    ) {
      const same = cached.role === role && cached.clinicId === membership.clinic?.id;
      if (same) return;
    }
    if (membership.role === "secretary") {
      navigate({ to: "/reception", replace: true });
      return;
    }
    if (membership.clinic) {
      // توجيه الطبيب إلى لوحة التحكم الرئيسية الخاصة به
      navigate({ to: "/doctor", replace: true });
      return;
    }
    const fullName = typeof meta.full_name === "string" ? meta.full_name : "";
    if (fullName) setName((n) => n || fullName);
    setNoClinic(true);
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    route();
  }, [route]);

  const doSignup = async () => {
    setSignupError("");
    const { error, licenseDigits, syndicateDigits } = validateDoctorSignup({
      name,
      phone,
      email,
      pass,
      medicalLicense,
      syndicateNo,
    });
    if (error) return setSignupError(error);
    setCreating(true);
    const cleanPhone = phone.trim().replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("20")
      ? cleanPhone
      : cleanPhone.startsWith("0")
        ? "20" + cleanPhone.slice(1)
        : "20" + cleanPhone;
    const res = await registerDoctorAccount({
      email: email.trim(),
      password: pass,
      doctor: name.trim(),
      specialtyId: spec,
      phone: formattedPhone,
      medicalLicense: licenseDigits,
      syndicateNo: syndicateDigits,
    });
    setCreating(false);
    if (!res.ok) return setSignupError(authErrorMessage(res.code));
    setPass("");
    setLoading(true);
    await route();
  };

  const signInWithGoogle = async () => {
    setGErr("");
    setGBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/doctor/login`,
      });
      if (result.error) {
        setGErr("تعذر الدخول بحساب Google دلوقتي. جرّب تاني أو ادخل بالبريد وكلمة السر.");
        setGBusy(false);
        return;
      }
      if (result.redirected) return;
      setGBusy(false);
      setLoading(true);
      await route();
    } catch (e) {
      setGErr(
        e instanceof Error
          ? e.message
          : "تعذر بدء تسجيل الدخول بحساب Google. حاول مرة أخرى أو استخدم البريد وكلمة السر.",
      );
      setGBusy(false);
    }
  };

  if (showStory && !loading && !noClinic) {
    return <StorySplash variant="doctor" onDone={() => setShowStory(false)} />;
  }

  if (loading) {
    return (
      <AppShell title="لوحة الطبيب" backTo="/">
        <LoadingState />
      </AppShell>
    );
  }

  if (noClinic) {
    const createQuickClinic = async () => {
      setSignupError("");
      const mobile = normalizeEgyptianMobile(phone);
      if (name.trim().length < 3) return setSignupError("اكتب اسم الطبيب بالكامل");
      if (!mobile) return setSignupError("اكتب رقم موبايل مصري صحيح (010/011/012/015)");
      setCreating(true);
      try {
        await svrCreateMyClinic({
          data: { doctor: name.trim(), specialtyId: spec, phone: "20" + mobile.slice(1) },
        });
        resetDoctorModeCache();
        setNoClinic(false);
        setLoading(true);
        await route();
      } catch {
        setSignupError("تعذر إنشاء العيادة دلوقتي. جرّب تاني.");
      } finally {
        setCreating(false);
      }
    };
    return (
      <AppShell title="جهّز عيادتك" backTo="/">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-base font-extrabold">خطوة واحدة وعيادتك تبقى جاهزة</p>
          <p className="mt-1 text-xs text-muted-foreground">
            أكّد اسمك وتخصصك ورقم الموبايل، وتقدر تكمّل باقي البروفايل والتوثيق من الإعدادات.
          </p>
          <div className="mt-4 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم الطبيب"
              className="min-h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
            />
            <select
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-border bg-background px-4 text-sm"
            >
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              dir="ltr"
              placeholder="01xxxxxxxxx"
              className="min-h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
            />
            {signupError && <p className="text-xs font-bold text-destructive">{signupError}</p>}
          </div>
          <button
            onClick={() => void createQuickClinic()}
            disabled={creating}
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3 text-sm font-extrabold text-primary-foreground disabled:opacity-60"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            افتح عيادتي
          </button>
          <Link
            to="/doctor-settings"
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-bold"
          >
            <BookOpen className="h-4 w-4" /> إعدادات كاملة
          </Link>
          <button
            onClick={async () => {
              await signOutStaff();
              setNoClinic(false);
            }}
            className="mt-2 w-full rounded-xl border border-border py-3 text-sm font-bold"
          >
            خروج
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="بوابة فريق العيادة" subtitle="طبيب • سكرتير • استقبال" backTo="/">
      <AuthModeToggle mode={mode} setMode={setMode} signupLabel="حساب طبيب جديد" />

      <div className="mt-4">
        {mode === "login" ? (
          <>
            <StaffAuth
              title="دخول الطبيب أو السكرتير أو الاستقبال"
              hint="الطبيب بيدخل على لوحة عيادته، والسكرتير/الاستقبال على دفتر الحجز والطابور مباشرة."
              onSignedIn={() => {
                setLoading(true);
                route();
              }}
            />
            <div className="mt-3">
              <button
                onClick={() => void signInWithGoogle()}
                disabled={gBusy}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-extrabold disabled:opacity-60"
              >
                {gBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
                المتابعة بحساب Google
              </button>
              {gErr && <p className="mt-2 text-xs font-bold text-destructive">{gErr}</p>}
            </div>
            <div className="mt-3 rounded-2xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
              <p className="font-extrabold text-foreground">سكرتير أو موظف استقبال؟</p>
              حسابك بيعمله الطبيب من «إعدادات العيادة ← حسابات السكرتير». خد منه البريد وكلمة السر
              وادخل بيهم هنا.
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-primary bg-primary-soft p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-xs font-bold leading-relaxed text-primary">
                  ٥ بيانات بس وحسابك يبقى جاهز. تقدر تكمّل باقي بيانات بروفايلك من الإعدادات بعد
                  الدخول.
                </p>
              </div>
            </div>

            <DoctorSignupFields
              name={name}
              setName={setName}
              spec={spec}
              setSpec={setSpec}
              phone={phone}
              setPhone={setPhone}
              email={email}
              setEmail={setEmail}
              pass={pass}
              setPass={setPass}
              medicalLicense={medicalLicense}
              setMedicalLicense={setMedicalLicense}
              syndicateNo={syndicateNo}
              setSyndicateNo={setSyndicateNo}
              signupError={signupError}
              licenseNoteClassName="mt-2 text-xs leading-relaxed text-muted-foreground"
            />

            <label className="mt-5 flex cursor-pointer items-start gap-2 rounded-2xl border border-border bg-card p-3 text-xs leading-relaxed">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span>
                قرأت وأوافق على{" "}
                <Link to="/terms" className="font-bold text-primary underline">
                  إخلاء المسؤولية الطبية وشروط الاستخدام
                </Link>
                . سند أداة تنظيم مواعيد فقط ولا تقدم استشارات طبية.
              </span>
            </label>
            <button
              onClick={doSignup}
              disabled={creating || !acceptedTerms}
              className="mt-3 w-full rounded-2xl gradient-primary py-4 text-base font-extrabold text-white shadow-soft disabled:opacity-60"
            >
              {creating ? "جاري الإنشاء…" : "إنشاء حساب العيادة الآن"}
            </button>
          </>
        )}
      </div>
    </AppShell>
  );
}
