// Free, offline rule-based triage for Egyptian colloquial Arabic.
import { getSpecialty } from "./mock-data";

export type TriageResult = {
  specialtyIds: string[];
  urgency: "emergency" | "soon" | "routine";
  summary: string;
  advice: string;
};

const norm = (s: string) =>
  s
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();

const rules: { id: string; words: string[]; advice: string }[] = [
  { id: "dental", words: ["سنان", "سنه", "ضرس", "ضروس", "لثه", "تسوس", "حشو", "تقويم", "عصب", "خلع", "فك"], advice: "اغسل بمية دافية وملح، وابعد عن الحاجات الساقعة والسخنة جداً." },
  { id: "pediatrics", words: ["ابني", "بنتي", "طفل", "عيل", "رضيع", "تطعيم", "بيبي", "ابنى"], advice: "تابع حرارة الطفل وخليه يشرب سوائل كتير." },
  { id: "internal", words: ["سخونيه", "حراره", "مغص", "معده", "ترجيع", "اسهال", "حموضه", "ضغط", "سكر", "دوخه", "صداع", "تعب", "برد", "انفلونزا"], advice: "اشرب سوائل كتير وارتاح لحد ما تكشف." },
  { id: "gastro", words: ["قولون", "انتفاخ", "امساك", "معده", "كبد", "مرار", "بواسير"], advice: "قلل الأكل الدسم والحار." },
  { id: "ortho", words: ["ضهري", "ظهري", "ركبه", "ركبتي", "عضم", "كسر", "فقرات", "غضروف", "مفصل", "كتف", "رقبه", "التواء", "كاحل"], advice: "ريّح المكان المصاب واعمل كمادات تلج أول يومين." },
  { id: "eye", words: ["عين", "عيني", "زغلله", "نظاره", "رموش", "نظر", "احمرار عين", "دموع"], advice: "ماتدعكش عينك وابعد عن الشاشات شوية." },
  { id: "ent", words: ["ودن", "اذن", "زور", "لوز", "جيوب", "مناخير", "انف", "صوتي", "بلع", "طنين"], advice: "غرغر بمية دافية وملح." },
  { id: "derma", words: ["جلد", "حبوب", "حب الشباب", "هرش", "حكه", "اكزيما", "شعر", "تساقط", "قشره", "بقع", "طفح"], advice: "ماتحطش كريمات من غير استشارة." },
  { id: "cardio", words: ["قلب", "خفقان", "ضربات", "نهجان", "تورم رجل"], advice: "ابعد عن المجهود لحد الكشف." },
  { id: "chest", words: ["كحه", "صدر", "ربو", "حساسيه صدر", "بلغم", "تنفس"], advice: "ابعد عن التدخين والتراب." },
  { id: "gyneco", words: ["حمل", "حامل", "دوره", "رحم", "ولاده", "تبويض", "مراتي"], advice: "سجّلي مواعيد الدورة والأعراض قبل الكشف." },
  { id: "urology", words: ["كلي", "كلى", "مثانه", "حرقان بول", "بول", "حصوه", "بروستاتا"], advice: "اشرب مية كتير." },
  { id: "neuro", words: ["تنميل", "صرع", "تشنج", "شلل", "رعشه", "صداع نصفي", "اعصاب"], advice: "دوّن مواعيد النوبات ومدتها." },
  { id: "psychiatry", words: ["اكتئاب", "قلق", "توتر", "نوم", "ارق", "نفسيتي", "خوف", "وسواس"], advice: "مش لوحدك — الكلام مع متخصص بيفرق كتير." },
  { id: "endocrinology", words: ["غده", "درقيه", "هرمونات", "سكري"], advice: "خد معاك آخر تحاليل عملتها." },
  { id: "nutrition", words: ["تخسيس", "وزن", "رجيم", "سمنه", "نحافه"], advice: "ابدأ بتقليل السكريات والمشروبات الغازية." },
  { id: "physiotherapy", words: ["علاج طبيعي", "تأهيل", "تيبس", "شد عضلي"], advice: "تمارين إطالة خفيفة بتساعد." },
];

const emergencyWords = [
  "وجع صدر شديد", "الم صدر شديد", "الم في الصدر", "وجع في صدري", "ضغط على صدري", "مش قادر اتنفس", "صعوبه تنفس", "بتخنق", "اختناق", "شفايفي زرقا", "ازرق",
  "نزيف", "بينزف", "دم كتير", "ترجيع دم", "كحه بدم", "براز اسود", "اغماء", "اغمي", "فقد الوعي", "مش بيفوق", "تشنجات", "تشنج", "حادثه", "خبطه في الراس", "وقع على راسه",
  "تسمم", "بلع", "ابتلع", "جرعه زياده", "جلطه", "شلل مفاجئ", "وشي مايل", "لساني تقيل", "مش قادر احرك", "تنميل نص", "عايز انتحر", "انتحار", "اموت نفسي",
  "حساسيه شديده", "ورم في الزور", "لدغه", "عضه تعبان", "عقرب", "صعقه", "غرق", "حرق في", "اتحرق", "اتحرقت", "حروق", "مايه سخنه", "زيت سخن", "نار",
];
// Words that contain an emergency keyword but describe non-emergency symptoms (e.g. burning urination).
const benignPhrases = ["حرقان", "حرقه", "حموضه", "بلع الاكل", "صعوبه في البلع", "نار في المعده", "نار في البول"];
const soonWords = ["شديد", "جامد", "مش قادر", "من امبارح", "ورم", "وارم", "سخونيه عاليه", "مستمر"];

export function runLocalTriage(need: string): TriageResult {
  const t = norm(need);
  const scores = rules
    .map((r) => ({ r, s: r.words.filter((w) => t.includes(norm(w))).length }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  const picked = scores.slice(0, 2).map((x) => x.r);
  const tSafe = benignPhrases.reduce((acc, w) => acc.split(norm(w)).join(" "), t);
  const urgency = emergencyWords.some((w) => tSafe.includes(norm(w)))
    ? "emergency"
    : soonWords.some((w) => t.includes(norm(w)))
      ? "soon"
      : "routine";
  if (!picked.length) {
    return {
      specialtyIds: ["family-medicine"],
      urgency,
      summary: "مش قادر أحدد التخصص بدقة، الأفضل تبدأ بطبيب أسرة/ممارس عام يوجّهك.",
      advice: "جرّب تكتب مكان الألم أو العرض بشكل أوضح.",
    };
  }
  const names = picked.map((r) => getSpecialty(r.id)?.name ?? r.id).join(" أو ");
  return {
    specialtyIds: picked.map((r) => r.id),
    urgency,
    summary: `على حسب كلامك، التخصص الأنسب ليك: ${names}.`,
    advice: picked[0].advice,
  };
}

const RANK = { routine: 0, soon: 1, emergency: 2 } as const;
/** Never let AI lower urgency below the local rule-based result. */
export function mergeTriageUrgency<T extends TriageResult>(ai: T, need: string): T {
  const local = runLocalTriage(need).urgency;
  return RANK[local] > RANK[ai.urgency] ? { ...ai, urgency: local } : ai;
}
