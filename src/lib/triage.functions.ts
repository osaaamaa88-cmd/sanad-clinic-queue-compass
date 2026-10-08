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

/** Returns null when no Gemini key is configured or the call fails, so the client falls back to the local quiz. */
export const aiTriage = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ need: z.string().trim().min(3).max(800) }).parse(d))
  .handler(async ({ data }): Promise<AiTriage | null> => {
    const key = process.env["GEMINI_API_KEY"];
    if (!key) return null;
    try {
      const { GoogleGenerativeAI, SchemaType } = await import("@google/generative-ai");
      const ids = specialties.map((s) => s.id);
      const list = specialties.map((s) => `${s.id}=${s.name}`).join("، ");
      const model = new GoogleGenerativeAI(key).getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: `${SYSTEM}\nاختر من هذه المعرّفات فقط: ${list}.\nاستخدم العامية المصرية الودودة، ولا تشخّص أمراضاً ولا تصف أدوية.`,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              specialtyIds: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING, format: "enum", enum: ids } },
              urgency: { type: SchemaType.STRING, format: "enum", enum: ["emergency", "soon", "routine"] },
              summary: { type: SchemaType.STRING },
              advice: { type: SchemaType.STRING },
            },
            required: ["specialtyIds", "urgency", "summary", "advice"],
          },
        },
      });
      const res = await model.generateContent(data.need);
      const parsed = JSON.parse(res.response.text()) as AiTriage;
      const valid = parsed.specialtyIds.filter((id) => ids.includes(id)).slice(0, 2);
      if (!valid.length) return null;
      return { ...parsed, specialtyIds: valid };
    } catch (e) {
      console.error("gemini triage failed", e);
      return null;
    }
  });
