import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Ban, CheckCircle2, Trash2 } from "lucide-react";
import { godDeleteUser, godListUsers, godSuspendUser } from "@/lib/godmode.functions";
import { Pager, SearchBox } from "./godmode-shared";
import { run, useGodList } from "./godmode-utils";

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
  useGodList(load);
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
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold ${role === r ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
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
              <p className="truncate text-xs text-muted-foreground" dir="ltr">
                {u.email || u.phone}
              </p>
              {u.clinic && <p className="text-xs text-primary">{u.clinic}</p>}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold">
                {roleLabel[u.role as keyof typeof roleLabel]}
              </span>
              {u.banned && (
                <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-bold text-destructive">
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
