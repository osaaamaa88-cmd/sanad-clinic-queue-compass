import type { RefObject } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { KYC_DOCUMENT_LIMIT } from "@/lib/kyc-document";
import { compareName, compareNumber } from "@/lib/kyc-match";
import type { KycScanResult } from "@/lib/kyc-scan";
import { KycMatchBadge } from "./KycMatchBadge";

export function DoctorKycSection({
  hasLicenseDoc,
  kycFile,
  setKycFile,
  uploadingKyc,
  kycAiConsent,
  setKycAiConsent,
  scanningKyc,
  kycScan,
  setKycScan,
  kycScanError,
  setKycScanError,
  kycFileInput,
  onScanKycFile,
  onUploadKycDocument,
  name,
  medicalLicense,
  syndicateNo,
}: {
  hasLicenseDoc: boolean;
  kycFile: File | null;
  setKycFile: (file: File | null) => void;
  uploadingKyc: boolean;
  kycAiConsent: boolean;
  setKycAiConsent: (value: boolean) => void;
  scanningKyc: boolean;
  kycScan: KycScanResult | null;
  setKycScan: (result: KycScanResult | null) => void;
  kycScanError: string;
  setKycScanError: (message: string) => void;
  kycFileInput: RefObject<HTMLInputElement | null>;
  onScanKycFile: (file: File) => void;
  onUploadKycDocument: () => void;
  name: string;
  medicalLicense: string;
  syndicateNo: string;
}) {
  return (
    <section className="mb-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-extrabold">مستند التوثيق المهني</h2>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        ارفع صورة واضحة أو ملف PDF للترخيص. يُحفظ المستند في مساحة خاصة ولا يطّلع عليه إلا فريق
        التوثيق عبر رابط مؤقت.
      </p>
      {hasLicenseDoc ? (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-success/30 bg-success/10 p-3 text-xs font-bold text-success">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>تم استلام مستند التوثيق وهو قيد التدقيق لدى فريق سند</span>
          </div>
          <span className="text-[11px] font-normal text-muted-foreground">
            يمكنك رفع بديل أدناه
          </span>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs font-bold text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>لم يتم رفع مستند التوثيق بعد — ارفع صورة الكارنيه لبدء المراجعة.</span>
        </div>
      )}
      <label className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-secondary/50 p-3 text-xs leading-relaxed text-muted-foreground">
        <input
          type="checkbox"
          checked={kycAiConsent}
          onChange={(event) => {
            const consented = event.target.checked;
            setKycAiConsent(consented);
            setKycScan(null);
            setKycScanError(
              consented && kycFile?.type.startsWith("image/")
                ? "أعد اختيار الصورة لبدء الفحص بعد الموافقة."
                : !consented && kycFile?.type.startsWith("image/")
                  ? "يمكنك رفع الصورة للمراجعة اليدوية. الفحص الآلي متوقف دون موافقتك."
                  : kycFile?.type === "application/pdf"
                    ? "ملف PDF لا يُفحص آلياً؛ ارفعه ليتمكن فريق التوثيق من مراجعته."
                    : "",
            );
          }}
          disabled={scanningKyc}
          className="mt-0.5 accent-primary"
        />
        <span>
          أوافق على إرسال صورة المستند إلى Google Gemini عبر خادم سند لاستخراج البيانات الظاهرة فقط.
          القراءة مبدئية ولا تثبت الأصالة أو التوثيق؛ فريق سند يراجع المستند قبل منح الشارة. ملفات
          PDF لا تُرسل للفحص الآلي.
        </span>
      </label>
      <input
        ref={kycFileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        disabled={scanningKyc || uploadingKyc}
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          setKycFile(file);
          setKycScan(null);
          setKycScanError("");
          if (!file) return;
          if (file.size > KYC_DOCUMENT_LIMIT) {
            setKycFile(null);
            event.target.value = "";
            toast.error("حجم المستند أكبر من الحد المسموح");
            return;
          }
          if (file.type.startsWith("image/")) {
            if (kycAiConsent) {
              void onScanKycFile(file);
            } else {
              setKycScanError(
                "يمكنك رفع الصورة للمراجعة اليدوية. للفحص الآلي، وافق أولاً ثم أعد اختيارها.",
              );
            }
          } else {
            setKycScanError("ملف PDF لا يُفحص آلياً؛ ارفعه ليتمكن فريق التوثيق من مراجعته.");
          }
        }}
        className="mt-3 w-full text-xs text-muted-foreground file:mr-2 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-bold"
      />
      {!kycAiConsent && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          الفحص الآلي اختياري؛ بعد الموافقة أعد اختيار الصورة لبدء القراءة. يمكنك رفع المستند
          للمراجعة اليدوية دون إرسال الصورة إلى خدمة الذكاء الاصطناعي.
        </p>
      )}
      {kycFile && <p className="mt-2 truncate text-xs text-muted-foreground">{kycFile.name}</p>}
      <button
        type="button"
        onClick={onUploadKycDocument}
        disabled={!kycFile || uploadingKyc || scanningKyc}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3 text-sm font-extrabold text-white disabled:opacity-60"
      >
        {uploadingKyc ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        {uploadingKyc ? "جاري رفع المستند..." : "رفع مستند التوثيق"}
      </button>
      {scanningKyc && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary-soft/50 p-3 text-xs font-bold text-primary">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>جاري قراءة البيانات الظاهرة في المستند آلياً...</span>
        </div>
      )}
      {kycScanError && (
        <p className="mt-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs font-bold text-warning">
          {kycScanError}
        </p>
      )}
      {kycScan?.found && (
        <div className="mt-4 space-y-3 rounded-xl border border-border bg-secondary/50 p-3.5 text-xs">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
            <div className="flex items-center gap-1.5 font-black">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>قراءة أولية للمستند</span>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
              {kycScan.docType === "syndicate_card"
                ? "كارنيه نقابة الأطباء"
                : kycScan.docType === "practice_license"
                  ? "ترخيص مزاولة المهنة"
                  : kycScan.docType === "national_id"
                    ? "بطاقة رقم قومي"
                    : "مستند مهني"}
            </span>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-2 text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              هذه قراءة آلية للمساعدة فقط؛ لا تتحقق من الأختام أو السجلات الرسمية ولا تمنح شارة
              التوثيق. القرار النهائي لفريق سند.
            </span>
          </div>
          {kycScan.imageQuality !== "clear" && (
            <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-2 font-bold text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {kycScan.imageQuality === "blurry"
                  ? "الصورة قد تكون غير واضحة؛ جرّب تصوير المستند بإضاءة أفضل."
                  : kycScan.imageQuality === "cropped"
                    ? "قد تكون بعض أطراف المستند غير ظاهرة؛ جرّب صورة كاملة."
                    : kycScan.imageQuality === "glare"
                      ? "قد يوجد انعكاس ضوئي؛ جرّب التصوير دون فلاش."
                      : kycScan.imageQuality === "unreadable"
                        ? "تعذرت قراءة الصورة بوضوح؛ جرّب صورة أوضح."
                        : "لم يتسنّ تقييم وضوح الصورة آلياً."}
              </span>
            </div>
          )}
          {kycScan.fullName && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card p-2">
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground">الاسم المستخرج</p>
                <p className="break-words font-black text-foreground">{kycScan.fullName}</p>
              </div>
              <KycMatchBadge result={compareName(name, kycScan.fullName)} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {kycScan.syndicateNo && (
              <div className="space-y-1 rounded-lg border border-border/50 bg-card p-2">
                <p className="text-[10px] text-muted-foreground">رقم القيد المستخرج</p>
                <p className="font-mono font-black text-foreground" dir="ltr">
                  {kycScan.syndicateNo}
                </p>
                <KycMatchBadge result={compareNumber(syndicateNo, kycScan.syndicateNo)} />
              </div>
            )}
            {kycScan.licenseNo && (
              <div className="space-y-1 rounded-lg border border-border/50 bg-card p-2">
                <p className="text-[10px] text-muted-foreground">رقم الترخيص المستخرج</p>
                <p className="font-mono font-black text-foreground" dir="ltr">
                  {kycScan.licenseNo}
                </p>
                <KycMatchBadge result={compareNumber(medicalLicense, kycScan.licenseNo)} />
              </div>
            )}
          </div>
          {kycScan.nationalIdMasked && (
            <div className="rounded-lg border border-border/50 bg-card p-2">
              <p className="text-[10px] text-muted-foreground">
                الرقم القومي (مع إخفاء معظم الأرقام)
              </p>
              <p className="font-mono font-black text-foreground" dir="ltr">
                {kycScan.nationalIdMasked}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {kycScan.nationalIdFormatValid
                  ? "التنسيق وتاريخ الميلاد الظاهران صالحان مبدئياً، وهذا لا يثبت صحة الرقم أو الهوية."
                  : "تعذر تأكيد التنسيق أو تاريخ الميلاد الظاهر؛ راجع البطاقة يدوياً."}
              </p>
            </div>
          )}
          {(kycScan.grade || kycScan.specialty || kycScan.branch) && (
            <div className="rounded-lg border border-border/50 bg-card p-2 text-[11px] text-muted-foreground">
              {kycScan.grade && (
                <span className="font-bold text-foreground">الدرجة: {kycScan.grade} </span>
              )}
              {kycScan.specialty && <span>• التخصص: {kycScan.specialty} </span>}
              {kycScan.branch && <span>• نقابة {kycScan.branch}</span>}
            </div>
          )}
        </div>
      )}
      {kycScan && !kycScan.found && (
        <p className="mt-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs font-bold text-warning">
          لم يُتعرّف على مستند مهني بوضوح. يمكنك رفعه ليُراجع يدوياً.
        </p>
      )}
    </section>
  );
}
