import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  UserPlus,
  Stethoscope,
  Hourglass,
  BookOpen,
  Printer,
  RefreshCw,
  LogOut,
  QrCode,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { LoadingState } from "@/components/LoadingState";
import { NotificationsBell } from "@/components/NotificationsBell";
import { StaffAuth } from "@/components/StaffAuth";
import { HealthPassScanner } from "@/components/medical/HealthPassScanner";
import { AddPatientForm, type VisitType } from "@/components/reception/AddPatientForm";
import { LedgerRow } from "@/components/reception/LedgerRow";
import { useReceptionData } from "@/hooks/use-reception-data";
import { getSpecialty } from "@/lib/mock-data";

export const Route = createFileRoute("/reception")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "دفتر الحجز — سند" },
      { name: "description", content: "دفتر حجز العيادة: تسجيل المرضى وإدارة الدخول والانتظار." },
      { property: "og:title", content: "دفتر الحجز — سند" },
      { property: "og:description", content: "إدارة حجوزات العيادة بشكل دفتر ورقي بسيط." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reception,
});

function Reception() {
  const navigate = useNavigate();
  const {
    clinic,
    rows,
    loaded,
    signedIn,
    refreshing,
    fromCache,
    recentlyCalledIds,
    load,
    refresh,
    callPatient,
    setStatus,
    addWalkInPatient,
    bookFromPass,
    signOut,
  } = useReceptionData();
  const [showAdd, setShowAdd] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const handleAddPatient = async (name: string, phone: string, visitType: VisitType) => {
    const added = await addWalkInPatient(name, phone, visitType);
    if (added) setShowAdd(false);
    return added;
  };

  if (!loaded) {
    return (
      <AppShell title="دفتر الحجز" backTo="/">
        <LoadingState />
      </AppShell>
    );
  }

  if (!signedIn) {
    return (
      <AppShell title="دفتر الحجز" subtitle="دخول السكرتير أو الطبيب" backTo="/">
        <StaffAuth
          title="دخول فريق العيادة"
          hint="دفتر الحجز للسكرتير والطبيب فقط — المريض له الحجز والمتابعة فقط."
          onSignedIn={load}
          footer={
            <p className="mt-1 text-center text-xs text-muted-foreground">
              مفيش حساب؟ الطبيب هو اللي بينشئ حساب السكرتير من لوحة الطبيب.
            </p>
          }
        />
      </AppShell>
    );
  }

  if (!clinic) {
    return (
      <AppShell title="دفتر الحجز" backTo="/">
        <div className="mt-6 rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
            <Stethoscope className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-bold">لا توجد عيادة مربوطة بحسابك</p>
          <p className="mt-1 text-xs text-muted-foreground">
            من فضلك سجّل عيادتك من واجهة الطبيب أولاً، أو اطلب من الطبيب ربط حسابك بالعيادة.
          </p>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/doctor/login", replace: true });
            }}
            className="mt-4 w-full rounded-xl border border-border py-2.5 text-xs font-bold"
          >
            خروج
          </button>
        </div>
      </AppShell>
    );
  }

  const active = rows.filter((r) => r.status !== "cancelled");
  const waiting = active.filter((r) => r.status === "waiting").length;
  const done = active.filter((r) => r.status === "done").length;
  const sheet = rows.slice().sort((a, b) => a.queueNumber - b.queueNumber);
  const spec = clinic ? getSpecialty(clinic.specialtyId) : undefined;

  return (
    <AppShell
      title="دفتر الحجز"
      subtitle={clinic ? `عيادة ${clinic.doctor}` : ""}
      backTo="/"
      right={
        <div className="flex shrink-0 items-center gap-1.5">
          {clinic && <NotificationsBell audience="clinic" clinicId={clinic.id} />}
          <button
            onClick={() => setScanOpen(true)}
            aria-label="مسح كارت سند"
            title="مسح كارت سند"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-secondary"
          >
            <QrCode className="h-5 w-5" />
          </button>
          {scanOpen && (
            <HealthPassScanner onClose={() => setScanOpen(false)} onBook={bookFromPass} />
          )}
          <button
            onClick={() => clinic && refresh(clinic.id)}
            aria-label="إعادة تحميل البيانات"
            title="إعادة تحميل البيانات"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-secondary"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/doctor/login", replace: true });
            }}
            aria-label="خروج"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-secondary"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      }
    >
      {fromCache && (
        <p className="mb-3 rounded-xl bg-warning/15 px-3 py-2 text-center text-xs font-bold text-warning print:hidden">
          بنعرض آخر نسخة محفوظة من الدفتر — اضغط 🔄 لإعادة التحميل.
        </p>
      )}
      {/* Live queue + TV screen: coming soon */}
      <div className="rounded-2xl border-2 border-dashed border-border bg-card p-4 text-center print:hidden">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-secondary text-muted-foreground">
          <Hourglass className="h-5 w-5" />
        </div>
        <p className="mt-2 text-sm font-extrabold">الطابور المباشر وشاشة صالة الانتظار</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          حالياً الدفتر للمرضى الحاضرين في العيادة فقط — سجّلهم يدوي واطبع كشف اليوم.
        </p>
      </div>

      {/* Top controls */}
      <div className="mt-3 print:hidden">
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-3 text-sm font-extrabold text-white shadow-soft"
        >
          <UserPlus className="h-4 w-4" /> إضافة مريض حاضر
        </button>
      </div>
      <button
        onClick={() => window.print()}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-extrabold print:hidden"
      >
        <Printer className="h-4 w-4 text-primary" /> طباعة جدول كشف اليوم
      </button>

      {showAdd && <AddPatientForm onSubmit={handleAddPatient} />}

      <div className="mt-4 grid grid-cols-2 gap-2 print:hidden">
        <div className="rounded-2xl border border-border/60 bg-card/75 p-3 text-center backdrop-blur-xl">
          <div className="text-xs font-bold text-muted-foreground">منتظر</div>
          <div className="mt-1 text-lg font-black text-primary">{waiting}</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/75 p-3 text-center backdrop-blur-xl">
          <div className="text-xs font-bold text-muted-foreground">كشوفات منجزة</div>
          <div className="mt-1 text-lg font-black text-success">{done}</div>
        </div>
      </div>

      {/* Paper sheet */}
      <div className="mt-4 overflow-hidden rounded-2xl border-2 border-border bg-card shadow-soft">
        <div className="flex items-center gap-2 border-b-2 border-border bg-secondary px-4 py-3">
          <BookOpen className="h-4 w-4 text-primary" />
          <p className="text-sm font-extrabold">
            دفتر حجز النهارده {clinic ? `— ${clinic.doctor}${spec ? ` (${spec.name})` : ""}` : ""}
          </p>
          <span className="mr-auto text-xs text-muted-foreground">{sheet.length} سطر</span>
        </div>
        <div className="grid grid-cols-[2.5rem_1fr_4.5rem_3.5rem] gap-2 border-b border-border bg-secondary/60 px-3 py-2 text-xs font-bold text-muted-foreground">
          <span>الدور</span>
          <span>اسم المريض / الهاتف</span>
          <span>نوع الزيارة</span>
          <span>الحالة</span>
        </div>

        {sheet.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            الدفتر فاضي — لسه محدش حجز النهارده.
          </p>
        )}

        {sheet.map((r, i) => (
          <LedgerRow
            key={r.id}
            booking={r}
            index={i}
            recentlyCalled={recentlyCalledIds.has(r.id)}
            onSetStatus={setStatus}
            onCallPatient={callPatient}
          />
        ))}
      </div>
    </AppShell>
  );
}
