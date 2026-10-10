import { createServerFn } from "@tanstack/react-start";

export type FoodAnalysis = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  items: { name: string; amount: string; calories: number }[];
  advice: string;
};

const PROMPT = `أنت أخصائي تغذية مصري. حلّل الطعام (صورة أو وصف) وقدّر الكميات بواقعية مع مراعاة الأكلات المصرية والعربية.
أعد JSON فقط بهذا الشكل بدون أي نص آخر:
{"name":"اسم الطبق بالعربي","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"items":[{"name":"المكون","amount":"الكمية التقريبية","calories":0}],"advice":"نصيحة غذائية قصيرة بالعربية المصرية"}
الأرقام بالجرام وبالسعر الحراري، أعداد صحيحة. لو مفيش أكل في الصورة اجعل calories = 0 و name = "لا يوجد طعام".`;

export const analyzeFood = createServerFn({ method: "POST" })
  .inputValidator((d: { image?: string; mime?: string; text?: string }) => {
    const image = typeof d?.image === "string" ? d.image : undefined;
    const text = typeof d?.text === "string" ? d.text.trim().slice(0, 500) : undefined;
    if (!image && !text) throw new Error("ارفع صورة أو اكتب اسم الأكل");
    if (image && image.length > 6_000_000) throw new Error("الصورة كبيرة جداً");
    const mime = d?.mime && /^image\/(jpeg|png|webp)$/.test(d.mime) ? d.mime : "image/jpeg";
    return { image, mime, text };
  })
  .handler(async ({ data }): Promise<FoodAnalysis> => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("خدمة التحليل غير مضبوطة");
    const parts: any[] = [{ text: PROMPT }];
    if (data.text) parts.push({ text: `الوصف: ${data.text}` });
    if (data.image) parts.push({ inline_data: { mime_type: data.mime, data: data.image } });
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { responseMimeType: "application/json", thinkingConfig: { thinkingLevel: "low" } },
        }),
      },
    );
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 429) throw new Error("ضغط كبير على الخدمة، جرّب بعد دقيقة.");
      throw new Error("تعذر تحليل الأكل دلوقتي");
    }
    const raw = (json?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
    let o: any;
    try {
      o = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      throw new Error("ماقدرناش نفهم الصورة، جرّب صورة أوضح");
    }
    const n = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));
    return {
      name: String(o.name ?? "وجبة").slice(0, 80),
      calories: n(o.calories),
      protein: n(o.protein),
      carbs: n(o.carbs),
      fat: n(o.fat),
      fiber: n(o.fiber),
      items: (Array.isArray(o.items) ? o.items : []).slice(0, 12).map((i: any) => ({
        name: String(i?.name ?? "").slice(0, 60),
        amount: String(i?.amount ?? "").slice(0, 40),
        calories: n(i?.calories),
      })),
      advice: String(o.advice ?? "").slice(0, 300),
    };
  });
