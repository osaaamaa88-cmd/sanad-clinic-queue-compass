import { useMemo, useState } from "react";
import { Check, LocateFixed, Loader2, MapPin, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectGpsLocation, egyptAreas, type PatientLocation } from "@/lib/patient-location";

export function LocationPickerModal({ current, onSelect, onClose }: { current: PatientLocation; onSelect: (l: PatientLocation) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = useMemo(() => {
    const t = q.trim();
    return t ? egyptAreas.filter((a) => a.name.includes(t) || a.city.includes(t)) : egyptAreas;
  }, [q]);

  const gps = async () => {
    setLoading(true);
    setError(null);
    try {
      onSelect(await detectGpsLocation());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-background/70 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl border border-border bg-card p-4 shadow-soft animate-[sheet-down_0.25s_ease-out] sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">اختار موقعك</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="إغلاق"><X className="h-5 w-5" /></Button>
        </div>
        <Button onClick={gps} disabled={loading} className="h-12 w-full gap-2 gradient-primary text-base font-bold text-primary-foreground">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />}
          {loading ? "جاري تحديد موقعك…" : "تحديد موقعي بدقة (GPS)"}
        </Button>
        {error && <p className="mt-2 rounded-lg bg-destructive/10 p-2 text-xs font-bold text-destructive">{error}</p>}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن منطقتك أو محافظتك…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 overflow-y-auto pb-2">
          {list.map((a) => {
            const on = !current.gps && current.name === a.name;
            return (
              <button key={a.name} type="button" onClick={() => onSelect(a)} className={`flex items-center gap-2 rounded-xl border p-3 text-right transition hover:border-primary/60 ${on ? "border-primary bg-primary-soft/40" : "border-border"}`}>
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{a.name}</span><span className="block text-[11px] text-muted-foreground">{a.city}</span></span>
                {on && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
          {list.length === 0 && <p className="col-span-2 p-4 text-center text-sm text-muted-foreground">لا توجد منطقة بهذا الاسم</p>}
        </div>
      </div>
    </div>
  );
}
