import { parseReading, bloodPressureError, sugarError } from "@/lib/input-validation";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Download, Droplet, Heart, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PatientMedicalProfile } from "@/components/PatientMedicalProfile";
import { BloodPressureCard } from "@/components/patient-health/BloodPressureCard";
import { BloodSugarCard } from "@/components/patient-health/BloodSugarCard";
import { MedicalIdSection } from "@/components/patient-health/MedicalIdSection";
import { evaluateBP, evaluateSugar, type SugarState } from "@/lib/vitals-evaluation";
import { loadReadings, saveReadings, type Reading } from "@/lib/health-readings";
import {
  loadMedicalId,
  renderMedicalId,
  saveMedicalId,
  type MedicalId,
} from "@/lib/medical-id-card";
import { toast } from "sonner";

export const Route = createFileRoute("/patient/health")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "سند — حاسبة ومؤشرات الصحة" },
      { name: "description", content: "احسب ضغط الدم والسكر واحفظ قراءاتك في ملفك الطبي." },
    ],
  }),
  component: HealthTracker,
});

function HealthTracker() {
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [sugar, setSugar] = useState("");
  const [sugarState, setSugarState] = useState<SugarState>("fasting");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [medicalId, setMedicalId] = useState<MedicalId>(loadMedicalId);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    try {
      saveMedicalId(medicalId);
    } catch {
      /* ignore */
    }
    const filled = Object.values(medicalId).some((value) => value.trim());
    if (!filled) {
      setQrDataUrl("");
      return;
    }
    let cancelled = false;
    const payload = [
      `سند — كارت طوارئ`,
      medicalId.bloodType && `فصيلة الدم: ${medicalId.bloodType}`,
      medicalId.allergies && `الحساسية: ${medicalId.allergies}`,
      medicalId.conditions && `الأمراض المزمنة: ${medicalId.conditions}`,
      medicalId.emergencyPhone && `هاتف الطوارئ: ${medicalId.emergencyPhone}`,
    ]
      .filter(Boolean)
      .join("\n");
    import("qrcode")
      .then((mod) =>
        mod.default.toDataURL(payload, {
          width: 512,
          margin: 1,
          color: { dark: "#0F172A", light: "#FFFFFF" },
        }),
      )
      .then((d) => {
        if (!cancelled) setQrDataUrl(d);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [medicalId]);

  useEffect(() => {
    setReadings(loadReadings());
  }, []);

  const sysP = parseReading(sys);
  const diaP = parseReading(dia);
  const sysN = sysP ?? 0;
  const diaN = diaP ?? 0;
  const bpErr = bloodPressureError(sysP, diaP);
  const bpValid = sysP != null && diaP != null && !bpErr;
  const bp = bpValid ? evaluateBP(sysN, diaN) : null;

  const sugarP = parseReading(sugar);
  const sugarN = sugarP ?? 0;
  const sugErr = sugarError(sugarP);
  const sugarValid = sugarP != null && !sugErr;
  const sug = sugarValid ? evaluateSugar(sugarN, sugarState) : null;

  function saveBP() {
    if (!bp) return;
    const next: Reading[] = [
      { kind: "bp" as const, sys: sysN, dia: diaN, label: bp.label, at: new Date().toISOString() },
      ...readings,
    ].slice(0, 50);
    setReadings(next);
    saveReadings(next);
  }
  function saveSugar() {
    if (!sug) return;
    const next: Reading[] = [
      {
        kind: "sugar" as const,
        value: sugarN,
        state: sugarState,
        label: sug.label,
        at: new Date().toISOString(),
      },
      ...readings,
    ].slice(0, 50);
    setReadings(next);
    saveReadings(next);
  }
  function removeAt(i: number) {
    const next = readings.filter((_, idx) => idx !== i);
    setReadings(next);
    saveReadings(next);
  }

  async function downloadMedicalId() {
    if (!Object.values(medicalId).some((value) => value.trim())) {
      toast.error("أدخل معلومة واحدة على الأقل لإنشاء البطاقة");
      return;
    }
    try {
      const canvas = renderMedicalId(medicalId);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (image) => (image ? resolve(image) : reject(new Error("تعذر إنشاء ملف الصورة"))),
          "image/png",
        ),
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "sanad-medical-id.png";
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("تم تنزيل بطاقة الطوارئ");
    } catch (error) {
      console.error("[Medical ID] Image generation failed", error);
      toast.error("تعذر إنشاء البطاقة. حاول مرة أخرى.");
    }
  }

  /** تصدير السجل الصحي كاملاً: كل القراءات + بطاقة الطوارئ — ملك المريض بالكامل. */
  function exportHealthRecord() {
    try {
      const record = {
        app: "سند | SANAD",
        type: "sanad-health-record",
        version: 1,
        exportedAt: new Date().toISOString(),
        medicalId: {
          bloodType: medicalId.bloodType,
          allergies: medicalId.allergies,
          conditions: medicalId.conditions,
          emergencyPhone: medicalId.emergencyPhone,
        },
        readings: readings.map((r) =>
          r.kind === "bp"
            ? { kind: "bp", systolic: r.sys, diastolic: r.dia, label: r.label, at: r.at }
            : {
                kind: "sugar",
                value: r.value,
                state: r.state,
                label: r.label,
                at: r.at,
              },
        ),
      };
      const blob = new Blob([JSON.stringify(record, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "sanad-health-record.json";
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("تم تصدير السجل الصحي كاملاً");
    } catch (error) {
      console.error("[Health Record] Export failed", error);
      toast.error("تعذر تصدير السجل. حاول مرة أخرى.");
    }
  }

  return (
    <AppShell
      title="حاسبة ومؤشرات الصحة"
      subtitle="ضغط الدم والسكر — نتائج استرشادية"
      backTo="/patient"
      tone="primary"
      right={
        <div className="grid h-10 w-10 place-items-center rounded-full bg-white/20">
          <Activity className="h-5 w-5" />
        </div>
      }
    >
      <PatientMedicalProfile
        vitalsContent={
          <>
            <BloodPressureCard
              sys={sys}
              dia={dia}
              sysN={sysN}
              diaN={diaN}
              bp={bp}
              bpErr={bpErr}
              onSysChange={setSys}
              onDiaChange={setDia}
              onSaveBP={saveBP}
            />
            <BloodSugarCard
              sugar={sugar}
              sugarN={sugarN}
              sugarState={sugarState}
              sug={sug}
              sugErr={sugErr}
              onSugarChange={setSugar}
              onSugarStateChange={setSugarState}
              onSaveSugar={saveSugar}
            />
          </>
        }
        recordsContent={
          <>
            <MedicalIdSection
              medicalId={medicalId}
              qrDataUrl={qrDataUrl}
              onMedicalIdChange={(patch) => setMedicalId({ ...medicalId, ...patch })}
              onDownload={downloadMedicalId}
            />

            {/* Data ownership: full health-record export + ownership notice */}
            <section className="mt-5 rounded-2xl border border-primary/20 bg-card p-4 shadow-soft">
              <button
                type="button"
                onClick={exportHealthRecord}
                className="flex w-full items-center justify-center gap-2 rounded-xl gradient-primary px-4 py-3.5 text-sm font-extrabold text-white shadow-soft"
              >
                <Download className="h-4 w-4" /> تصدير السجل الصحي كاملاً (JSON / نصي)
              </button>
              <p className="mt-3 rounded-xl bg-success/10 px-3 py-2 text-center text-xs font-bold leading-relaxed text-success">
                بياناتك الصحية ملك لك بالكامل ومحفوظة محلياً — لك حرية تصديرها أو حذفها في أي وقت
                بنقرة واحدة.
              </p>
            </section>

            {/* Saved log */}
            <section className="mt-5">
              <h3 className="mb-2 text-sm font-bold">ملفي الطبي — آخر القراءات</h3>
              {readings.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
                  لسه ما فيش قراءات محفوظة.
                </div>
              ) : (
                <ul className="space-y-2">
                  {readings.map((r, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-xs"
                    >
                      <div
                        className={`grid h-8 w-8 place-items-center rounded-lg ${
                          r.kind === "bp"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-primary-soft text-primary"
                        }`}
                      >
                        {r.kind === "bp" ? (
                          <Heart className="h-4 w-4" />
                        ) : (
                          <Droplet className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">
                          {r.kind === "bp"
                            ? `ضغط ${r.sys}/${r.dia} — ${r.label}`
                            : `سكر ${r.value} mg/dL (${
                                r.state === "fasting"
                                  ? "صائم"
                                  : r.state === "postmeal"
                                    ? "بعد الأكل"
                                    : "عشوائي"
                              }) — ${r.label}`}
                        </p>
                        <p className="text-muted-foreground">
                          {new Date(r.at).toLocaleString("ar-EG")}
                        </p>
                      </div>
                      <button
                        onClick={() => removeAt(i)}
                        aria-label="حذف"
                        className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-muted-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="mt-6 rounded-xl bg-secondary/50 p-3 text-center text-xs text-muted-foreground">
              النتائج استرشادية بناءً على المعايير الطبية المعتمدة ولا تغني عن الاستشارة الطبية.
            </p>
          </>
        }
        appointmentsContent={
          <p className="mt-6 rounded-xl bg-secondary/50 p-3 text-center text-xs text-muted-foreground">
            لا توجد حجوزات مجدولة حالياً. يمكنك البحث عن عيادات من صفحة البحث.
          </p>
        }
      />
    </AppShell>
  );
}
