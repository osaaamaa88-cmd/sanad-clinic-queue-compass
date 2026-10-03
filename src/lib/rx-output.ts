import type { RxPayload } from "@/lib/chat";

/** Renders the prescription onto a canvas (works with Arabic on any printer). */
export function renderRxCanvas(rx: RxPayload, width = 576): HTMLCanvasElement {
  const pad = 20;
  const lines: { t: string; size: number; bold?: boolean; color?: string; dir?: "ltr" | "rtl" }[] = [];
  const push = (t: string, size = 22, bold = false, color = "#111", dir: "ltr" | "rtl" = "rtl") => lines.push({ t, size, bold, color, dir });
  push(rx.doctor, 30, true, "#0e7490");
  if (rx.specialty) push(rx.specialty, 20);
  push(`سَنَد | SANAD — ${rx.date}`, 18, false, "#475569");
  push("—", 10);
  push(`المريض: ${rx.patient}${rx.age ? ` — السن: ${rx.age}` : ""}`, 22, true);
  if (rx.diagnosis) push(`التشخيص: ${rx.diagnosis}`, 20);
  push("℞", 40, true, "#0e7490", "ltr");
  rx.items.forEach((it, i) => {
    push(`${i + 1}. ${it.name}`, 24, true, "#111", "ltr");
    push(it.dose, 20, false, "#334155");
    if (it.notes) push(it.notes, 18, false, "#334155");
  });
  if (rx.tests) push(`تحاليل / أشعة: ${rx.tests}`, 20);
  if (rx.advice) push(`تعليمات: ${rx.advice}`, 20);
  push("—", 10);
  if (rx.clinicAddress) push(rx.clinicAddress, 18);
  if (rx.clinicPhone) push(`📞 ${rx.clinicPhone}`, 18);

  const font = (l: (typeof lines)[number]) => `${l.bold ? "bold " : ""}${l.size}px Tahoma, Arial, sans-serif`;
  const measure = document.createElement("canvas").getContext("2d")!;
  // wrap long lines
  const wrapped: ((typeof lines)[number])[] = [];
  for (const l of lines) {
    measure.font = font(l);
    const words = l.t.split(" ");
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (measure.measureText(next).width > width - pad * 2 && cur) { wrapped.push({ ...l, t: cur }); cur = w; } else cur = next;
    }
    wrapped.push({ ...l, t: cur });
  }
  const height = pad * 2 + wrapped.reduce((a, l) => a + l.size * 1.5, 0);
  const c = document.createElement("canvas");
  c.width = width; c.height = Math.ceil(height);
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
  let y = pad;
  for (const l of wrapped) {
    y += l.size * 1.5;
    g.font = font(l); g.fillStyle = l.color ?? "#111";
    if (l.t === "—") { g.fillRect(pad, y - l.size, width - pad * 2, 3); continue; }
    g.direction = l.dir ?? "rtl";
    g.textAlign = l.dir === "ltr" ? "left" : "right";
    g.fillText(l.t, l.dir === "ltr" ? pad : width - pad, y - l.size * 0.4);
  }
  return c;
}

export async function downloadRx(rx: RxPayload): Promise<"shared" | "downloaded"> {
  const c = renderRxCanvas(rx, 1000);
  const blob: Blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), "image/png"));
  const name = `roshta-${(rx.patient || "patient").replace(/\s+/g, "-")}.png`;
  const file = new File([blob], name, { type: "image/png" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigator as any;
  if (nav.canShare?.({ files: [file] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try { await nav.share({ files: [file], title: "روشتة سَنَد" }); return "shared"; }
    catch (e) { if ((e as Error).name === "AbortError") return "shared"; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = name; a.href = url; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "downloaded";
}

export const bluetoothSupported = () => typeof navigator !== "undefined" && "bluetooth" in navigator;

const SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
];

/** Prints to a Bluetooth thermal printer (ESC/POS raster). */
export async function printRxBluetooth(rx: RxPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bt = (navigator as any).bluetooth;
  if (!bt) throw new Error("المتصفح ده مش بيدعم البلوتوث. استخدم Chrome على أندرويد أو الكمبيوتر.");
  const device = await bt.requestDevice({ acceptAllDevices: true, optionalServices: SERVICES });
  const server = await device.gatt.connect();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ch: any = null;
  for (const s of await server.getPrimaryServices()) {
    for (const c of await s.getCharacteristics()) {
      if (c.properties.write || c.properties.writeWithoutResponse) { ch = c; break; }
    }
    if (ch) break;
  }
  if (!ch) throw new Error("الطابعة دي مش بتقبل الطباعة المباشرة.");

  const canvas = renderRxCanvas(rx, 384);
  const { width: w, height: h } = canvas;
  const px = canvas.getContext("2d")!.getImageData(0, 0, w, h).data;
  const bw = w / 8;
  const img = new Uint8Array(bw * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11 < 128) img[y * bw + (x >> 3)] |= 0x80 >> (x & 7);
  }
  const header = new Uint8Array([0x1b, 0x40, 0x1d, 0x76, 0x30, 0, bw & 255, bw >> 8, h & 255, h >> 8]);
  const data = new Uint8Array([...header, ...img, 0x0a, 0x0a, 0x0a, 0x0a]);
  for (let i = 0; i < data.length; i += 180) {
    const chunk = data.slice(i, i + 180);
    if (ch.properties.writeWithoutResponse) await ch.writeValueWithoutResponse(chunk);
    else await ch.writeValue(chunk);
  }
  device.gatt.disconnect();
}
