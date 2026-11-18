import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Megaphone, Wrench } from "lucide-react";
import { getAppSettings, godSetSettings } from "@/lib/godmode.functions";
import { run } from "./godmode-utils";

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
        <p className="mt-2 text-xs text-muted-foreground">يظهر شريط صيانة لكل المستخدمين.</p>
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
          {(
            [
              ["info", "عادي"],
              ["warn", "تنبيه"],
              ["urgent", "عاجل"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTone(k)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-bold ${tone === k ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
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
