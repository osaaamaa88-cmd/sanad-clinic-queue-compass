import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { listHospitals, type Hospital } from "@/lib/hospitals.functions";
import { adminUpdateHospitalLocation } from "@/lib/admin.functions";

/** Owner tool: review and correct each hospital's map pin; mark it confirmed or approximate. */
export function HospitalLocationsTab() {
  const [rows, setRows] = useState<Hospital[]>([]);
  const [q, setQ] = useState("");
  const [show, setShow] = useState<"all" | "approx" | "verified">("approx");
  const [editing, setEditing] = useState<Hospital | null>(null);

  const load = () => listHospitals().then(setRows).catch(() => toast.error("تعذر تحميل المستشفيات"));
  useEffect(() => { load(); }, []);

  const list = useMemo(() => rows.filter((h) =>
    (show === "all" || (show === "verified") === h.location_verified) &&
    (!q.trim() || h.name.includes(q.trim()) || h.governorate.includes(q.trim()))), [rows, q, show]);
  const approxCount = rows.filter((h) => !h.location_verified).length;

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-2xl border bg-card p-3 text-sm">
        <b>{rows.length - approxCount}</b> موقع مؤكد · <b className="text-warning">{approxCount}</b> موقع تقريبي
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو المحافظة…" className="w-full rounded-xl border bg-card p-3 text-sm" />
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
        {([["approx", "تقريبي"], ["verified", "مؤكد"], ["all", "الكل"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setShow(k)} className={`rounded-lg py-2 text-xs font-bold ${show === k ? "bg-card shadow-soft" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
      {list.map((h) => (
        <div key={h.id} className="flex items-center gap-2 rounded-2xl border bg-card p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{h.name}</p>
            <p className="text-[11px] text-muted-foreground" dir="ltr">{Number(h.lat).toFixed(5)}, {Number(h.lng).toFixed(5)}</p>
            {h.location_verified
              ? <span className="text-[10px] font-bold text-primary">✓ موقع مؤكد</span>
              : <span className="text-[10px] font-bold text-warning">📍 موقع تقريبي</span>}
          </div>
          <button onClick={() => setEditing(h)} className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">مراجعة</button>
        </div>
      ))}
      {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">لا توجد نتائج</p>}
      {editing && <EditSheet h={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function parseCoords(text: string): [number, number] | null {
  const m = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || text.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,2}\.\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

function EditSheet({ h, onClose, onSaved }: { h: Hospital; onClose: () => void; onSaved: () => void }) {
  const [lat, setLat] = useState(String(h.lat));
  const [lng, setLng] = useState(String(h.lng));
  const [paste, setPaste] = useState("");
  const [saving, setSaving] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    (async () => {
      const L = (await import("leaflet")).default;
      if (!box.current) return;
      map = L.map(box.current, { center: [Number(h.lat), Number(h.lng)], zoom: 16, attributionControl: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      const mk = L.marker([Number(h.lat), Number(h.lng)], {
        draggable: true,
        icon: L.divIcon({ className: "", html: `<div style="font-size:30px;line-height:30px">📍</div>`, iconSize: [30, 30], iconAnchor: [15, 30] }),
      }).addTo(map);
      const sync = () => { const p = mk.getLatLng(); setLat(p.lat.toFixed(6)); setLng(p.lng.toFixed(6)); };
      mk.on("dragend", sync);
      map.on("click", (e) => { mk.setLatLng(e.latlng); sync(); });
      markerRef.current = mk; mapRef.current = map;
    })();
    return () => { map?.remove(); };
  }, [h]);

  const moveTo = (a: number, b: number) => {
    markerRef.current?.setLatLng([a, b]);
    mapRef.current?.setView([a, b], 17);
  };

  const save = async (verified: boolean) => {
    setSaving(true);
    try {
      await adminUpdateHospitalLocation({ data: { id: h.id, lat: Number(lat), lng: Number(lng), verified } });
      toast.success(verified ? "تم تأكيد الموقع" : "تم الحفظ كموقع تقريبي");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر الحفظ");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-end bg-black/50" onClick={onClose}>
      <div className="mx-auto max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
        <p className="font-extrabold">{h.name}</p>
        <p className="text-xs text-muted-foreground">اسحب الدبوس أو اضغط على الخريطة لتحديد مكان المدخل بالظبط.</p>
        <div ref={box} className="mt-3 h-72 w-full overflow-hidden rounded-2xl" dir="ltr" />
        <div className="mt-3 flex gap-2">
          <input value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="الصق رابط خرائط جوجل أو إحداثيات" className="flex-1 rounded-xl border bg-background p-2 text-xs" dir="ltr" />
          <button onClick={() => { const c = parseCoords(paste); if (!c) return toast.error("مش لاقي إحداثيات في النص"); setLat(String(c[0])); setLng(String(c[1])); moveTo(c[0], c[1]); }}
            className="rounded-xl bg-secondary px-3 text-xs font-bold">تطبيق</button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2" dir="ltr">
          <input value={lat} onChange={(e) => setLat(e.target.value)} onBlur={() => moveTo(Number(lat), Number(lng))} className="rounded-xl border bg-background p-2 text-xs" aria-label="خط العرض" />
          <input value={lng} onChange={(e) => setLng(e.target.value)} onBlur={() => moveTo(Number(lat), Number(lng))} className="rounded-xl border bg-background p-2 text-xs" aria-label="خط الطول" />
        </div>
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${h.name} ${h.governorate}`)}`} target="_blank" rel="noreferrer" className="mt-2 block text-center text-xs text-primary">ابحث عنه في خرائط جوجل للمقارنة ↗</a>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button disabled={saving} onClick={() => save(true)} className="rounded-2xl bg-primary py-3 text-sm font-extrabold text-primary-foreground">✓ تأكيد الموقع</button>
          <button disabled={saving} onClick={() => save(false)} className="rounded-2xl bg-secondary py-3 text-sm font-bold">حفظ كتقريبي</button>
        </div>
        <button onClick={onClose} className="mt-2 w-full py-2 text-xs text-muted-foreground">إلغاء</button>
      </div>
    </div>
  );
}
