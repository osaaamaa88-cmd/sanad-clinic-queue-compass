import { useState } from "react";
import {
  Bluetooth,
  Download,
  Loader2,
  Plus,
  Printer,
  Send,
  Star,
  Trash2,
  X,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { downloadRx, printRxBluetooth } from "@/lib/rx-output";
import {
  DOSE_PRESETS,
  addFavorite,
  doseForForm,
  getFavorites,
  searchDrugs,
} from "@/lib/egypt-drugs";
import type { RxItem, RxPayload } from "@/lib/chat";
import { printRx } from "@/lib/rx-print";

export function RxComposer({
  defaults,
  onClose,
  onSend,
}: {
  defaults: Pick<
    RxPayload,
    "patient" | "doctor" | "specialty" | "clinicAddress" | "clinicPhone"
  > & { clinicHours?: string };
  onClose: () => void;
  onSend?: (rx: RxPayload) => Promise<boolean>;
}) {
  const [patient, setPatient] = useState(defaults.patient);
  const [age, setAge] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [items, setItems] = useState<RxItem[]>([]);
  const [q, setQ] = useState("");
  const [dose, setDose] = useState(DOSE_PRESETS[0]);
  const [advice, setAdvice] = useState("");
  const [tests, setTests] = useState("");
  const [specialty, setSpecialty] = useState(defaults.specialty ?? "");
  const [hours, setHours] = useState(
    () =>
      (typeof window !== "undefined" && localStorage.getItem("sanad-rx-hours")) ||
      defaults.clinicHours ||
      "",
  );
  const [busy, setBusy] = useState(false);
  const [btBusy, setBtBusy] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [favs, setFavs] = useState<string[]>(() => getFavorites());
  const results = searchDrugs(q);

  const add = (name: string, form?: string) => {
    const n = name.trim();
    if (!n) return;
    const d = (form && dose === DOSE_PRESETS[0] && doseForForm(form)) || dose;
    setItems((p) => [...p, { name: n, dose: d }]);
    addFavorite(n);
    setFavs(getFavorites());
    setQ("");
  };
  const build = (): RxPayload => {
    try {
      localStorage.setItem("sanad-rx-hours", hours);
    } catch {
      /* ignore */
    }
    return {
      ...defaults,
      specialty: specialty || defaults.specialty,
      clinicHours: hours,
      patient,
      age,
      diagnosis,
      items,
      advice,
      tests,
      date: new Date().toLocaleDateString("ar-EG"),
    };
  };
  const valid = patient.trim() && items.length > 0;
  const need = () => {
    if (!patient.trim()) {
      toast.error("اكتب اسم المريض الأول");
      return false;
    }
    if (!items.length) {
      toast.error("ضيف دواء واحد على الأقل");
      return false;
    }
    return true;
  };

  async function showRxQr() {
    if (!need()) return;
    try {
      const rx = build();
      const encoded = encodeURIComponent(JSON.stringify({ t: "sanad-rx", v: 1, rx }));
      const url = `${window.location.origin}/patient/meds?rx=${encoded}`;
      const mod = await import("qrcode");
      const qr = await mod.default.toDataURL(url, {
        width: 640,
        margin: 1,
        errorCorrectionLevel: "L",
        color: { dark: "#0F172A", light: "#FFFFFF" },
      });
      setQrDataUrl(qr);
    } catch {
      toast.error("تعذر إنشاء رمز QR");
    }
  }
  const btn =
    "flex flex-col items-center justify-center gap-1 rounded-xl border border-primary py-2.5 text-xs font-bold text-primary disabled:opacity-50";

  const input =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">💊 روشتة جديدة</h2>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input
            className={`${input} col-span-2`}
            placeholder="اسم المريض"
            value={patient}
            onChange={(e) => setPatient(e.target.value)}
          />
          <input
            className={input}
            placeholder="السن"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </div>
        <input
          className={`${input} mt-2`}
          placeholder="التشخيص"
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            className={input}
            placeholder="تخصص الطبيب (اختياري)"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          />
          <input
            className={input}
            placeholder="أيام ومواعيد العمل (اختياري)"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </div>

        <p className="mt-4 mb-1 text-xs font-bold text-muted-foreground">الجرعة للدواء القادم</p>
        <select className={input} value={dose} onChange={(e) => setDose(e.target.value)}>
          {DOSE_PRESETS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>

        <div className="relative mt-2">
          <input
            dir="ltr"
            className={input}
            placeholder="ابحث بالاسم أو المادة… (Aug, بانادول)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(q);
              }
            }}
          />
          {(results.length > 0 || q.trim().length >= 2) && (
            <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              {results.map((d) => (
                <button
                  key={d.n}
                  type="button"
                  onClick={() => add(d.n, d.f)}
                  className="block w-full px-3 py-2 text-start hover:bg-secondary"
                  dir="ltr"
                >
                  <span className="font-bold">{d.n}</span>
                  {d.ar && (
                    <span className="ms-1 text-xs text-primary" dir="rtl">
                      ({d.ar})
                    </span>
                  )}{" "}
                  <span className="text-xs text-muted-foreground">
                    — {d.a} · {d.f}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => add(q)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-secondary"
              >
                <Plus className="h-4 w-4" /> إضافة «{q}» كدواء حر
              </button>
            </div>
          )}
        </div>
        {favs.length > 0 && !q && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {favs.slice(0, 10).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => add(f)}
                dir="ltr"
                className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs"
              >
                <Star className="h-3 w-3 text-warning" /> {f}
              </button>
            ))}
          </div>
        )}

        <ol className="mt-3 space-y-2">
          {items.map((it, i) => (
            <li key={i} className="rounded-xl border border-border p-2">
              <div className="flex items-center justify-between gap-2">
                <b dir="ltr">
                  {i + 1}. {it.name}
                </b>
                <button
                  type="button"
                  aria-label="حذف"
                  onClick={() => setItems((p) => p.filter((_, j) => j !== i))}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <input
                className={`${input} mt-1`}
                value={it.dose}
                onChange={(e) =>
                  setItems((p) => p.map((x, j) => (j === i ? { ...x, dose: e.target.value } : x)))
                }
              />
            </li>
          ))}
        </ol>

        <textarea
          className={`${input} mt-3`}
          rows={2}
          placeholder="تحاليل أو أشعة مطلوبة"
          value={tests}
          onChange={(e) => setTests(e.target.value)}
        />
        <textarea
          className={`${input} mt-2`}
          rows={2}
          placeholder="تعليمات (أكل، راحة، ميعاد المتابعة…)"
          value={advice}
          onChange={(e) => setAdvice(e.target.value)}
        />

        {!valid && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            اكتب اسم المريض وضيف دواء واحد على الأقل علشان تطبع أو تنزّل
          </p>
        )}
        <button
          type="button"
          onClick={showRxQr}
          disabled={!valid}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-primary bg-primary/10 py-2.5 text-xs font-bold text-primary disabled:opacity-50"
        >
          <QrCode className="h-4 w-4" /> رمز QR للمريض — يمسحه وتنتقل الروشتة لحسابه
        </button>
        {qrDataUrl && (
          <div
            className="fixed inset-0 z-[110] grid place-items-center bg-black/70 p-4"
            onClick={() => setQrDataUrl("")}
          >
            <div
              className="w-full max-w-sm rounded-3xl bg-card p-5 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-extrabold">امسح الكود بالمريض</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                المريض يمسح الكود من شاشة التطبيق في سند وتنتقل الروشتة ومواعيد الأدوية تلقائياً.
              </p>
              <img
                src={qrDataUrl}
                alt="رمز QR للروشتة الإلكترونية"
                className="mx-auto mt-4 h-64 w-64 rounded-2xl bg-white p-2"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {patient} — {new Date().toLocaleDateString("ar-EG")}
              </p>
              <button
                type="button"
                onClick={() => setQrDataUrl("")}
                className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground"
              >
                تم
              </button>
            </div>
          </div>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => need() && printRx(build(), "A5")} className={btn}>
            <Printer className="h-4 w-4" /> طباعة A5
          </button>
          <button
            type="button"
            onClick={() => need() && printRx(build(), "thermal")}
            className={btn}
          >
            <Printer className="h-4 w-4" /> طابعة حرارية (إيصال)
          </button>
          <button
            type="button"
            disabled={btBusy}
            onClick={async () => {
              if (!need()) return;
              setBtBusy(true);
              try {
                await printRxBluetooth(build());
                toast.success("تمت الطباعة بالبلوتوث");
              } catch (e) {
                const m = (e as Error).message;
                if (!/cancel/i.test(m)) toast.error(m || "تعذر الاتصال بالطابعة");
              } finally {
                setBtBusy(false);
              }
            }}
            className={btn}
          >
            {btBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bluetooth className="h-4 w-4" />
            )}{" "}
            طابعة بلوتوث مباشرة
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!need()) return;
              try {
                const r = await downloadRx(build());
                toast.success(r === "shared" ? "تمت المشاركة" : "اتنزلت الروشتة");
              } catch {
                toast.error("تعذر التنزيل");
              }
            }}
            className={btn}
          >
            <Download className="h-4 w-4" /> تنزيل / مشاركة
          </button>
        </div>
        {onSend && (
          <button
            type="button"
            disabled={!valid || busy}
            onClick={async () => {
              setBusy(true);
              const ok = await onSend(build());
              setBusy(false);
              if (ok) onClose();
            }}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{" "}
            إرسال للمريض
          </button>
        )}
      </div>
    </div>
  );
}
