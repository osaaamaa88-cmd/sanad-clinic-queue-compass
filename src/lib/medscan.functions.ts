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
اقرأ الصورة بدقة شديدة: كل سطر في الورقة، الأرقام والوحدات والمعدلات المرجعية المطبوعة كما هي حرفياً. لو رقم مش واضح اكتب الحالة unknown وماتخمّنش. ماتضيفش مؤشرات مش مكتوبة.
قواعد مهمة جداً:
- حدد status بمقارنة الرقم بالمعدل المطبوع فقط (H/L أو علامة المعمل تأكيد إضافي).
- ممنوع الطمأنة الكاذبة: ماتقولش "مافيش أي حاجة تقلق" ولا "ما تقلقش خالص" لو فيه نتايج مش طبيعية. قول إنها تستاهل متابعة بهدوء.
- ممنوع التشخيص القطعي: استخدم "ممكن يكون/محتاج دكتور يأكد" بدل "عندك مرض كذا". ماتستنتجش "مافيش التهابات" أو أي حاجة أكبر من الرقم.
- ممنوع كلمات مخيفة زي سرطان/فشل/خطير جداً إلا لو القيمة حرجة فعلاً.
- القيم الحرجة (مثلاً بوتاسيوم >6 أو <2.8، صوديوم <125 أو >155، سكر <54 أو >400، هيموجلوبين <7، صفائح <20 ألف) => urgent=true مع رسالة هادية وواضحة: روح طوارئ أو كلّم دكتور النهارده.
- الفرق البسيط جداً عن المعدل وصفه "أقل/أعلى بفرق بسيط".
أعد JSON فقط:
{"found":true,"type":"نوع التحليل","comfort":"رسالة طمأنة دافئة قصيرة (جملتين) تبدأ بكلمة حلوة زي ألف سلامة عليك، وتقدّر قلقه من غير ما تنكر النتايج","summary":"ملخص صادق ومطمئن بالعامية المصرية في 2-3 جمل","items":[{"name":"اسم المؤشر","value":"القيمة","unit":"الوحدة","range":"المعدل الطبيعي","status":"normal|high|low|unknown","explain":"شرح بسيط وحنون بالمصري، ولو مش طبيعية قول إيه اللي ممكن يساعد"}],"questions":["سؤال تسأله لطبيبك"],"urgent":false}
لو مفيش تحليل في الصورة اجعل found=false.`;

const MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

async function callGemini(prompt: string, text?: string, image?: string, mime?: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("الخدمة غير مضبوطة");
  const parts: any[] = [{ text: prompt }];
  if (text) parts.push({ text: `المدخل: ${text}` });
  if (image) parts.push({ inline_data: { mime_type: mime, data: image } });
  let busy = false;
  for (const model of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          signal: AbortSignal.timeout(40_000),
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        },
      );
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) busy = true;
        continue;
      }
      const raw = (json?.candidates?.[0]?.content?.parts ?? [])
        .map((p: any) => p.text ?? "")
        .join("");
      try {
        return JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch {
        throw new Error("ماقدرناش نقرأ الصورة، جرّب صورة أوضح");
      }
    } catch (e: any) {
      if (e?.message?.startsWith("ماقدرناش")) throw e;
    }
  }
  throw new Error(busy ? "ضغط كبير على الخدمة، جرّب بعد دقيقة." : "تعذر التحليل دلوقتي، جرّب تاني");
}

/** Recompute status from the printed range so a model slip can't flip normal/high/low. */
export function checkStatus(
  value: string,
  range: string,
  given: LabItem["status"],
): LabItem["status"] {
  const v = parseFloat(value.replace(/,/g, "").match(/-?\d+(\.\d+)?/)?.[0] ?? "");
  if (isNaN(v)) return given;
  const nums = (range.replace(/,/g, "").match(/\d+(\.\d+)?/g) ?? []).map(Number);
  if (/^\s*(<|≤|up to|less|حتى|أقل)/i.test(range) && nums.length === 1)
    return v > nums[0] ? "high" : "normal";
  if (/^\s*(>|≥|more|أكثر|أكبر)/i.test(range) && nums.length === 1)
    return v < nums[0] ? "low" : "normal";
  if (nums.length === 2 && nums[0] < nums[1])
    return v < nums[0] ? "low" : v > nums[1] ? "high" : "normal";
  return given;
}

/** Deterministic critical-value check — independent of the model. */
export function isCriticalLab(name: string, value: string, unit: string): boolean {
  let v = parseFloat(value.replace(/,/g, "").match(/-?\d+(\.\d+)?/)?.[0] ?? "");
  if (isNaN(v)) return false;
  const n = name.toLowerCase(),
    u = unit.toLowerCase();
  if (/potassium|\bk\+?\b|بوتاسيوم/.test(n)) return v < 2.8 || v > 6.0;
  if (/sodium|\bna\+?\b|صوديوم/.test(n)) return v < 125 || v > 155;
  if (/glucose|sugar|\bfbs\b|\brbs\b|سكر|جلوكوز/.test(n) && !/hba1c|a1c|تراكمي/.test(n)) {
    if (u.includes("mmol")) v *= 18;
    return v < 54 || v > 400;
  }
  if (/h(a)?emoglobin|\bhgb\b|\bhb\b|هيموجلوبين/.test(n) && !/a1c|glyc/.test(n)) {
    if (u.includes("g/l") && !u.includes("dl")) v /= 10;
    return v < 7;
  }
  if (/platelet|\bplt\b|صفائح/.test(n)) {
    if (v < 2000) v *= 1000; // reported as x10^3/µL
    return v < 20000;
  }
  return false;
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

/**
 * Map any thrown error to a patient-friendly Arabic message.
 * Arabic AI/rate-limit messages pass through untouched; everything
 * else (network, JSON, missing key, server errors) gets a clear fallback.
 */
function aiFriendlyError(e: unknown): string {
  const msg = (e as Error)?.message || String(e ?? "");
  // Already patient-friendly Arabic messages from our own code.
  if (/[\u0600-\u06FF]/.test(msg) && msg.length < 200) return msg;
  if (/RATE_LIMITED|rate.?limit|429/i.test(msg))
    return "طلبات كتير ورا بعض، استنى دقيقة وجرب تاني.";
  if (/aborted|timeout|timed out|network|fetch|ENOTFOUND|ECONNRESET/i.test(msg))
    return "فيه مشكلة في الاتصال بالخدمة، تأكد من النت وجرب تاني.";
  if (/API.?key|GEMINI/i.test(msg)) return "الخدمة غير مضبوطة حالياً، جرب تاني بعدين.";
  return "حصلت مشكلة وقت التحليل، جرب تاني بصورة أوضح أو بعد شوية.";
}
const alts = (a: unknown, n: number): DrugAlt[] =>
  (Array.isArray(a) ? a : [])
    .slice(0, n)
    .map((x: any) => ({ name: s(x?.name, 80), company: s(x?.company, 60), note: s(x?.note, 120) }));

export const scanDrug = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data, context }): Promise<DrugScan> => {
    try {
      await (
        await import("@/lib/rate-limit.server")
      ).assertAiRateLimit("scanDrug", (context as any)?.userId);
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
    } catch (e: any) {
      throw new Error(aiFriendlyError(e));
    }
  });

export const readLab = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data, context }): Promise<LabReport> => {
    try {
      await (
        await import("@/lib/rate-limit.server")
      ).assertAiRateLimit("readLab", (context as any)?.userId);
      const o = await callGemini(LAB_PROMPT, data.text, data.image, data.mime);
      const st = (v: unknown): LabItem["status"] =>
        ["normal", "high", "low"].includes(String(v)) ? (v as any) : "unknown";
      const items: LabItem[] = (Array.isArray(o.items) ? o.items : [])
        .slice(0, 40)
        .map((i: any) => {
          const value = s(i?.value, 30),
            range = s(i?.range, 40);
          return {
            name: s(i?.name, 60),
            value,
            unit: s(i?.unit, 20),
            range,
            status: checkStatus(value, range, st(i?.status)),
            explain: s(i?.explain, 250),
          };
        });
      return {
        found: o.found !== false,
        type: s(o.type, 80),
        comfort: s(o.comfort, 400),
        summary: s(o.summary, 600),
        urgent: o.urgent === true || items.some((i) => isCriticalLab(i.name, i.value, i.unit)),
        items,
        questions: (Array.isArray(o.questions) ? o.questions : [])
          .slice(0, 5)
          .map((q: any) => s(q, 200)),
      };
    } catch (e: any) {
      throw new Error(aiFriendlyError(e));
    }
  });
