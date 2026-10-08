import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bot, MapPin, Loader2, Siren, Phone, Star, Stethoscope, ChevronLeft, Lightbulb } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LocationPickerModal } from "@/components/LocationPickerModal";
import { getPatientLocation, savePatientLocation, distanceKm, defaultLocation, type PatientLocation } from "@/lib/patient-location";
import { getVerifiedClinics, getSpecialty, type Clinic } from "@/lib/mock-data";
import { specialtyIcons } from "@/lib/specialty-icons";
import { runLocalTriage, type TriageResult } from "@/lib/triage-local";
import { aiTriage } from "@/lib/triage.functions";

export const Route = createFileRoute("/patient/assistant")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "سَنَد — المساعد الذكي لاختيار الطبيب" },
      { name: "description", content: "اكتب اللي بتحس بيه وموقعك، وسَنَد يرشّح لك التخصص والعيادة الأقرب." },
      { property: "og:title", content: "سَنَد — المساعد الذكي" },
      { property: "og:description", content: "اكتب احتياجك وسَنَد يوصلك للتخصص والعيادة المناسبة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Assistant,
});

const examples = ["سناني بتوجعني ولثتي وارمة", "ابني عنده سخونية وكحة من يومين", "ركبتي بتوجعني لما بطلع السلم"];

function Assistant() {
  const [need, setNeed] = useState("");
  const [loc, setLoc] = useState<PatientLocation>(defaultLocation);
  const [picker, setPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);

  useEffect(() => {
    setLoc(getPatientLocation());
    getVerifiedClinics().then(setClinics);
  }, []);

  async function submit() {
    if (need.trim().length < 3 || loading) return;
    setError(null);
    setLoading(true);
    try {
      const ai = await aiTriage({ data: { need } });
      setResult(ai ?? runLocalTriage(need));
    } catch {
      setResult(runLocalTriage(need));
    } finally {
      setLoading(false);
    }
  }

  const matches = result
    ? clinics
        .filter((c) => result.specialtyIds.includes(c.specialtyId))
        .map((c) => ({ c, d: c.lat != null && c.lng != null ? distanceKm(loc, { lat: c.lat, lng: c.lng }) : c.distanceKm }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 6)
    : [];

  return (
    <AppShell title="المساعد الذكي">
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4">
          <Bot className="h-9 w-9 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed">اكتب اللي بتحس بيه أو محتاجه بكلامك العادي، وأنا أرشّح لك التخصص المناسب وأقرب عيادة ليك.</p>
        </div>

        <button onClick={() => setPicker(true)} className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="flex-1 text-start">{loc.name}، {loc.city}</span>
          <span className="text-xs text-primary">تغيير ▾</span>
        </button>

        <textarea
          value={need}
          onChange={(e) => setNeed(e.target.value)}
          maxLength={800}
          rows={4}
          placeholder="مثلاً: عندي صداع مستمر ودوخة من أسبوع…"
          className="w-full resize-none rounded-2xl border border-border bg-card p-4 text-base outline-none focus:border-primary"
        />
        <div className="flex flex-wrap gap-2">
          {examples.map((e) => (
            <button key={e} onClick={() => setNeed(e)} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
              {e}
            </button>
          ))}
        </div>

        <button
          onClick={submit}
          disabled={loading || need.trim().length < 3}
          className="gradient-primary flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-primary-foreground disabled:opacity-50"
        >
          {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> بفهم طلبك…</> : "رشّح لي الطبيب المناسب"}
        </button>

        {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        {result && (
          <div className="space-y-3">
            {result.urgency === "emergency" && (
              <a href="tel:123" className="flex items-center gap-3 rounded-2xl bg-destructive p-4 font-bold text-destructive-foreground">
                <Siren className="h-6 w-6" /> الأعراض دي ممكن تكون طارئة — اتصل بالإسعاف 123 فوراً
              </a>
            )}
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm">{result.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.specialtyIds.map((id) => {
                  const Icon = specialtyIcons[id] ?? Stethoscope;
                  return (
                    <span key={id} className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-sm font-bold text-primary">
                      <Icon className="h-4 w-4" /> {getSpecialty(id)?.name ?? id}
                    </span>
                  );
                })}
                {result.urgency === "soon" && <span className="rounded-full bg-accent px-3 py-1.5 text-xs">يُفضّل الكشف خلال يوم أو يومين</span>}
              </div>
              {result.advice && <p className="mt-3 flex gap-1.5 text-xs text-muted-foreground"><Lightbulb className="h-4 w-4 shrink-0 text-primary" />{result.advice}</p>}
            </div>

            <h3 className="font-bold">عيادات مناسبة قريبة منك</h3>
            {matches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                لسه مفيش عيادات مسجّلة في التخصص ده قريب منك.
                <Link to="/patient/search" className="mt-2 block font-bold text-primary">تصفّح الخريطة</Link>
              </div>
            ) : (
              matches.map(({ c, d }) => (
                <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{c.doctor}</p>
                    <p className="text-xs text-muted-foreground">
                      {getSpecialty(c.specialtyId)?.name} • {d.toFixed(1)} كم • <Star className="inline h-3 w-3" /> {c.rating}
                    </p>
                  </div>
                  {c.phone && (
                    <a href={`tel:${c.phone}`} aria-label="اتصال" className="rounded-full bg-primary/15 p-2 text-primary"><Phone className="h-4 w-4" /></a>
                  )}
                  <Link to="/patient/clinic/$id" params={{ id: c.id }} className="flex items-center text-sm text-primary">
                    عرض <ChevronLeft className="h-4 w-4" />
                  </Link>
                </div>
              ))
            )}
            <p className="text-center text-[11px] text-muted-foreground">المساعد للإرشاد فقط ولا يغني عن استشارة الطبيب.</p>
          </div>
        )}
      </div>
      {picker && (
        <LocationPickerModal
          current={loc}
          onSelect={(l) => { savePatientLocation(l); setLoc(l); setPicker(false); }}
          onClose={() => setPicker(false)}
        />
      )}
    </AppShell>
  );
}
