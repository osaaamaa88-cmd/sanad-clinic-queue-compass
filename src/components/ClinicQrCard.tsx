import { useEffect, useState } from "react";
import { QrCode, Printer } from "lucide-react";
import type { Clinic } from "@/lib/mock-data";

export function ClinicQrCard({ clinic, specName }: { clinic: Clinic; specName: string }) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const link = `${window.location.origin}/patient/clinic/${clinic.id}`;
    setUrl(link);
    import("qrcode")
      .then((mod) =>
        mod.default.toDataURL(link, {
          width: 512,
          margin: 1,
          color: { dark: "#0F172A", light: "#FFFFFF" },
        }),
      )
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [clinic.id]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <QrCode className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold">كارت العيادة ورمز QR</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        اطبع الكارت وعلّقه في العيادة — المريض يمسح الكود ويحجز فوراً.
      </p>

      <div
        id="sanad-clinic-card"
        className="mt-3 rounded-2xl border-2 border-dashed border-primary bg-white p-4 text-center text-[#0F172A]"
      >
        <p className="text-xs font-extrabold text-[#06B6D4]">سند — سندك الطبي في كل وقت</p>
        <p className="mt-2 text-lg font-black">{clinic.doctor}</p>
        <p className="text-xs">{specName}</p>
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`رمز QR لعيادة ${clinic.doctor}`}
            className="mx-auto mt-3 h-40 w-40"
          />
        ) : (
          <div className="mx-auto mt-3 grid h-40 w-40 place-items-center text-xs text-[#64748B]">
            جاري توليد الرمز…
          </div>
        )}
        <p className="mt-2 text-[11px]">
          {clinic.address || ""} {clinic.area ? `— ${clinic.area}` : ""}
        </p>
        <p className="text-[11px] font-bold">{clinic.phone || ""}</p>
        <p className="mt-1 break-all text-[9px] text-[#64748B]">{url}</p>
      </div>

      <button
        onClick={() => {
          const card = document.getElementById("sanad-clinic-card")?.outerHTML ?? "";
          const w = window.open("", "_blank", "width=480,height=680");
          if (!w) return;
          w.document.write(
            `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>كارت العيادة</title>` +
              `<style>body{font-family:system-ui,sans-serif;padding:24px;text-align:center}` +
              `img{width:220px;height:220px}div{border:2px dashed #06B6D4;border-radius:16px;padding:16px}</style>` +
              `</head><body>${card}</body></html>`,
          );
          w.document.close();
          w.focus();
          w.print();
        }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3 text-sm font-extrabold text-white shadow-soft"
      >
        <Printer className="h-4 w-4" /> طباعة كارت العيادة
      </button>
    </div>
  );
}
