import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { specialties } from "./mock-data";

export type TriageResult = {
  specialtyIds: string[];
  urgency: "emergency" | "soon" | "routine";
  summary: string;
  advice: string;
  areaHint: string | null;
};

export async function runTriage(need: string, location: string): Promise<TriageResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const list = specialties.map((s) => `${s.id}: ${s.name}`).join("\n");
  const system = `أنت مساعد توجيه طبي في تطبيق سَنَد بمصر. لا تشخّص ولا تصف أدوية.
افهم احتياج المريض واختر من 1 إلى 3 تخصصات مناسبة فقط من القائمة التالية (استخدم الـ id حرفياً):
${list}
حدد الإلحاح: emergency لو أعراض خطيرة (ألم صدر، صعوبة تنفس، نزيف شديد، فقدان وعي، شلل مفاجئ)، soon لو تحتاج كشف خلال يوم أو يومين، وإلا routine.
أعد JSON فقط بدون أي نص آخر بالشكل:
{"specialtyIds":["..."],"urgency":"routine","summary":"جملة قصيرة بالعامية المصرية تلخص الطلب","advice":"نصيحة عامة قصيرة آمنة","areaHint":"اسم منطقة ذكرها المريض أو null"}`;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system,
    prompt: `احتياج المريض: ${need}\nموقع المريض: ${location}`,
    maxRetries: 0,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = await result.text;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI_BAD_OUTPUT");
  const raw = JSON.parse(match[0]) as Partial<TriageResult>;
  const valid = new Set(specialties.map((s) => s.id));
  const ids = (raw.specialtyIds ?? []).filter((id) => valid.has(id)).slice(0, 3);
  const urgency = raw.urgency === "emergency" || raw.urgency === "soon" ? raw.urgency : "routine";
  return {
    specialtyIds: ids.length ? ids : ["family-medicine"],
    urgency,
    summary: String(raw.summary ?? "").slice(0, 300),
    advice: String(raw.advice ?? "").slice(0, 400),
    areaHint: raw.areaHint ? String(raw.areaHint).slice(0, 60) : null,
  };
}
