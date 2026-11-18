import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { checkStatus, isCriticalLab, type LabStatus } from "./lab-values";

export type DrugScan = {
  found: boolean;
  name: string;
  active: string;
  strength: string;
  form: string;
};

export type LabItem = {
  name: string;
  value: string;
  unit: string;
  range: string;
  status: LabStatus;
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

const DRUG_PROMPT = `اقرأ صورة/وصف علبة الدواء أو الروشتة وحدد المعلومات الظاهرة فقط.
لا تقدم استخدامات أو تحذيرات أو جرعات أو أدوية بديلة، ولا تستنتج معلومات غير ظاهرة.
أعد JSON فقط:
{"found":true,"name":"الاسم التجاري الظاهر","active":"المادة الفعالة إذا كانت ظاهرة","strength":"التركيز الظاهر","form":"الشكل الظاهر"}
لو لم تتعرف على دواء واضح اجعل found=false.`;

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

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

async function callGemini(prompt: string, text?: string, image?: string, mime?: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("الخدمة غير مضبوطة");
  const parts: JsonRecord[] = [{ text: prompt }];
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
      const json = asRecord(await res.json().catch(() => ({})));
      if (!res.ok) {
        if (res.status === 429) busy = true;
        continue;
      }
      const candidates = Array.isArray(json.candidates) ? json.candidates : [];
      const content = asRecord(asRecord(candidates[0]).content);
      const responseParts = Array.isArray(content.parts) ? content.parts : [];
      const raw = responseParts
        .map((part) => asRecord(part).text)
        .map((partText) => (typeof partText === "string" ? partText : ""))
        .join("");
      try {
        return asRecord(JSON.parse(raw.replace(/```json|```/g, "").trim()));
      } catch {
        throw new Error("ماقدرناش نقرأ الصورة، جرّب صورة أوضح");
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.startsWith("ماقدرناش")) throw error;
    }
  }
  throw new Error(busy ? "ضغط كبير على الخدمة، جرّب بعد دقيقة." : "تعذر التحليل دلوقتي، جرّب تاني");
}

type In = { image?: string; mime?: string; text?: string; consent?: boolean };
const validate = (d: In) => {
  if (d?.consent !== true) throw new Error("لازم توافق على إرسال البيانات للتحليل أولاً");
  const image = typeof d?.image === "string" ? d.image : undefined;
  const text = typeof d?.text === "string" ? d.text.trim().slice(0, 1500) : undefined;
  if (!image && !text) throw new Error("ارفع صورة أو اكتب النص");
  if (image && image.length > 8_000_000) throw new Error("الصورة كبيرة جداً");
  const mime = d?.mime && /^image\/(jpeg|png|webp)$/.test(d.mime) ? d.mime : "image/jpeg";
  return { image, mime, text, consent: true as const };
};
const s = (value: unknown, maxLength = 200) =>
  typeof value === "string" ? value.slice(0, maxLength) : "";

/**
 * Map any thrown error to a patient-friendly Arabic message.
 * Arabic AI/rate-limit messages pass through untouched; everything
 * else (network, JSON, missing key, server errors) gets a clear fallback.
 */
function aiFriendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  // Already patient-friendly Arabic messages from our own code.
  if (/[\u0600-\u06FF]/.test(msg) && msg.length < 200) return msg;
  if (/unauthori|auth|jwt|401/i.test(msg))
    return "سجّل دخولك الأول عشان تستخدم الفحص بالذكاء الاصطناعي.";
  if (/RATE_LIMITED|rate.?limit|429/i.test(msg))
    return "طلبات كتير ورا بعض، استنى دقيقة وجرب تاني.";
  if (/aborted|timeout|timed out|network|fetch|ENOTFOUND|ECONNRESET/i.test(msg))
    return "فيه مشكلة في الاتصال بالخدمة، تأكد من النت وجرب تاني.";
  if (/API.?key|GEMINI/i.test(msg)) return "الخدمة غير مضبوطة حالياً، جرب تاني بعدين.";
  return "حصلت مشكلة وقت التحليل، جرب تاني بصورة أوضح أو بعد شوية.";
}
export const scanDrug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }): Promise<DrugScan> => {
    try {
      await (await import("@/lib/rate-limit.server")).assertAiRateLimit("scanDrug", context.userId);
      const o = await callGemini(DRUG_PROMPT, data.text, data.image, data.mime);
      return {
        found: o.found === true,
        name: s(o.name, 80),
        active: s(o.active, 120),
        strength: s(o.strength, 60),
        form: s(o.form, 40),
      };
    } catch (error: unknown) {
      throw new Error(aiFriendlyError(error));
    }
  });

export const readLab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }): Promise<LabReport> => {
    try {
      await (await import("@/lib/rate-limit.server")).assertAiRateLimit("readLab", context.userId);
      const o = await callGemini(LAB_PROMPT, data.text, data.image, data.mime);
      const st = (value: unknown): LabItem["status"] =>
        value === "normal" || value === "high" || value === "low" ? value : "unknown";
      const items: LabItem[] = (Array.isArray(o.items) ? o.items : []).slice(0, 40).map((item) => {
        const result = asRecord(item);
        const value = s(result.value, 30),
          range = s(result.range, 40);
        return {
          name: s(result.name, 60),
          value,
          unit: s(result.unit, 20),
          range,
          status: checkStatus(value, range, st(result.status)),
          explain: s(result.explain, 250),
        };
      });
      return {
        found: o.found === true,
        type: s(o.type, 80),
        comfort: s(o.comfort, 400),
        summary: s(o.summary, 600),
        urgent: o.urgent === true || items.some((i) => isCriticalLab(i.name, i.value, i.unit)),
        items,
        questions: (Array.isArray(o.questions) ? o.questions : [])
          .slice(0, 5)
          .map((question) => s(question, 200)),
      };
    } catch (error: unknown) {
      throw new Error(aiFriendlyError(error));
    }
  });
