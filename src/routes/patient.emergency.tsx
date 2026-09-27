import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Phone, MapPin, Clock, Filter, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  listEmergencyFacilities,
  emergencyHotlines,
  facilityTypeLabel,
  type EmergencyFacility,
} from "@/lib/emergency-data";
import { useEffect } from "react";

export const Route = createFileRoute("/patient/emergency")({
  head: () => ({
    meta: [
      { title: "طوارئ سَنَد — أقرب مستشفى ومركز أشعة مفتوح الآن" },
      {
        name: "description",
        content: "المستشفيات ومراكز الأشعة والعيادات المفتوحة 24 ساعة قريب منك مع اتصال مباشر بالطوارئ.",
      },
    ],
  }),
  component: EmergencyPage,
});

type SortMode = "near" | "open";
type TypeFilter = "all" | EmergencyFacility["type"];

function EmergencyPage() {
  const [sort, setSort] = useState<SortMode>("near");
  const [type, setType] = useState<TypeFilter>("all");
  const [only24, setOnly24] = useState(false);
  const [facilities, setFacilities] = useState<EmergencyFacility[]>([]);
  useEffect(() => {
    let cancelled = false;
    listEmergencyFacilities().then((list) => {
      if (!cancelled) setFacilities(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const list = useMemo(() => {
    let items = [...facilities];
    if (type !== "all") items = items.filter((f) => f.type === type);
    if (only24) items = items.filter((f) => f.open24h);
    if (sort === "near") items.sort((a, b) => a.distanceKm - b.distanceKm);
    if (sort === "open") items.sort((a, b) => Number(b.openNow) - Number(a.openNow));
    return items;
  }, [sort, type, only24, facilities]);

  return (
    <AppShell
      title="طوارئ سَنَد"
      subtitle="أقرب مستشفى وعيادة مفتوحة الآن"
      backTo="/patient"
      tone="primary"
    >
      {/* Hotlines */}
      <div className="-mt-6 rounded-3xl bg-card p-4 shadow-soft">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-destructive/15 text-destructive">
            <Phone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold">اتصال سريع بالطوارئ</p>
            <p className="text-[11px] text-muted-foreground">اضغط الرقم للاتصال المباشر</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {emergencyHotlines.map((h) => (
            <a
              key={h.id}
              href={`tel:${h.phone}`}
              className="flex items-center gap-2 rounded-2xl border border-border bg-secondary p-3"
            >
              <span className="text-xl">{h.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{h.label}</p>
                <p className="text-xs text-muted-foreground">{h.phone}</p>
              </div>
              <Phone className="h-4 w-4 text-primary" />
            </a>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Filter className="h-4 w-4 text-primary" /> فلترة
        </div>
        <div className="-mx-5 mt-3 overflow-x-auto px-5">
          <div className="flex gap-2">
            {(
              [
                { id: "all", label: "الكل", emoji: "✨" },
                { id: "hospital", label: "مستشفيات", emoji: "🏥" },
                { id: "radiology", label: "أشعة", emoji: "🩻" },
                { id: "clinic", label: "عيادات", emoji: "🩺" },
                { id: "pharmacy", label: "صيدليات", emoji: "💊" },
              ] as { id: TypeFilter; label: string; emoji: string }[]
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold ${
                  type === t.id ? "gradient-primary text-white" : "bg-secondary text-foreground"
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => setSort("near")}
            className={`rounded-xl py-2 text-xs font-bold ${
              sort === "near" ? "gradient-primary text-white" : "bg-secondary text-foreground"
            }`}
          >
            الأقرب جغرافياً
          </button>
          <button
            onClick={() => setSort("open")}
            className={`rounded-xl py-2 text-xs font-bold ${
              sort === "open" ? "gradient-primary text-white" : "bg-secondary text-foreground"
            }`}
          >
            المفتوح الآن
          </button>
        </div>
        <label className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm">
          <input
            type="checkbox"
            checked={only24}
            onChange={(e) => setOnly24(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          <span className="font-bold">اعرض 24 ساعة فقط</span>
        </label>
      </div>

      {/* List */}
      <div className="mt-5 space-y-3">
        {list.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            لا توجد نتائج مطابقة للفلاتر الحالية.
          </div>
        )}
        {list.map((f) => {
          const meta = facilityTypeLabel[f.type];
          return (
            <div key={f.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-2xl">
                  {meta.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-bold">{f.name}</p>
                    {f.open24h && (
                      <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">
                        24 ساعة
                      </span>
                    )}
                    {f.openNow ? (
                      <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-success-foreground">
                        مفتوح
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        مغلق
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{meta.label}</p>
                  <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    <span className="line-clamp-2">
                      {f.address} — {f.area}
                    </span>
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {f.distanceKm} كم عنك
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a
                  href={`tel:${f.phone}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-destructive py-3 text-sm font-extrabold text-destructive-foreground"
                >
                  <Phone className="h-4 w-4" /> اتصال مباشر
                </a>
                <a
                  href={`https://wa.me/${f.phone.replace(/^0/, "20")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-success py-3 text-sm font-extrabold text-success-foreground"
                >
                  <MessageCircle className="h-4 w-4" /> واتساب
                </a>
              </div>
              <a
                href={`https://maps.google.com/?q=${f.lat},${f.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-xs font-bold"
              >
                <MapPin className="h-4 w-4 text-primary" /> فتح على الخريطة
              </a>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}