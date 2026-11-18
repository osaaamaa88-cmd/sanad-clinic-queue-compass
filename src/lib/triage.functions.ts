import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchGeminiText, parseGeminiJson } from "./gemini";
import { specialties } from "./mock-data";

type AiTriage = {
  specialtyIds: string[];
  urgency: "emergency" | "soon" | "routine";
  summary: string;
  advice: string;
};

const SYSTEM =
  "أنت مساعد طبي ذكي لتطبيق سند. قم بتحليل أعراض المريض وتحديد التخصص الطبي المناسب بدقة (مثل: أسنان، جلدية، عظام، أطفال) وإرجاع النتيجة بتنسيق JSON محدد يتضمن التخصص المطلوب ونصيحة مبسطة باللغة العربية.";

const MODELS = ["gemini-3.5-flash", "gemini-3.7-flash", "gemini-3.8-flash"];

/** Returns null when AI is unavailable or fails, so the client falls back to the local quiz. */
export const aiTriage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ need: z.string().trim().min(3).max(800) }).parse(d))
  .handler(async ({ data }): Promise<AiTriage | null> => {
    await (await import("@/lib/rate-limit.server")).assertAiRateLimit("aiTriage");
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    const ids = specialties.map((s) => s.id);
    const list = specialties.map((s) => `${s.id}=${s.name}`).join("، ");
    const prompt = `${SYSTEM}
اختر تخصصاً أو اثنين بحد أقصى من هذه المعرّفات فقط وأعد المعرّف نفسه: ${list}.
الملخص جملة واحدة والنصيحة جملة أو اثنتين بالعامية المصرية الودودة. لا تشخّص أمراضاً ولا تصف أدوية. urgency تكون emergency للحالات الخطيرة، soon للأعراض الشديدة، routine غير ذلك.
أعد JSON فقط بدون أي نص آخر بهذا الشكل:
{"specialtyIds":["معرف"],"urgency":"routine","summary":"ملخص","advice":"نصيحة"}
شكوى المريض: "${data.need}"`;
    for (const model of MODELS) {
      try {
        const result = await fetchGeminiText({
          key,
          model,
          parts: [{ text: prompt }],
          signal: AbortSignal.timeout(40_000),
        });
        if (!result.ok) {
          if (result.status === 429 || result.status >= 500) continue;
          return null;
        }
        const raw = result.text;
        const o = parseGeminiJson(raw) as {
          specialtyIds?: unknown;
          urgency?: unknown;
          summary?: unknown;
          advice?: unknown;
        };
        const valid = (Array.isArray(o?.specialtyIds) ? o.specialtyIds : [])
          .filter((id) => typeof id === "string" && ids.includes(id))
          .slice(0, 2);
        if (!valid.length) return null;
        const urgency = ["emergency", "soon", "routine"].includes(o?.urgency as string)
          ? (o.urgency as "emergency" | "soon" | "routine")
          : "routine";
        return {
          specialtyIds: valid,
          urgency,
          summary: String(o?.summary ?? "").slice(0, 300),
          advice: String(o?.advice ?? "").slice(0, 400),
        };
      } catch (e) {
        console.error("ai triage failed", model, e instanceof Error ? e.name : "error");
      }
    }
    return null;
  });
