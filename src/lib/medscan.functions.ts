import { createServerFn } from "@tanstack/react-start";

export type DrugAlt = { name: string; company: string; note: string };
export type DrugScan = {
  found: boolean;
  name: string;
  active: string;
  strength: string;
  form: string;
  uses: string;
  usualDose: string;
  warnings: string;
  equivalents: DrugAlt[];
  similar: DrugAlt[];
};

export type LabItem = {
  name: string;
  value: string;
  unit: string;
  range: string;
  status: "normal" | "high" | "low" | "unknown";
  explain: string;
};
export type LabReport = {
  found: boolean;
  type: string;
  summary: string;
  comfort: string;
  items: LabItem[];
  questions: string[];
  urgent: boolean;
};

const DRUG_PROMPT = `أنت صيدلي مصري خبير بسوق الدواء المصري. اقرأ صورة/وصف علبة الدواء أو الروشتة.
أعد JSON فقط:
{"found":true,"name":"الاسم التجاري","active":"المادة الفعالة","strength":"التركيز","form":"أقراص/شراب/...","uses":"دواعي الاستعمال باختصار بالمصري","usualDose":"الجرعة المعتادة للبالغين (استرشادية)","warnings":"أهم التحذيرات والتداخلات باختصار","equivalents":[{"name":"اسم تجاري مصري بنفس المادة والتركيز","company":"الشركة","note":"ملاحظة قصيرة"}],"similar":[{"name":"بديل من نفس العائلة الدوائية","company":"الشركة","note":"يحتاج موافقة الطبيب"}]}
اقترح حتى 5 مثائل متوفرة في مصر و3 بدائل مشابهة. لا تخترع أدوية غير موجودة. لو لم تتعرف على دواء اجعل found=false.`;

const LAB_PROMPT = `أنت طبيب باطنة مصري حنون وصادق، بتكلم مريض قلقان ماسك ورقة تحليله. اتكلم بالعامية المصرية بدفء زي ما بتطمّن حد من أهلك، من غير تهويل ومن غير ما تخبي الحقيقة.
اقرأ الصورة بدقة شديدة: كل سطر في الورقة، الأرقام والوحدات والمعدلات المرجعية المطبوعة كما هي حرفياً. لو رقم مش واضح اكتب الحالة unknown وماتخمّنش.
أعد JSON فقط:
{"found":true,"type":"نوع التحليل","comfort":"رسالة طمأنة دافئة قصيرة (جملتين) تبدأ بكلمة حلوة زي ألف سلامة عليك، وتقدّر قلقه وتشجعه","summary":"ملخص صادق ومطمئن بالعامية المصرية في 2-3 جمل","items":[{"name":"اسم المؤشر","value":"القيمة","unit":"الوحدة","range":"المعدل الطبيعي","status":"normal|high|low|unknown","explain":"شرح بسيط وحنون بالمصري لمعنى النتيجة، ولو مش طبيعية قول إيه اللي ممكن يساعد"}],"questions":["سؤال تسأله لطبيبك"],"urgent":false}
استخدم المعدل المكتوب في الورقة إن وجد. urgent=true فقط لو فيه قيمة خطيرة تستدعي طوارئ، وفي الحالة دي خلّي رسالة الطمأنة هادية بس واضحة إنه يتحرك دلوقتي. لو مفيش تحليل في الصورة اجعل found=false. لا تشخّص أمراضاً قطعياً.`;

async function callGemini(prompt: string, text?: string, image?: string, mime?: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("الخدمة غير مضبوطة");
  const parts: any[] = [{ text: prompt }];
  if (text) parts.push({ text: `المدخل: ${text}` });
  if (image) parts.push({ inline_data: { mime_type: mime, data: image } });
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
    throw new Error("تعذر التحليل دلوقتي");
  }
  const raw = (json?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    throw new Error("ماقدرناش نقرأ الصورة، جرّب صورة أوضح");
  }
}

type In = { image?: string; mime?: string; text?: string };
const validate = (d: In) => {
  const image = typeof d?.image === "string" ? d.image : undefined;
  const text = typeof d?.text === "string" ? d.text.trim().slice(0, 1500) : undefined;
  if (!image && !text) throw new Error("ارفع صورة أو اكتب النص");
  if (image && image.length > 8_000_000) throw new Error("الصورة كبيرة جداً");
  const mime = d?.mime && /^image\/(jpeg|png|webp)$/.test(d.mime) ? d.mime : "image/jpeg";
  return { image, mime, text };
};
const s = (v: unknown, n = 200) => String(v ?? "").slice(0, n);
const alts = (a: unknown, n: number): DrugAlt[] =>
  (Array.isArray(a) ? a : []).slice(0, n).map((x: any) => ({ name: s(x?.name, 80), company: s(x?.company, 60), note: s(x?.note, 120) }));

export const scanDrug = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data }): Promise<DrugScan> => {
    const o = await callGemini(DRUG_PROMPT, data.text, data.image, data.mime);
    return {
      found: o.found !== false,
      name: s(o.name, 80),
      active: s(o.active, 120),
      strength: s(o.strength, 60),
      form: s(o.form, 40),
      uses: s(o.uses, 400),
      usualDose: s(o.usualDose, 300),
      warnings: s(o.warnings, 400),
      equivalents: alts(o.equivalents, 5),
      similar: alts(o.similar, 3),
    };
  });

export const readLab = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data }): Promise<LabReport> => {
    const o = await callGemini(LAB_PROMPT, data.text, data.image, data.mime);
    const st = (v: unknown): LabItem["status"] => (["normal", "high", "low"].includes(String(v)) ? (v as any) : "unknown");
    return {
      found: o.found !== false,
      type: s(o.type, 80),
      comfort: s(o.comfort, 400),
      summary: s(o.summary, 600),
      urgent: o.urgent === true,
      items: (Array.isArray(o.items) ? o.items : []).slice(0, 40).map((i: any) => ({
        name: s(i?.name, 60), value: s(i?.value, 30), unit: s(i?.unit, 20), range: s(i?.range, 40),
        status: st(i?.status), explain: s(i?.explain, 250),
      })),
      questions: (Array.isArray(o.questions) ? o.questions : []).slice(0, 5).map((q: any) => s(q, 200)),
    };
  });
