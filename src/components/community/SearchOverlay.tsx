import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Clock, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSpecialty, specialties } from "@/lib/mock-data";
import { fetchFeedPage, getRecentSearches, pushRecentSearch } from "./community-api";
import type { FeedPost } from "./community-logic";

export function SearchOverlay({ onClose, onOpenPost }: { onClose: () => void; onOpenPost: (p: FeedPost) => void }) {
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [docs, setDocs] = useState<{ id: string; doctor: string; specialty_id: string }[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [busy, setBusy] = useState(false);
  const term = q.trim();

  useEffect(() => setRecent(getRecentSearches()), []);

  useEffect(() => {
    if (term.length < 2) {
      setDocs([]);
      setPosts([]);
      return;
    }
    const t = window.setTimeout(async () => {
      setBusy(true);
      const safe = term.replace(/[%,()]/g, " ");
      const specIds = specialties.filter((s) => s.name.includes(term)).map((s) => s.id);
      let dq = supabase.from("clinics").select("id, doctor, specialty_id").eq("is_verified", true).limit(10);
      dq = specIds.length
        ? dq.or(`doctor.ilike.%${safe}%,specialty_id.in.(${specIds.join(",")})`)
        : dq.ilike("doctor", `%${safe}%`);
      const [d, p] = await Promise.all([
        dq,
        fetchFeedPage({ tab: "for_you", specialty: "", answered: "all", followerKey: "", search: term }, null).catch(
          () => [],
        ),
      ]);
      setDocs((d.data ?? []) as typeof docs);
      setPosts(p);
      setBusy(false);
      pushRecentSearch(term);
    }, 350);
    return () => window.clearTimeout(t);
  }, [term]);

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-background" dir="rtl">
      <div className="flex items-center gap-2 border-b border-border bg-card p-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <button type="button" onClick={onClose} aria-label="إغلاق" className="grid h-11 w-11 place-items-center rounded-full bg-secondary">
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-full bg-secondary px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن طبيب أو منشور..."
            className="h-11 w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {term.length < 2 && recent.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-extrabold text-muted-foreground">آخر عمليات البحث</h3>
            <div className="flex flex-wrap gap-2">
              {recent.map((r) => (
                <button key={r} type="button" onClick={() => setQ(r)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-secondary px-4 text-sm font-bold">
                  <Clock className="h-4 w-4 text-muted-foreground" /> {r}
                </button>
              ))}
            </div>
          </section>
        )}
        {term.length < 2 && !recent.length && (
          <p className="pt-10 text-center text-sm text-muted-foreground">اكتب حرفين على الأقل للبحث</p>
        )}
        {docs.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-extrabold text-muted-foreground">الأطباء</h3>
            {docs.map((d) => (
              <Link key={d.id} to="/patient/clinic/$id" params={{ id: d.id }} className="flex min-h-11 items-center gap-3 border-b border-border py-2">
                <span className="grid h-10 w-10 place-items-center rounded-full gradient-gold font-black text-gold-foreground">
                  {d.doctor.replace(/^د\.?\s*/, "").charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{d.doctor}</span>
                  <span className="text-xs text-muted-foreground">{getSpecialty(d.specialty_id)?.name ?? ""}</span>
                </span>
                <BadgeCheck className="h-4 w-4 text-success" />
              </Link>
            ))}
          </section>
        )}
        {posts.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-extrabold text-muted-foreground">المنشورات</h3>
            {posts.map((p) => (
              <button key={p.id} type="button" onClick={() => onOpenPost(p)} className="block min-h-11 w-full border-b border-border py-2 text-right">
                <span className="block text-xs font-bold text-muted-foreground">{p.doctor_name || p.author_name}</span>
                <span className="line-clamp-2 text-sm">{p.body || "📷 صورة"}</span>
              </button>
            ))}
          </section>
        )}
        {term.length >= 2 && !busy && !docs.length && !posts.length && (
          <p className="pt-10 text-center text-sm text-muted-foreground">لا توجد نتائج</p>
        )}
      </div>
    </div>
  );
}
