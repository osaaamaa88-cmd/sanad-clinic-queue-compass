import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SYSTEM = `You are 'سَنَد', a warm and highly reassuring Egyptian voice medical assistant for visually impaired users.
- Analyze user symptoms spoken in Egyptian slang.
- You are given the nearest governmental hospital from the database; recommend it by name when relevant. Never invent phone numbers or addresses.
- If symptoms sound life-threatening (chest pain, can't breathe, unconscious, heavy bleeding), tell them to call 123 immediately.
- Respond ONLY in simple, comforting Egyptian Arabic (عامية مصرية بسيطة). No diagnosis certainty, no medication doses.
- Keep answers under 3 short sentences and end with: 'تحب أطلبلك رقم المستشفى دلوقتي، ولا أوصفلك العنوان؟'`;

const ENDING = "تحب أطلبلك رقم المستشفى دلوقتي، ولا أوصفلك العنوان؟";

function dist(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export const voiceAssist = createServerFn({ method: "POST" })
  .inputValidator((d: { text: string; lat?: number; lng?: number }) => ({
    text: String(d?.text ?? "").slice(0, 500),
    lat: Number.isFinite(d?.lat) ? Number(d.lat) : 30.0444,
    lng: Number.isFinite(d?.lng) ? Number(d.lng) : 31.2357,
  }))
  .handler(async ({ data }) => {
    const sb = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: rows } = await sb
      .from("governmental_hospitals")
      .select("name,phone,emergency_phone,address,district,governorate,lat,lng,emergency_24h,location_verified");
    const list = (rows ?? []).map((h) => ({ ...h, km: dist(data, h) })).sort((a, b) => a.km - b.km);
    const h = list.find((x) => x.emergency_24h) ?? list[0] ?? null;
    const hospital = h
      ? {
          name: h.name,
          phone: h.phone || h.emergency_phone || "123",
          address: [h.address, h.district, h.governorate].filter(Boolean).join("، "),
          km: Math.round(h.km * 10) / 10,
          approx: !h.location_verified,
          lat: h.lat,
          lng: h.lng,
        }
      : null;

    const fallback = hospital
      ? `ألف سلامة عليك، متقلقش أنا معاك. أقرب مستشفى ليك ${hospital.name} على بعد حوالي ${hospital.km} كيلو. ${ENDING}`
      : `ألف سلامة عليك. لو الحالة خطيرة اتصل بالإسعاف 123 فوراً.`;

    const key = process.env.GROQ_API_KEY;
    if (!key) return { reply: fallback, hospital, ai: false };
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: SYSTEM },
            {
              role: "user",
              content: `أقرب مستشفى: ${hospital ? `${hospital.name} (${hospital.km} كم)` : "غير متاح"}\nكلام المستخدم: ${data.text}`,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const j = await res.json();
      let reply = String(j.choices?.[0]?.message?.content ?? "").trim().slice(0, 600);
      if (!reply) reply = fallback;
      if (hospital && !reply.includes("تحب أطلبلك")) reply += ` ${ENDING}`;
      return { reply, hospital, ai: true };
    } catch {
      return { reply: fallback, hospital, ai: false };
    }
  });

const clip = (s: unknown, n: number) => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").slice(0, n);

// Public: logs real runtime errors (rate-limited) into app_error_logs for the admin health panel.
export const reportRuntimeError = createServerFn({ method: "POST" })
  .inputValidator((d: { message?: string; screen?: string; device?: string }) => ({
    message: clip(d?.message || "خطأ غير معروف", 400),
    screen: clip(d?.screen, 120),
    device: clip(d?.device, 160),
  }))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const since = new Date(Date.now() - 60_000).toISOString();
      const { count } = await supabaseAdmin.from("app_error_logs").select("id", { count: "exact", head: true }).gte("created_at", since);
      if ((count ?? 0) < 30) {
        await supabaseAdmin.from("app_error_logs").insert({
          screen: data.screen || null,
          message: `runtime: ${data.message} | device: ${data.device}`,
        });
      }
    } catch {
      /* never break the caller */
    }
    return { ok: true as const };
  });
