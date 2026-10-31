import { defaultDoctorAvatar } from "@/lib/default-avatars";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Clock, MapPin, Search as SearchIcon, Stethoscope, X } from "lucide-react";
import { svrDoctorDirectory, type DirectoryDoctor } from "@/lib/doctor-directory.functions";
import { getSpecialty, specialties } from "@/lib/mock-data";

type Tab = "all" | "doctors" | "specialties" | "areas";
const RECENT_KEY = "sanad.recentDoctorSearches";

type Recent = { id: string; doctor: string; avatarUrl: string; specialtyId: string };

/** Longest title first: alternation is tried left to right, so "دكتور" must beat "د". */
const TITLE_PREFIX = /^(دكتوره|دكتور|د\.?|dr\.?)\s*/;

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(TITLE_PREFIX, "")
    .trim();
}

function Avatar({
  d,
  size = 52,
}: {
  d: { doctor: string; avatarUrl: string; hasStory?: boolean };
  size?: number;
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full p-[2px] ${d.hasStory ? "bg-gradient-to-tr from-primary via-accent to-destructive" : "bg-border"}`}
      style={{ width: size, height: size }}
    >
      <span className="grid h-full w-full place-items-center overflow-hidden rounded-full border-2 border-background bg-secondary">
        <img src={d.avatarUrl || defaultDoctorAvatar(d.doctor)}
            alt={d.doctor}
            loading="lazy"
            className="h-full w-full object-cover"
          />
      </span>
    </span>
  );
}

export function DoctorNameSearch({ title = "ابحث عن طبيب" }: { title?: string }) {
  const [list, setList] = useState<DirectoryDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [recent, setRecent] = useState<Recent[]>([]);

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"));
    } catch {
      setRecent([]);
    }
    svrDoctorDirectory()
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  const saveRecent = (next: Recent[]) => {
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  const remember = (d: DirectoryDoctor) =>
    saveRecent(
      [
        { id: d.id, doctor: d.doctor, avatarUrl: d.avatarUrl, specialtyId: d.specialtyId },
        ...recent.filter((r) => r.id !== d.id),
      ].slice(0, 10),
    );

  const term = norm(q);
  const results = useMemo(() => {
    if (!term) return [];
    return list
      .filter((d) => {
        const spec = norm(getSpecialty(d.specialtyId)?.name ?? "");
        const name = norm(d.doctor);
        const area = norm(`${d.area} ${d.address}`);
        if (tab === "doctors") return name.includes(term);
        if (tab === "specialties") return spec.includes(term);
        if (tab === "areas") return area.includes(term);
        return name.includes(term) || spec.includes(term) || area.includes(term);
      })
      .sort((a, b) => {
        const as = norm(a.doctor).startsWith(term) ? 0 : 1;
        const bs = norm(b.doctor).startsWith(term) ? 0 : 1;
        return (
          as - bs ||
          Number(b.isVerified) - Number(a.isVerified) ||
          Number(b.isFeatured) - Number(a.isFeatured)
        );
      })
      .slice(0, 40);
  }, [list, term, tab]);

  const suggested = useMemo(
    () =>
      [...list]
        .sort(
          (a, b) =>
            Number(b.hasStory) - Number(a.hasStory) || Number(b.isVerified) - Number(a.isVerified),
        )
        .slice(0, 12),
    [list],
  );

  const tabs: { k: Tab; label: string }[] = [
    { k: "all", label: "الكل" },
    { k: "doctors", label: "أطباء" },
    { k: "specialties", label: "تخصصات" },
    { k: "areas", label: "مناطق" },
  ];

  return (
    <div dir="rtl">
      <h2 className="sr-only">{title}</h2>
      <div className="sticky top-0 z-10 -mx-5 bg-background/95 px-5 pb-2 pt-1 backdrop-blur">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم الطبيب، التخصص، أو المنطقة"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="مسح" className="text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {term && (
          <div className="mt-2 flex gap-1 border-b border-border">
            {tabs.map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`flex-1 border-b-2 pb-2 text-xs font-bold ${tab === t.k ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!term ? (
        <>
          {recent.length > 0 && (
            <section className="mt-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-extrabold">عمليات البحث الأخيرة</h3>
                <button onClick={() => saveRecent([])} className="text-xs font-bold text-primary">
                  مسح الكل
                </button>
              </div>
              <ul className="space-y-1">
                {recent.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-1.5">
                    <Link
                      to="/patient/clinic/$id"
                      params={{ id: r.id }}
                      className="flex flex-1 items-center gap-3"
                    >
                      <Avatar d={r} size={44} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{r.doctor}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {getSpecialty(r.specialtyId)?.name}
                        </span>
                      </span>
                    </Link>
                    <button
                      aria-label="حذف"
                      onClick={() => saveRecent(recent.filter((x) => x.id !== r.id))}
                      className="p-2 text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-4">
            <h3 className="mb-2 text-sm font-extrabold">تخصصات</h3>
            <div className="flex flex-wrap gap-2">
              {specialties.slice(0, 10).map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setQ(s.name);
                    setTab("specialties");
                  }}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold"
                >
                  {s.name}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-4">
            <h3 className="mb-2 text-sm font-extrabold">أطباء مقترحون</h3>
            {loading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">جاري التحميل…</p>
            ) : (
              <ResultList items={suggested} onPick={remember} />
            )}
          </section>
        </>
      ) : loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">جاري البحث…</p>
      ) : results.length === 0 ? (
        <div className="py-12 text-center">
          <Stethoscope className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-2 text-sm font-bold">مفيش نتائج لـ «{q}»</p>
          <p className="text-xs text-muted-foreground">جرّب اسم تاني أو تخصص أو منطقة</p>
        </div>
      ) : (
        <div className="mt-2">
          <ResultList items={results} onPick={remember} />
        </div>
      )}
    </div>
  );
}

function ResultList({
  items,
  onPick,
}: {
  items: DirectoryDoctor[];
  onPick: (d: DirectoryDoctor) => void;
}) {
  return (
    <ul className="space-y-1">
      {items.map((d) => (
        <li key={d.id}>
          <Link
            to="/patient/clinic/$id"
            params={{ id: d.id }}
            onClick={() => onPick(d)}
            className="flex items-center gap-3 rounded-xl px-1 py-2 active:bg-secondary"
          >
            <Avatar d={d} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1">
                <span className="truncate text-sm font-extrabold">{d.doctor}</span>
                {d.isVerified && (
                  <BadgeCheck
                    className="h-4 w-4 shrink-0 fill-primary text-primary-foreground"
                    aria-label="موثق"
                  />
                )}
              </span>
              <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                {getSpecialty(d.specialtyId)?.name}
                {d.area && (
                  <>
                    <span>·</span>
                    <MapPin className="h-3 w-3" />
                    {d.area}
                  </>
                )}
              </span>
            </span>
            {d.hasStory && <Clock className="h-3.5 w-3.5 text-primary" aria-label="ستوري جديدة" />}
          </Link>
        </li>
      ))}
    </ul>
  );
}
