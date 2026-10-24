import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Ban,
  Trash2,
  Search,
  ChevronRight,
  ChevronLeft,
  CalendarClock,
  XCircle,
  Megaphone,
  Wrench,
  Image as ImageIcon,
  Youtube,
  Film,
  CheckCircle2,
} from "lucide-react";
import {
  godListUsers,
  godSuspendUser,
  godDeleteUser,
  godListBookings,
  godUpdateBooking,
  godListMedia,
  godDeleteMedia,
  getAppSettings,
  godSetSettings,
} from "@/lib/godmode.functions";

function Pager({
  page,
  hasMore,
  onPage,
}: {
  page: number;
  hasMore: boolean;
  onPage: (p: number) => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-between text-xs">
      <button
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
        className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 font-bold disabled:opacity-40"
      >
        <ChevronRight className="h-3.5 w-3.5" /> السابق
      </button>
      <span className="text-muted-foreground">صفحة {page + 1}</span>
      <button
        disabled={!hasMore}
        onClick={() => onPage(page + 1)}
        className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 font-bold disabled:opacity-40"
      >
        التالي <ChevronLeft className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3">
      <Search className="h-4 w-4 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="بحث..."
        className="w-full bg-transparent py-2.5 text-sm outline-none"
      />
    </div>
  );
}

const run = async (fn: () => Promise<unknown>, ok: string) => {
  try {
    await fn();
    toast.success(ok);
    return true;
  } catch (e) {
    toast.error((e as Error).message || "حصل خطأ");
    return false;
  }
};

/* ---------------- Users ---------------- */
type UserRow = Awaited<ReturnType<typeof godListUsers>>["rows"][number];
export function UsersTab() {
  const list = useServerFn(godListUsers);
  const suspend = useServerFn(godSuspendUser);
  const del = useServerFn(godDeleteUser);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | "patient" | "doctor" | "secretary">("all");
  const [data, setData] = useState<{ rows: UserRow[]; hasMore: boolean }>({
    rows: [],
    hasMore: false,
  });
  const load = useCallback(
    () =>
      list({ data: { page, q } })
        .then(setData)
        .catch((e) => toast.error(e.message)),
    [list, page, q],
  );
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  const rows = data.rows.filter((r) => role === "all" || r.role === role);
  const roleLabel = { patient: "مريض", doctor: "طبيب", secretary: "سكرتير" } as const;
  return (
    <div className="mt-4 space-y-3">
      <SearchBox
        value={q}
        onChange={(v) => {
          setQ(v);
          setPage(0);
        }}
      />
      <div className="flex gap-1">
        {(["all", "patient", "doctor", "secretary"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold ${role === r ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {r === "all" ? "الكل" : roleLabel[r]}
          </button>
        ))}
      </div>
      {rows.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          لا يوجد حسابات
        </p>
      )}
      {rows.map((u) => (
        <div
          key={u.id}
          className={`rounded-2xl border p-3 ${u.banned ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {u.name || u.email || u.phone || "بدون اسم"}
              </p>
              <p className="truncate text-[11px] text-muted-foreground" dir="ltr">
                {u.email || u.phone}
              </p>
              {u.clinic && <p className="text-[11px] text-primary">{u.clinic}</p>}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">
                {roleLabel[u.role as keyof typeof roleLabel]}
              </span>
              {u.banned && (
                <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">
                  موقوف
                </span>
              )}
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={async () => {
                if (
                  await run(
                    () => suspend({ data: { id: u.id, suspend: !u.banned } }),
                    u.banned ? "تم رفع الإيقاف" : "تم إيقاف الحساب",
                  )
                )
                  load();
              }}
              className="flex items-center justify-center gap-1 rounded-xl bg-warning/15 py-2 text-xs font-bold text-warning"
            >
              {u.banned ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Ban className="h-3.5 w-3.5" />
              )}{" "}
              {u.banned ? "رفع الإيقاف" : "إيقاف"}
            </button>
            <button
              onClick={async () => {
                if (!confirm("حذف الحساب نهائياً؟ لا يمكن التراجع.")) return;
                if (await run(() => del({ data: { id: u.id } }), "تم حذف الحساب")) load();
              }}
              className="flex items-center justify-center gap-1 rounded-xl border border-border py-2 text-xs font-bold text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> حذف
            </button>
          </div>
        </div>
      ))}
      <Pager page={page} hasMore={data.hasMore} onPage={setPage} />
    </div>
  );
}

/* ---------------- Bookings feed ---------------- */
export function LiveBookingsTab() {
  const list = useServerFn(godListBookings);
  const update = useServerFn(godUpdateBooking);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [data, setData] = useState<{ rows: any[]; hasMore: boolean }>({ rows: [], hasMore: false });
  const load = useCallback(
    () =>
      list({ data: { page, q } })
        .then(setData)
        .catch((e) => toast.error(e.message)),
    [list, page, q],
  );
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => {
    const i = setInterval(load, 20000);
    return () => clearInterval(i);
  }, [load]);
  return (
    <div className="mt-4 space-y-3">
      <SearchBox
        value={q}
        onChange={(v) => {
          setQ(v);
          setPage(0);
        }}
      />
      <p className="text-[11px] text-muted-foreground">يتحدث تلقائياً كل 20 ثانية</p>
      {data.rows.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          لا يوجد حجوزات
        </p>
      )}
      {data.rows.map((b) => (
        <div key={b.id} className="rounded-2xl border border-border bg-card p-3">
          <div className="flex justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{b.patient_name}</p>
              <p className="text-[11px] text-muted-foreground">
                {b.clinics?.doctor} • {b.day_label} {b.slot} • #{b.queue_number}
              </p>
            </div>
            <span
              className={`h-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${b.status === "cancelled" ? "bg-destructive/15 text-destructive" : "bg-secondary"}`}
            >
              {b.status === "cancelled" ? "ملغي" : b.status}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={async () => {
                const day = prompt("اليوم الجديد", b.day_label);
                if (day === null) return;
                const slot = prompt("الميعاد الجديد", b.slot);
                if (slot === null) return;
                if (
                  await run(
                    () => update({ data: { id: b.id, dayLabel: day, slot } }),
                    "تم تعديل الموعد",
                  )
                )
                  load();
              }}
              className="flex items-center justify-center gap-1 rounded-xl border border-border py-2 text-xs font-bold"
            >
              <CalendarClock className="h-3.5 w-3.5" /> إعادة جدولة
            </button>
            <button
              disabled={b.status === "cancelled"}
              onClick={async () => {
                if (!confirm("إلغاء الحجز؟")) return;
                if (
                  await run(() => update({ data: { id: b.id, status: "cancelled" } }), "تم الإلغاء")
                )
                  load();
              }}
              className="flex items-center justify-center gap-1 rounded-xl bg-destructive/10 py-2 text-xs font-bold text-destructive disabled:opacity-40"
            >
              <XCircle className="h-3.5 w-3.5" /> إلغاء إجباري
            </button>
          </div>
        </div>
      ))}
      <Pager page={page} hasMore={data.hasMore} onPage={setPage} />
    </div>
  );
}

/* ---------------- Media moderation ---------------- */
export function MediaTab() {
  const list = useServerFn(godListMedia);
  const del = useServerFn(godDeleteMedia);
  const [kind, setKind] = useState<"posts" | "stories" | "youtube">("posts");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ rows: any[]; hasMore: boolean }>({ rows: [], hasMore: false });
  const load = useCallback(
    () =>
      list({ data: { page, kind } })
        .then(setData)
        .catch((e) => toast.error(e.message)),
    [list, page, kind],
  );
  useEffect(() => {
    load();
  }, [load]);
  const tabs = [
    ["posts", "المنشورات", ImageIcon],
    ["stories", "الستوريز", Film],
    ["youtube", "يوتيوب", Youtube],
  ] as const;
  return (
    <div className="mt-4">
      <div className="flex gap-1">
        {tabs.map(([k, l, I]) => (
          <button
            key={k}
            onClick={() => {
              setKind(k);
              setPage(0);
            }}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold ${kind === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            <I className="h-3.5 w-3.5" /> {l}
          </button>
        ))}
      </div>
      {data.rows.length === 0 && (
        <p className="mt-3 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          لا يوجد محتوى
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {data.rows.map((m) => (
          <div key={m.id} className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="aspect-square bg-secondary">
              {m.mediaType === "youtube" ? (
                <a
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  className="grid h-full place-items-center p-2 text-center text-[10px] break-all text-primary"
                >
                  <Youtube className="mb-1 h-8 w-8" />
                  {m.url}
                </a>
              ) : m.mediaType === "video" ? (
                <video
                  src={m.url}
                  className="h-full w-full object-cover"
                  muted
                  controls
                  preload="metadata"
                />
              ) : m.url ? (
                <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center p-2 text-center text-xs">
                  {m.caption || "نص"}
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="truncate text-[11px] font-bold">{m.doctor}</p>
              <button
                onClick={async () => {
                  if (!confirm("حذف هذا المحتوى؟")) return;
                  if (await run(() => del({ data: { id: m.id, kind } }), "تم الحذف")) load();
                }}
                className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg bg-destructive/10 py-1.5 text-[11px] font-bold text-destructive"
              >
                <Trash2 className="h-3 w-3" /> حذف / إخفاء
              </button>
            </div>
          </div>
        ))}
      </div>
      <Pager page={page} hasMore={data.hasMore} onPage={setPage} />
    </div>
  );
}

/* ---------------- System controls ---------------- */
export function SystemTab() {
  const get = useServerFn(getAppSettings);
  const set = useServerFn(godSetSettings);
  const [maintenance, setMaintenance] = useState(false);
  const [msg, setMsg] = useState("");
  const [tone, setTone] = useState("info");
  useEffect(() => {
    get()
      .then((s) => {
        setMaintenance(s.maintenance);
        setMsg(s.broadcast);
        setTone(s.broadcast_tone);
      })
      .catch(() => {});
  }, [get]);
  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-warning" />
            <p className="font-bold">وضع الصيانة الشامل</p>
          </div>
          <button
            onClick={async () => {
              const v = !maintenance;
              if (
                await run(
                  () => set({ data: { maintenance: v } }),
                  v ? "تم تفعيل الصيانة" : "تم إيقاف الصيانة",
                )
              )
                setMaintenance(v);
            }}
            className={`rounded-full px-4 py-1.5 text-xs font-bold ${maintenance ? "bg-warning text-warning-foreground" : "bg-secondary"}`}
          >
            {maintenance ? "مفعّل" : "متوقف"}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">يظهر شريط صيانة لكل المستخدمين.</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <p className="font-bold">رسالة بث لكل المستخدمين</p>
        </div>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="اكتب الرسالة..."
          className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm"
        />
        <div className="mt-2 flex gap-1">
          {[
            ["info", "عادي"],
            ["warn", "تنبيه"],
            ["urgent", "عاجل"],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTone(k)}
              className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold ${tone === k ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() =>
              run(() => set({ data: { broadcast: msg.trim(), tone } }), "تم إرسال البث")
            }
            className="rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground"
          >
            إرسال
          </button>
          <button
            onClick={async () => {
              if (await run(() => set({ data: { broadcast: "" } }), "تم إخفاء البث")) setMsg("");
            }}
            className="rounded-xl border border-border py-2.5 text-sm font-bold"
          >
            إخفاء البث
          </button>
        </div>
      </div>
    </div>
  );
}
