import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Film, Image as ImageIcon, Trash2, Youtube } from "lucide-react";
import { godDeleteMedia, godListMedia } from "@/lib/godmode.functions";
import { Pager } from "./godmode-shared";
import { run } from "./godmode-utils";

type MediaRow = {
  id: string;
  clinicId: string;
  doctor: string;
  url: string;
  mediaType: string;
  caption: string;
  createdAt: string;
};

export function MediaTab() {
  const list = useServerFn(godListMedia);
  const del = useServerFn(godDeleteMedia);
  const [kind, setKind] = useState<"posts" | "stories" | "youtube">("posts");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ rows: MediaRow[]; hasMore: boolean }>({
    rows: [],
    hasMore: false,
  });
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
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold ${kind === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
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
                  className="grid h-full place-items-center p-2 text-center text-xs break-all text-primary"
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
              <p className="truncate text-xs font-bold">{m.doctor}</p>
              <button
                onClick={async () => {
                  if (!confirm("حذف هذا المحتوى؟")) return;
                  if (await run(() => del({ data: { id: m.id, kind } }), "تم الحذف")) load();
                }}
                className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg bg-destructive/10 py-1.5 text-xs font-bold text-destructive"
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
