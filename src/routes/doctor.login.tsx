import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Sparkles, Lock, Loader2, BookOpen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StaffAuth, authErrorMessage } from "@/components/StaffAuth";
import { supabase } from "@/integrations/supabase/client";
import { specialties, getMyClinicMembership, registerDoctorAccount, signOutStaff } from "@/lib/mock-data";
import { getCachedProfile, saveCachedProfile } from "@/lib/user-profile-cache";

export const Route = createFileRoute("/doctor/login")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "دخول الطبيب — سَنَد" },
      { name: "description", content: "دخول الطبيب لبروفايل عيادته على سَنَد، أو إنشاء حساب عيادة جديد." },
      { property: "og:title", content: "دخول الطبيب — سَنَد" },
      { property: "og:description", content: "سجّل عيادتك على سَنَد وافتح بروفايلك التفاعلي." },
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
  const [signupError, setSignupError] = useState("");
  const [creating, setCreating] = useState(false);

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
      if (cached.role === "secretary") navigate({ to: "/reception" });
      else if (cached.clinicId) navigate({ to: "/patient/clinic/$id", params: { id: cached.clinicId } });
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
    if (cached && cached.userId === session.user.id && (cached.role === "secretary" || cached.clinicId)) {
      const same = cached.role === role && cached.clinicId === membership.clinic?.id;
      if (same) return;
    }
    if (membership.role === "secretary") {
      navigate({ to: "/reception" });
      return;
    }
    if (membership.clinic) {
      // Doctor's default dashboard = the new interactive profile
      navigate({ to: "/patient/clinic/$id", params: { id: membership.clinic.id } });
      return;
    }
    setNoClinic(true);
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    route();
  }, [route]);

  const doSignup = async () => {
    setSignupError("");
    if (!name.trim()) return setSignupError("من فضلك اكتب اسم الطبيب");
    if (!phone.trim()) return setSignupError("من فضلك اكتب رقم الموبايل / الواتساب");
    if (!email.trim()) return setSignupError("من فضلك اكتب البريد الإلكتروني");
    if (pass.length < 6) return setSignupError("كلمة السر لازم تكون ٦ حروف أو أرقام على الأقل");
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
    setPass("");
    setLoading(true);
    await route();
  };

  if (loading) {
    return (
      <AppShell title="لوحة الطبيب" backTo="/">
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> جاري التحميل…
        </div>
      </AppShell>
    );
  }

  if (noClinic) {
    return (
      <AppShell title="حساب الطبيب" backTo="/">
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-sm font-bold">مفيش عيادة مربوطة بحسابك</p>
          <p className="mt-1 text-xs text-muted-foreground">اكمل بيانات عيادتك من صفحة الإعدادات.</p>
          <Link
            to="/doctor-settings"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3 text-sm font-extrabold text-white"
          >
            <BookOpen className="h-4 w-4" /> إعدادات العيادة
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
    <AppShell title="حساب الطبيب" subtitle="دخول أو إنشاء حساب" backTo="/">
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
            onSignedIn={() => {
              setLoading(true);
              route();
            }}
          />
        ) : (
          <>
            <div className="rounded-2xl border border-primary bg-primary-soft p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-xs font-bold leading-relaxed text-primary">
                  ٥ بيانات بس وحسابك يبقى جاهز. تقدر تكمّل باقي بيانات بروفايلك من الإعدادات بعد الدخول.
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
