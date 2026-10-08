import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { specialties } from "./mock-data";

export type AiTriage = {
  specialtyIds: string[];
  urgency: "emergency" | "soon" | "routine";
  summary: string;
  advice: string;
};

const SYSTEM =
  "أنت مساعد طبي ذكي لتطبيق سَنَد. قم بتحليل أعراض المريض وتحديد التخصص الطبي المناسب بدقة (مثل: أسنان، جلدية، عظام، أطفال) وإرجاع النتيجة بتنسيق JSON محدد يتضمن التخصص المطلوب ونصيحة مبسطة باللغة العربية.";

/** Returns null when AI is unavailable or fails, so the client falls back to the local quiz. */
export const aiTriage = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ need: z.string().trim().min(3).max(800) }).parse(d))
  .handler(async ({ data }): Promise<AiTriage | null> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return null;
    try {
      const { createOpenAI } = await import("@ai-sdk/openai");
      const { streamText, Output } = await import("ai");
      const ids = specialties.map((s) => s.id);
      const list = specialties.map((s) => `${s.id}=${s.name}`).join("، ");
      const provider = createOpenAI({
        baseURL: "https://ai.gateway.lovable.dev/v1",
        apiKey: key,
        headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      });
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        instructions: `${SYSTEM}\nاختر تخصصاً أو اثنين بحد أقصى من هذه المعرّفات فقط وأعد المعرّف نفسه: ${list}.\nالملخص جملة واحدة والنصيحة جملة أو اثنتين بالعامية المصرية الودودة. لا تشخّص أمراضاً ولا تصف أدوية. urgency تكون emergency للحالات الخطيرة، soon للأعراض الشديدة، routine غير ذلك.`,
        messages: [{ role: "user", content: data.need }],
        output: Output.object({
          schema: z.object({
            specialtyIds: z.array(z.string()),
            urgency: z.enum(["emergency", "soon", "routine"]),
            summary: z.string(),
            advice: z.string(),
          }),
        }),
        providerOptions: {
          openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] },
        },
      } as Parameters<typeof streamText>[0]);
      const out = (await result.output) as AiTriage;
      const valid = out.specialtyIds.filter((id) => ids.includes(id)).slice(0, 2);
      if (!valid.length) return null;
      return { ...out, specialtyIds: valid };
    } catch (e) {
      console.error("ai triage failed", e instanceof Error ? e.name : "error");
      return null;
    }
  });
