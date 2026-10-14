import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Phone, Navigation, GraduationCap, Ticket, Building2, ScanLine, Syringe, Sparkles, Baby, Scissors, Droplets, Smile } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

const LAT = 28.0764;
const LNG = 30.833;
const PLACE = "عيادات طب الأسنان - جامعة دراية (مبنى B6)";
const STORE = "sanad_university_dental_tickets";

const DEPTS = [
  { id: "diag", icon: ScanLine, name: "التشخيص وأشعة الفم", hint: "أول زيارة؟ ابدأ من هنا" },
  { id: "endo", icon: Syringe, name: "علاج الجذور وحشو العصب", hint: "ألم مع السخن أو البارد" },
  { id: "oper", icon: Sparkles, name: "العلاج التحفظي والتجميل", hint: "تسوّس وحشوات" },
  { id: "pedo", icon: Baby, name: "طب أسنان الأطفال", hint: "للأطفال وصحة الفم" },
  { id: "surg", icon: Scissors, name: "جراحة الفم والخلع", hint: "خلع بسيط أو جراحي" },
  { id: "perio", icon: Droplets, name: "اللثة وتنظيف الجير", hint: "نزيف أو التهاب اللثة" },
  { id: "pros", icon: Smile, name: "التركيبات الثابتة والمتحركة", hint: "تعويض الأسنان المفقودة" },
];

type TicketT = { code: string; dept: string; name: string; phone: string; day: string; at: number };

export const Route = createFileRoute("/university-dental")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "العيادات التعليمية لطب الأسنان - دراية | سَنَد" },
      { name: "description", content: "احجز كشف في العيادات التعليمية بكلية طب الفم والأسنان بجامعة دراية - مبنى B6 بالمنيا الجديدة." },
      { property: "og:title", content: "العيادات التعليمية لطب الأسنان | سَنَد" },
      { property: "og:description", content: "كشف وعلاج بأيدي أطباء المستقبل تحت إشراف أساتذة الكلية - مبنى B6." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UniversityDental,
});

function nextDays() {
  const out: string[] = [];
  const d = new Date();
  while (out.length < 6) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 5) continue; // الجمعة إجازة
    out.push(d.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" }));
  }
  return out;
}

function UniversityDental() {
  const [dept, setDept] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [day, setDay] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [tickets, setTickets] = useState<TicketT[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    setDays(nextDays());
    try { setTickets(JSON.parse(localStorage.getItem(STORE) || "[]")); } catch { /* ignore */ }
  }, []);

  function book() {
    setErr("");
    if (!dept) return setErr("اختار القسم الأول");
    if (name.trim().length < 3) return setErr("اكتب الاسم بالكامل");
    if (!/^01[0125]\d{8}$/.test(phone.trim())) return setErr("رقم موبايل مصري غير صحيح");
    if (!day) return setErr("اختار يوم الزيارة");
    const t: TicketT = { code: "B6-" + Math.random().toString(36).slice(2, 7).toUpperCase(), dept, name: name.trim(), phone: phone.trim(), day, at: Date.now() };
    const next = [t, ...tickets].slice(0, 10);
    setTickets(next);
    localStorage.setItem(STORE, JSON.stringify(next));
    setName(""); setPhone(""); setDay(""); setDept(null);
  }

  const deptName = (id: string) => DEPTS.find((d) => d.id === id)?.name ?? "";

  return (
    <AppShell title="العيادات التعليمية" subtitle="كلية طب الفم والأسنان - جامعة دراية" backTo="/patient">
      <section className="rounded-3xl gradient-primary p-5 text-primary-foreground shadow-soft">
        <div className="flex items-center gap-2 text-xs font-bold opacity-90"><GraduationCap className="h-4 w-4" /> خدمة مجتمعية</div>
        <h1 className="mt-2 text-xl font-extrabold leading-snug">عيادات طب الأسنان التعليمية</h1>
        <p className="mt-1 text-sm opacity-90">كشف وعلاج بأيدي أطباء المستقبل تحت إشراف أساتذة الكلية</p>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-background/15 px-3 py-2 text-sm font-bold">
          <Building2 className="h-4 w-4" /> مبنى B6 — ميدان دراية، المنيا الجديدة
        </div>
      </section>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button asChild variant="outline" className="h-12 rounded-2xl font-bold">
          <Link to="/directions" search={{ lat: LAT, lng: LNG, name: PLACE }}><Navigation className="ml-1 h-4 w-4" /> الاتجاهات</Link>
        </Button>
        <Button asChild variant="outline" className="h-12 rounded-2xl font-bold">
          <a href="tel:16283"><Phone className="ml-1 h-4 w-4" /> 16283</a>
        </Button>
      </div>

      <h2 className="mt-6 text-lg font-extrabold">1. اختار القسم</h2>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {DEPTS.map((d) => (
          <button key={d.id} onClick={() => setDept(d.id)} className={`rounded-2xl border p-3 text-right transition ${dept === d.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}>
            <div className={`flex h-11 w-11 items-center justify-center rounded-full ${dept === d.id ? "gradient-primary text-primary-foreground shadow-soft" : "bg-primary/10 text-primary"}`}><d.icon className="h-5 w-5" strokeWidth={2.2} /></div>
            <div className="mt-1 text-sm font-bold leading-snug">{d.name}</div>
            <div className="text-[11px] text-muted-foreground">{d.hint}</div>
          </button>
        ))}
      </div>

      <h2 className="mt-6 text-lg font-extrabold">2. بيانات المريض</h2>
      <div className="mt-2 space-y-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم بالكامل" className="h-12 w-full rounded-2xl border border-input bg-card px-4 text-sm" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الموبايل 01xxxxxxxxx" inputMode="tel" dir="ltr" className="h-12 w-full rounded-2xl border border-input bg-card px-4 text-right text-sm" />
      </div>

      <h2 className="mt-6 text-lg font-extrabold">3. يوم الزيارة</h2>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => (
          <button key={d} onClick={() => setDay(d)} className={`shrink-0 rounded-2xl border px-3 py-2 text-xs font-bold ${day === d ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{d}</button>
        ))}
      </div>

      {err && <p className="mt-3 text-sm font-bold text-destructive">{err}</p>}
      <Button onClick={book} className="mt-4 h-12 w-full rounded-2xl gradient-primary text-base font-extrabold text-primary-foreground">احجز تذكرة الكشف</Button>

      {tickets.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-extrabold">تذاكري</h2>
          <div className="mt-2 space-y-2">
            {tickets.map((t) => (
              <div key={t.code} className="rounded-2xl border border-dashed border-primary/50 bg-card p-4">
                <div className="flex items-center justify-between"><span className="flex items-center gap-1 text-xs font-bold text-primary"><Ticket className="h-4 w-4" /> تذكرة كشف</span><span dir="ltr" className="font-mono text-lg font-extrabold">{t.code}</span></div>
                <div className="mt-2 text-sm font-bold">{deptName(t.dept)}</div>
                <div className="text-xs text-muted-foreground">{t.name} — {t.day}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <section className="mt-6 rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-relaxed">
        <div className="mb-1 flex items-center gap-1 font-extrabold"><MapPin className="h-4 w-4" /> قبل الزيارة</div>
        <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
          <li>هات البطاقة الشخصية وتذكرة الحجز.</li>
          <li>توجّه لاستقبال مبنى B6 لفتح الملف والتشخيص.</li>
          <li>هات أي أشعة أو تقارير قديمة لو موجودة.</li>
          <li>المواعيد والرسوم يتم تأكيدها من الاستقبال أو الخط الساخن 16283.</li>
        </ul>
      </section>
    </AppShell>
  );
}
