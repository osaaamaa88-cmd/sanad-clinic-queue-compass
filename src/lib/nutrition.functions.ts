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

export type Alternative = {
  name: string;
  amount: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  saving: string;
  tip: string;
};

export const suggestEgyptianAlternatives = createServerFn({ method: "POST" })
  .inputValidator((d: { query: string; goal: string; target: number; eaten: number; recent: string[] }) => ({
    query: String(d?.query ?? "").trim().slice(0, 200),
    goal: ["lose", "keep", "gain"].includes(d?.goal) ? d.goal : "keep",
    target: Math.max(800, Math.min(6000, Math.round(Number(d?.target) || 2000))),
    eaten: Math.max(0, Math.min(10000, Math.round(Number(d?.eaten) || 0))),
    recent: (Array.isArray(d?.recent) ? d.recent : []).slice(0, 15).map((s) => String(s).slice(0, 60)),
  }))
  .handler(async ({ data }): Promise<{ alternatives: Alternative[]; error?: string }> => {
    if (!data.query) return { alternatives: [], error: "اكتب الوجبة أو هدفك" };
    const key = process.env.GEMINI_API_KEY;
    if (!key) return { alternatives: [], error: "الخدمة غير مضبوطة" };
    const goalAr = { lose: "إنقاص الوزن", keep: "تثبيت الوزن", gain: "زيادة الوزن والعضلات" }[data.goal];
    const remaining = data.target - data.eaten;
    const prompt = `أنت أخصائي تغذية مصري. المريض هدفه: ${goalAr}. احتياجه اليومي ${data.target} سعر، أكل النهارده ${data.eaten} (متبقي ${remaining}).
آخر وجباته: ${data.recent.join("، ") || "لا يوجد"}.
طلبه أو الوجبة اللي عايزها: "${data.query}".
اقترح 3 بدائل مصرية أصيلة متاحة وسعرها معقول، تناسب المتبقي وتكمّل النقص في سجله (مثلاً بروتين لو قليل). ممنوع تكرار نفس الأكلات اللي أكلها.
أعد JSON فقط بدون أي نص آخر:
{"alternatives":[{"name":"","amount":"الكمية","calories":0,"protein":0,"carbs":0,"fat":0,"saving":"مقارنة قصيرة بالأصل","tip":"طريقة تحضير صحية مصرية قصيرة"}]}`;
    try {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", thinkingConfig: { thinkingLevel: "low" } },
          }),
        },
      );
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("suggest alternatives failed", res.status);
        if (res.status === 429) return { alternatives: [], error: "ضغط كبير على الخدمة، جرّب بعد دقيقة." };
        return { alternatives: [], error: "تعذر اقتراح بدائل دلوقتي" };
      }
      const raw = (json?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
      const o = JSON.parse(raw.replace(/```json|```/g, "").trim());
      const n = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));
      const s = (v: unknown, m: number) => String(v ?? "").slice(0, m);
      return {
        alternatives: (Array.isArray(o?.alternatives) ? o.alternatives : []).slice(0, 4).map((a: any) => ({
          name: s(a?.name, 80), amount: s(a?.amount, 60), calories: n(a?.calories), protein: n(a?.protein),
          carbs: n(a?.carbs), fat: n(a?.fat), saving: s(a?.saving, 160), tip: s(a?.tip, 240),
        })),
      };
    } catch (e: any) {
      console.error("suggest alternatives failed", e?.message);
      return { alternatives: [], error: "تعذر اقتراح بدائل دلوقتي" };
    }
  });
