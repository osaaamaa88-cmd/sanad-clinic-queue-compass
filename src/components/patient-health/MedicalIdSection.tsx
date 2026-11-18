import { Download, QrCode, Siren } from "lucide-react";
import type { MedicalId } from "@/lib/medical-id-card";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

type MedicalIdSectionProps = {
  medicalId: MedicalId;
  qrDataUrl: string;
  onMedicalIdChange: (patch: Partial<MedicalId>) => void;
  onDownload: () => void;
};

export function MedicalIdSection({
  medicalId,
  qrDataUrl,
  onMedicalIdChange,
  onDownload,
}: MedicalIdSectionProps) {
  return (
    <section className="mt-5 rounded-2xl border border-primary/20 bg-card p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/15 text-destructive">
          <Siren className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold">كارت طوارئ شاشة القفل (Medical ID)</h2>
          <p className="text-xs text-muted-foreground">جهّز معلومات تساعد المسعفين وقت الطوارئ</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold">فصيلة الدم</span>
          <select
            value={medicalId.bloodType}
            onChange={(event) => onMedicalIdChange({ bloodType: event.target.value })}
            className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">اختر فصيلة الدم (اختياري)</option>
            {BLOOD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold">الحساسية الدوائية</span>
          <textarea
            value={medicalId.allergies}
            onChange={(event) => onMedicalIdChange({ allergies: event.target.value })}
            maxLength={160}
            placeholder="مثال: حساسية من البنسلين"
            className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold">الأمراض المزمنة</span>
          <textarea
            value={medicalId.conditions}
            onChange={(event) => onMedicalIdChange({ conditions: event.target.value })}
            maxLength={160}
            placeholder="مثال: السكري، الربو"
            className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold">رقم هاتف الطوارئ</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={medicalId.emergencyPhone}
            onChange={(event) => onMedicalIdChange({ emergencyPhone: event.target.value })}
            maxLength={30}
            placeholder="رقم شخص يمكن التواصل معه"
            className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={onDownload}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground"
      >
        <Download className="h-4 w-4" /> إنشاء وتنزيل بطاقة الطوارئ
      </button>
      {qrDataUrl && (
        <div className="mt-4 rounded-2xl border border-primary/20 bg-secondary/40 p-4 text-center">
          <p className="flex items-center justify-center gap-2 text-sm font-extrabold">
            <QrCode className="h-4 w-4 text-primary" /> كود QR للطوارئ
          </p>
          <img
            src={qrDataUrl}
            alt="كود QR لكارت الطوارئ الطبي"
            className="mx-auto mt-3 h-40 w-40 rounded-xl bg-white p-2"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            اطبع الكود أو حطه في جيب محفظتك — أي حد يقدر يمسحه ويقرأ بيانات الطوارئ حتى لو الهاتف
            مقفول.
          </p>
        </div>
      )}
      <p className="mt-2 text-center text-xs text-muted-foreground">
        تُستخدم البيانات لإنشاء الصورة على جهازك ولا تُحفظ من هذه الصفحة.
      </p>
    </section>
  );
}
