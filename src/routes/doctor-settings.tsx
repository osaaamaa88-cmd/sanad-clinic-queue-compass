import { APP_VERSION_LABEL } from "@/lib/app-version";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { BookOpen, CheckCircle2, Clock, LogOut, Save, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LoadingState } from "@/components/LoadingState";
import { StaffAuth } from "@/components/StaffAuth";
import { AuthModeToggle } from "@/components/doctor-settings/AuthModeToggle";
import { DoctorKycSection } from "@/components/doctor-settings/DoctorKycSection";
import { DoctorPreferences } from "@/components/doctor-settings/DoctorPreferences";
import { DoctorProfileForm } from "@/components/doctor-settings/DoctorProfileForm";
import { DoctorQuickTools } from "@/components/doctor-settings/DoctorQuickTools";
import { DoctorSignupForm } from "@/components/doctor-settings/DoctorSignupForm";
import { SecretarySection } from "@/components/doctor-settings/SecretarySection";
import { useDoctorSettings } from "@/hooks/use-doctor-settings";

export const Route = createFileRoute("/doctor-settings")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "إعدادات العيادة — سند" },
      {
        name: "description",
        content: "دخول الطبيب لإدارة بروفايل عيادته وحساب السكرتير ومتابعة التوثيق.",
      },
      { property: "og:title", content: "إعدادات العيادة — سند" },
      { property: "og:description", content: "سجّل عيادتك على سند وأدر بياناتك وحساب السكرتير." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DoctorSettings,
});

function DoctorSettings() {
  const {
    navigate,
    loading,
    signedIn,
    role,
    mode,
    setMode,
    clinicId,
    isVerified,
    kycFile,
    setKycFile,
    hasLicenseDoc,
    uploadingKyc,
    kycAiConsent,
    setKycAiConsent,
    scanningKyc,
    kycScan,
    setKycScan,
    kycScanError,
    setKycScanError,
    kycFileInput,
    name,
    setName,
    spec,
    setSpec,
    street,
    setStreet,
    building,
    setBuilding,
    floor,
    setFloor,
    area,
    setArea,
    phone,
    setPhone,
    price,
    setPrice,
    available,
    setAvailable,
    saved,
    saving,
    justSubmitted,
    email,
    setEmail,
    pass,
    setPass,
    medicalLicense,
    setMedicalLicense,
    syndicateNo,
    setSyndicateNo,
    signupError,
    creating,
    secretaries,
    secName,
    setSecName,
    secEmail,
    setSecEmail,
    secPass,
    setSecPass,
    secError,
    secBusy,
    refresh,
    save,
    doSignup,
    addSecretary,
    scanKycFile,
    uploadKycDocument,
    signOut,
  } = useDoctorSettings();

  if (loading) {
    return (
      <AppShell title="إعدادات العيادة" backTo="/doctor">
        <LoadingState />
      </AppShell>
    );
  }

  // Not signed in → login or create account
  if (!signedIn) {
    return (
      <AppShell title="حساب الطبيب" subtitle="دخول أو إنشاء حساب" backTo="/doctor">
        <AuthModeToggle mode={mode} setMode={setMode} signupLabel="حساب جديد" />

        <div className="mt-4">
          {mode === "login" ? (
            <StaffAuth
              title="دخول الطبيب أو السكرتير"
              hint="استخدم البريد وكلمة السر اللي سجلت بيهم."
              onSignedIn={refresh}
            />
          ) : (
            <DoctorSignupForm
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
              creating={creating}
              onSubmit={doSignup}
            />
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
          <button
            onClick={signOut}
            className="mt-2 w-full rounded-xl border border-border py-3 text-sm font-bold"
          >
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
      {clinicId && <DoctorQuickTools clinicId={clinicId} />}
      {clinicId && !isVerified && (
        <div className="mb-4 rounded-2xl border border-warning bg-warning/10 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/20 text-warning">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-foreground">حسابك قيد التدقيق المهني</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                حسابك قيد التدقيق المهني: تم استلام بيانات ترخيص مزاولة المهنة وجاري التحقق من السجل
                النقابي لمنحك شارة التوثيق. لحد ما يتم التوثيق، عيادتك مش هتظهر للمرضى في البحث أو
                الخريطة.
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
              <p className="mt-1 text-xs text-muted-foreground">
                عيادتك ظاهرة للمرضى في البحث والخريطة.
              </p>
            </div>
          </div>
        </div>
      )}
      {clinicId && role === "doctor" && (
        <DoctorKycSection
          hasLicenseDoc={hasLicenseDoc}
          kycFile={kycFile}
          setKycFile={setKycFile}
          uploadingKyc={uploadingKyc}
          kycAiConsent={kycAiConsent}
          setKycAiConsent={setKycAiConsent}
          scanningKyc={scanningKyc}
          kycScan={kycScan}
          setKycScan={setKycScan}
          kycScanError={kycScanError}
          setKycScanError={setKycScanError}
          kycFileInput={kycFileInput}
          onScanKycFile={scanKycFile}
          onUploadKycDocument={uploadKycDocument}
          name={name}
          medicalLicense={medicalLicense}
          syndicateNo={syndicateNo}
        />
      )}

      {/* Availability */}
      <h2 className="mb-3 mt-2 text-base font-bold">حالة العيادة</h2>
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
          onClick={() => {
            setAvailable((v) => !v);
            toast.info(
              available
                ? "العيادة هتتبقى مقفولة بعد الحفظ"
                : "فعّلت الإتاحة — اضغط «حفظ التعديلات» عشان تظهر للمرضى",
            );
          }}
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

      <DoctorProfileForm
        name={name}
        setName={setName}
        spec={spec}
        setSpec={setSpec}
        area={area}
        setArea={setArea}
        street={street}
        setStreet={setStreet}
        building={building}
        setBuilding={setBuilding}
        floor={floor}
        setFloor={setFloor}
        phone={phone}
        setPhone={setPhone}
        price={price}
        setPrice={setPrice}
      />

      <SecretarySection
        secretaries={secretaries}
        secName={secName}
        setSecName={setSecName}
        secEmail={secEmail}
        setSecEmail={setSecEmail}
        secPass={secPass}
        setSecPass={setSecPass}
        secError={secError}
        secBusy={secBusy}
        onAddSecretary={addSecretary}
      />

      <button
        onClick={save}
        disabled={saving}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-4 text-base font-extrabold text-white shadow-soft disabled:opacity-60"
      >
        <Save className="h-5 w-5" />{" "}
        {saving ? "جاري الحفظ…" : saved ? "تم الحفظ ✓" : "حفظ التعديلات"}
      </button>

      {justSubmitted && !isVerified && (
        <div className="mt-4 rounded-2xl border border-primary bg-primary-soft p-4 text-sm text-primary">
          تم تسجيل عيادتك بنجاح في فترة البيتا التجريبية، وحسابك قيد التفعيل من إدارة سند.
        </div>
      )}
      <DoctorPreferences />
      <p className="mt-6 text-center text-xs text-muted-foreground" dir="ltr">
        SANAD {APP_VERSION_LABEL} · Stable
      </p>
    </AppShell>
  );
}
