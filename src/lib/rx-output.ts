import type { RxPayload } from "@/lib/chat";

/** Renders the prescription onto a canvas (works with Arabic on any printer). */
export function renderRxCanvas(rx: RxPayload, width = 576): HTMLCanvasElement {
  const pad = 20;
  const lines: { t: string; size: number; bold?: boolean; color?: string; dir?: "ltr" | "rtl" }[] =
    [];
  const push = (t: string, size = 22, bold = false, color = "#111", dir: "ltr" | "rtl" = "rtl") =>
    lines.push({ t, size, bold, color, dir });
  push(rx.doctor, 30, true, "#0e7490");
  if (rx.specialty) push(rx.specialty, 20);
  push(`سَنَد | SANAD — ${rx.date}`, 18, false, "#475569");
  push("—", 10);
  push(`المريض: ${rx.patient}${rx.age ? ` — السن: ${rx.age}` : ""}`, 22, true);
  if (rx.diagnosis) push(`التشخيص: ${rx.diagnosis}`, 20);
  push("℞", 40, true, "#0e7490", "ltr");
  rx.items.forEach((it, i) => {
    push(`${i + 1}. ${it.name}`, 24, true, "#111", "ltr");
    push(`← ${it.dose}`, 21, true, "#0e7490");
    if (it.notes) push(it.notes, 18, false, "#334155");
    if (i < rx.items.length - 1) push("·", 8);
  });
  if (rx.tests) push(`تحاليل / أشعة: ${rx.tests}`, 20);
  if (rx.advice) push(`تعليمات: ${rx.advice}`, 20);
  push("—", 10);
  if (rx.clinicAddress) push(rx.clinicAddress, 18);
  if (rx.clinicPhone) push(`📞 ${rx.clinicPhone}`, 18);

  const font = (l: (typeof lines)[number]) =>
    `${l.bold ? "bold " : ""}${l.size}px Cairo, Tahoma, Arial, sans-serif`;
  const measure = document.createElement("canvas").getContext("2d")!;
  // wrap long lines
  const wrapped: (typeof lines)[number][] = [];
  for (const l of lines) {
    measure.font = font(l);
    const words = l.t.split(" ");
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (measure.measureText(next).width > width - pad * 2 && cur) {
        wrapped.push({ ...l, t: cur });
        cur = w;
      } else cur = next;
    }
    wrapped.push({ ...l, t: cur });
  }
  const height = pad * 2 + wrapped.reduce((a, l) => a + l.size * 1.5, 0);
  const c = document.createElement("canvas");
  c.width = width;
  c.height = Math.ceil(height);
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  let y = pad;
  for (const l of wrapped) {
    y += l.size * 1.5;
    g.font = font(l);
    g.fillStyle = l.color ?? "#111";
    if (l.t === "—") {
      g.fillRect(pad, y - l.size, width - pad * 2, 3);
      continue;
    }
    if (l.t === "·") {
      for (let x = pad; x < width - pad; x += 12) g.fillRect(x, y - l.size, 6, 2);
      continue;
    }
    g.direction = l.dir ?? "rtl";
    g.textAlign = l.dir === "ltr" ? "left" : "right";
    g.fillText(l.t, l.dir === "ltr" ? pad : width - pad, y - l.size * 0.4);
  }
  return c;
}

const GOLD = "#b08d57",
  INK = "#3a3a3a";
/** Gold "real clinic paper" design used for the downloaded image. */
export function renderRxFancy(rx: RxPayload): HTMLCanvasElement {
  const W = 1000,
    P = 56;
  const m = document.createElement("canvas").getContext("2d")!;
  const wrap = (t: string, font: string, max: number) => {
    m.font = font;
    const out: string[] = [];
    let cur = "";
    for (const w of t.split(" ")) {
      const n = cur ? `${cur} ${w}` : w;
      if (m.measureText(n).width > max && cur) {
        out.push(cur);
        cur = w;
      } else cur = n;
    }
    out.push(cur);
    return out;
  };
  const F = (sz: number, b = false) =>
    `${b ? "bold " : ""}${sz}px Cairo, Tahoma, Arial, sans-serif`;
  type Op = (g: CanvasRenderingContext2D, y: number) => void;
  const ops: { h: number; draw: Op }[] = [];
  const text = (
    t: string,
    sz: number,
    opt: { b?: boolean; c?: string; ltr?: boolean; x?: number; max?: number } = {},
  ) => {
    for (const line of wrap(t, F(sz, opt.b), opt.max ?? W - P * 2))
      ops.push({
        h: sz * 1.55,
        draw: (g, y) => {
          g.font = F(sz, opt.b);
          g.fillStyle = opt.c ?? INK;
          g.direction = opt.ltr ? "ltr" : "rtl";
          g.textAlign = opt.ltr ? "left" : "right";
          g.fillText(line, opt.ltr ? (opt.x ?? P) : W - (opt.x ?? P), y + sz * 1.15);
        },
      });
  };
  const bar = () =>
    ops.push({
      h: 26,
      draw: (g, y) => {
        const gr = g.createLinearGradient(0, 0, W, 0);
        gr.addColorStop(0, GOLD);
        gr.addColorStop(0.5, "#c9a96e");
        gr.addColorStop(1, GOLD);
        g.fillStyle = gr;
        g.fillRect(0, y + 8, W, 10);
      },
    });
  const gap = (h: number) => ops.push({ h, draw: () => {} });
  const doc = rx.doctor.trim().startsWith("د") ? rx.doctor : `د/ ${rx.doctor}`;
  const dental = /أسنان|اسنان|dental|dent/i.test(`${rx.specialty} ${rx.doctor}`);
  gap(24);
  text(doc, 44, { b: true });
  if (rx.specialty) text(rx.specialty, 28, { c: "#555" });
  ops.push({
    h: 0,
    draw: (g) => {
      g.font = "bold 22px Arial";
      g.fillStyle = "#222";
      g.textAlign = "left";
      g.direction = "ltr";
      g.fillText(dental ? "DENTAL CLINIC" : "MEDICAL CLINIC", P, 120);
      g.font = "64px serif";
      g.fillStyle = GOLD;
      g.fillText(dental ? "🦷" : "✚", P + 40, 80);
    },
  });
  gap(12);
  bar();
  gap(14);
  const field = (label: string, val: string) =>
    ops.push({
      h: 50,
      draw: (g, y) => {
        g.direction = "ltr";
        g.textAlign = "left";
        g.font = F(24, true);
        g.fillStyle = GOLD;
        g.fillText(`• ${label}`, P, y + 34);
        g.font = F(26, true);
        g.fillStyle = "#222";
        g.fillText(val, P + 170, y + 32);
        g.fillStyle = "#999";
        for (let x = P + 165; x < W - P - 200; x += 9) g.fillRect(x, y + 42, 3, 3);
      },
    });
  field("Name", rx.patient);
  field("Date", rx.date);
  if (rx.age) field("Age", rx.age);
  if (rx.diagnosis) field("Diagnosis", rx.diagnosis);
  gap(10);
  ops.push({
    h: 80,
    draw: (g, y) => {
      g.font = "italic 72px 'Great Vibes', Georgia, serif";
      g.fillStyle = GOLD;
      g.direction = "ltr";
      g.textAlign = "left";
      g.fillText("R /", P, y + 66);
    },
  });
  rx.items.forEach((it, i) => {
    ops.push({
      h: 52,
      draw: (g, y) => {
        g.fillStyle = GOLD;
        g.beginPath();
        g.arc(P + 16, y + 28, 16, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#fff";
        g.font = F(18, true);
        g.textAlign = "center";
        g.direction = "ltr";
        g.fillText(String(i + 1), P + 16, y + 35);
        g.textAlign = "left";
        g.font = "800 32px 'Open Sans', Arial, sans-serif";
        g.fillStyle = "#222";
        g.fillText(it.name, P + 46, y + 40);
      },
    });
    text(it.dose, 26, { b: true, c: "#7a5f33", x: P + 10 });
    if (it.notes) text(it.notes, 22, { c: "#666", x: P + 10 });
    if (i < rx.items.length - 1)
      ops.push({
        h: 18,
        draw: (g, y) => {
          g.fillStyle = "#cbbd9f";
          for (let x = P; x < W - P; x += 14) g.fillRect(x, y + 8, 7, 2);
        },
      });
  });
  const box = (label: string, val: string) => {
    gap(12);
    text(`${label}: ${val}`, 23, { c: "#5a4626", x: P + 14 });
  };
  if (rx.tests) box("تحاليل / أشعة", rx.tests);
  if (rx.advice) box("تعليمات", rx.advice);
  gap(40);
  bar();
  gap(6);
  if (rx.clinicAddress) text(`العنوان: ${rx.clinicAddress}`, 23, { b: true });
  if (rx.clinicHours) text(`مواعيد العمل: ${rx.clinicHours}`, 23);
  if (rx.clinicPhone) text(`${rx.clinicPhone}  :للحجز والاستعلام`, 26, { b: true, c: GOLD });
  gap(6);
  text("صادرة عبر سَنَد | SANAD — منظومتك الطبية", 19, { c: "#8a8a8a" });
  gap(20);
  const H = Math.ceil(ops.reduce((a, o) => a + o.h, 0));
  const c = document.createElement("canvas");
  c.width = W;
  c.height = Math.max(H, 1300);
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, W, c.height);
  g.save();
  g.globalAlpha = 0.07;
  g.font = "520px serif";
  g.fillStyle = GOLD;
  g.textAlign = "center";
  g.fillText(dental ? "🦷" : "✚", W / 2, c.height / 2 + 180);
  g.restore();
  let y = 0;
  for (const o of ops) {
    o.draw(g, y);
    y += o.h;
  }
  return c;
}

export async function downloadRx(rx: RxPayload): Promise<"shared" | "downloaded"> {
  const c = renderRxFancy(rx);
  const blob: Blob = await new Promise((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), "image/png"),
  );
  const name = `roshta-${(rx.patient || "patient").replace(/\s+/g, "-")}.png`;
  const file = new File([blob], name, { type: "image/png" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigator as any;
  if (nav.canShare?.({ files: [file] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try {
      await nav.share({ files: [file], title: "روشتة سَنَد" });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "shared";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = name;
  a.href = url;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "downloaded";
}

export const bluetoothSupported = () =>
  typeof navigator !== "undefined" && "bluetooth" in navigator;

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
      if (c.properties.write || c.properties.writeWithoutResponse) {
        ch = c;
        break;
      }
    }
    if (ch) break;
  }
  if (!ch) throw new Error("الطابعة دي مش بتقبل الطباعة المباشرة.");

  const canvas = renderRxCanvas(rx, 384);
  const { width: w, height: h } = canvas;
  const px = canvas.getContext("2d")!.getImageData(0, 0, w, h).data;
  const bw = w / 8;
  const img = new Uint8Array(bw * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11 < 128)
        img[y * bw + (x >> 3)] |= 0x80 >> (x & 7);
    }
  const header = new Uint8Array([
    0x1b,
    0x40,
    0x1d,
    0x76,
    0x30,
    0,
    bw & 255,
    bw >> 8,
    h & 255,
    h >> 8,
  ]);
  const data = new Uint8Array([...header, ...img, 0x0a, 0x0a, 0x0a, 0x0a]);
  for (let i = 0; i < data.length; i += 180) {
    const chunk = data.slice(i, i + 180);
    if (ch.properties.writeWithoutResponse) await ch.writeValueWithoutResponse(chunk);
    else await ch.writeValue(chunk);
  }
  device.gatt.disconnect();
}
