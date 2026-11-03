// Free, offline rule-based triage for Egyptian colloquial Arabic.
import { specialties } from "./specialties.ts";

export type TriageResult = {
  specialtyIds: string[];
  urgency: "emergency" | "soon" | "routine";
  summary: string;
  advice: string;
};

const getSpecialty = (id: string) => specialties.find((specialty) => specialty.id === id);

const norm = (s: string) =>
  s
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();

const words = (s: string) => norm(s).match(/[\p{L}\p{N}]+/gu) ?? [];

function containsPhrase(text: string, phrase: string): boolean {
  const haystack = words(text);
  const needle = words(phrase);
  if (!needle.length || needle.length > haystack.length) return false;
  return haystack.some((_, index) =>
    needle.every((word, offset) => haystack[index + offset] === word),
  );
}

const selfHarmPhrases = [
  "عايز انتحر",
  "عايزه انتحر",
  "هنتحر",
  "بفكر انتحر",
  "بفكر في الانتحار",
  "افكر في الانتحار",
  "بفكر بالانتحار",
  "فكرت في الانتحار",
  "افكر في ايذاء نفسي",
  "بفكر في ايذاء نفسي",
  "عايز اموت",
  "عايزه اموت",
  "عاوز انتحر",
  "عاوزة انتحر",
  "مش عايز اعيش",
  "مش عايزه اعيش",
  "هأذي نفسي",
  "هاذي نفسي",
  "هأذي نفسي",
  "أذي نفسي",
  "أقتل نفسي",
  "اقتل نفسي",
  "انهي حياتي",
  "انهاء حياتي",
  "نفسي اموت",
  "عايز اخلص من حياتي",
];

export function hasSelfHarmIntent(text: string): boolean {
  const tokens = words(text);
  return selfHarmPhrases.some((phrase) => {
    const needle = words(phrase);
    return tokens.some((_, index) => {
      if (!needle.every((word, offset) => tokens[index + offset] === word)) return false;
      const previous = tokens[index - 1];
      const previousTwo = tokens[index - 2];
      const negated =
        (previous === "مش" &&
          needle[0] !== undefined &&
          ["بفكر", "افكر", "عايز", "عايزه", "ناوي", "ناويه", "هنتحر"].includes(needle[0])) ||
        (previousTwo === "مش" && ["عايز", "عايزه", "ناوي", "ناويه"].includes(previous));
      if (negated) return false;
      return true;
    });
  });
}

export function replyMentionsEmergency(text: string): boolean {
  return /123|١٢٣|۱۲۳|طوارئ|إسعاف|اسعاف|ضيق(?:\s+في)?\s+التنفس|نزيف|جلطة/.test(text);
}

const rules: { id: string; words: string[]; advice: string }[] = [
  {
    id: "dental",
    words: [
      "اسنان",
      "سنان",
      "سناني",
      "ضرس",
      "ضروسي",
      "ضروس",
      "لثه",
      "تسوس",
      "حشو",
      "تقويم",
      "عصب",
      "خلع",
      "فك",
      "فكي",
    ],
    advice: "اغسل بمية دافية وملح، وابعد عن الحاجات الساقعة والسخنة جداً.",
  },
  {
    id: "pediatrics",
    words: ["ابني", "بنتي", "طفل", "عيل", "رضيع", "تطعيم", "بيبي", "ابنى"],
    advice: "تابع حرارة الطفل وخليه يشرب سوائل كتير.",
  },
  {
    id: "internal",
    words: [
      "سخونيه",
      "حراره",
      "مغص",
      "معده",
      "ترجيع",
      "اسهال",
      "حموضه",
      "ضغط",
      "سكر",
      "دوخه",
      "صداع",
      "تعب",
      "برد",
      "انفلونزا",
    ],
    advice: "اشرب سوائل كتير وارتاح لحد ما تكشف.",
  },
  {
    id: "gastro",
    words: ["قولون", "انتفاخ", "امساك", "معده", "كبد", "مرار", "بواسير"],
    advice: "قلل الأكل الدسم والحار.",
  },
  {
    id: "ortho",
    words: [
      "ضهري",
      "ظهري",
      "ركبه",
      "ركبتي",
      "عضم",
      "كسر",
      "فقرات",
      "غضروف",
      "مفصل",
      "كتف",
      "رقبه",
      "التواء",
      "كاحل",
    ],
    advice: "ريّح المكان المصاب واعمل كمادات تلج أول يومين.",
  },
  {
    id: "eye",
    words: ["عين", "عيني", "زغلله", "نظاره", "رموش", "نظر", "احمرار عين", "دموع"],
    advice: "ماتدعكش عينك وابعد عن الشاشات شوية.",
  },
  {
    id: "ent",
    words: ["ودن", "اذن", "زور", "لوز", "جيوب", "مناخير", "انف", "صوتي", "بلع", "طنين"],
    advice: "غرغر بمية دافية وملح.",
  },
  {
    id: "derma",
    words: [
      "جلد",
      "حبوب",
      "حب الشباب",
      "هرش",
      "حكه",
      "اكزيما",
      "شعر",
      "تساقط",
      "قشره",
      "بقع",
      "طفح",
    ],
    advice: "ماتحطش كريمات من غير استشارة.",
  },
  {
    id: "cardio",
    words: ["قلب", "خفقان", "ضربات", "نهجان", "تورم رجل"],
    advice: "ابعد عن المجهود لحد الكشف.",
  },
  {
    id: "chest",
    words: ["كحه", "صدر", "ربو", "حساسيه صدر", "بلغم", "تنفس"],
    advice: "ابعد عن التدخين والتراب.",
  },
  {
    id: "gyneco",
    words: ["حمل", "حامل", "دوره", "رحم", "ولاده", "تبويض", "مراتي"],
    advice: "سجّلي مواعيد الدورة والأعراض قبل الكشف.",
  },
  {
    id: "urology",
    words: ["كلي", "كلى", "مثانه", "حرقان بول", "بول", "حصوه", "بروستاتا"],
    advice: "اشرب مية كتير.",
  },
  {
    id: "neuro",
    words: ["تنميل", "صرع", "تشنج", "شلل", "رعشه", "صداع نصفي", "اعصاب"],
    advice: "دوّن مواعيد النوبات ومدتها.",
  },
  {
    id: "psychiatry",
    words: ["اكتئاب", "قلق", "توتر", "نوم", "ارق", "نفسيتي", "خوف", "وسواس"],
    advice: "مش لوحدك — الكلام مع متخصص بيفرق كتير.",
  },
  {
    id: "endocrinology",
    words: ["غده", "درقيه", "هرمونات", "سكري"],
    advice: "خد معاك آخر تحاليل عملتها.",
  },
  {
    id: "nutrition",
    words: ["تخسيس", "وزن", "رجيم", "سمنه", "نحافه"],
    advice: "ابدأ بتقليل السكريات والمشروبات الغازية.",
  },
  {
    id: "physiotherapy",
    words: ["علاج طبيعي", "تأهيل", "تيبس", "شد عضلي"],
    advice: "تمارين إطالة خفيفة بتساعد.",
  },
];

const emergencyWords = [
  "وجع صدر شديد",
  "الم صدر شديد",
  "الم في صدري",
  "ألم في صدري",
  "صدري بيوجعني",
  "صدري يوجعني",
  "صدري واجعني",
  "قلبي واجعني",
  "قلبي بيوجعني",
  "وجع في القلب",
  "الم في القلب",
  "الم في الصدر",
  "وجع في صدري",
  "ألم يمتد للذراع",
  "الم ممتد للذراع",
  "الالم ممتد للذراع",
  "الألم ممتد للذراع",
  "وجع ممتد للذراع",
  "وجع يمتد للذراع",
  "الم ممتد للذراع",
  "ألم يمتد للفك",
  "الم ممتد للفك",
  "الالم ممتد للفك",
  "الألم ممتد للفك",
  "وجع ممتد للفك",
  "وجع يمتد للفك",
  "الم ممتد للفك",
  "ضغط على صدري",
  "ضيق في التنفس",
  "ضيق بالتنفس",
  "ضيق تنفس",
  "صعوبة في التنفس",
  "صعوبة التنفس",
  "مش عارف أتنفس",
  "مش عارف اتنفس",
  "مش قادر أتنفس",
  "مش قادر اتنفس",
  "مش عارفة أتنفس",
  "مش عارفه اتنفس",
  "نفسي مقطوع",
  "مش قادر آخد نفسي",
  "مش قادرة اخد نفسي",
  "مش قادر اتنفس",
  "صعوبه تنفس",
  "بتخنق",
  "اختناق",
  "شفايفي زرقا",
  "نزيف",
  "بينزف",
  "دم كتير",
  "ترجيع دم",
  "كحه بدم",
  "براز اسود",
  "اغماء",
  "اغمي",
  "فقد الوعي",
  "نزيف شديد",
  "الدم مش بيقف",
  "الدم لا يتوقف",
  "نزيف مش بيقف",
  "نزيف لا يتوقف",
  "مش بيفوق",
  "الطفل مش بيفوق",
  "طفلي مش بيفوق",
  "الرضيع مش بيفوق",
  "مش قادر اصحيه",
  "مش عارفه اصحيه",
  "رضيع مش بيرضع",
  "البيبي مش بيرضع",
  "الرضيع مش بيرضع",
  "رضيع نفسه مكتوم",
  "البيبي مش عارف يتنفس",
  "رضيع حرارته عاليه",
  "رضيع سخن",
  "تشنجات طفل",
  "تشنجات رضيع",
  "تشنجات",
  "تشنج",
  "حادثه",
  "خبطه في الراس",
  "وقع على راسه",
  "تسمم",
  "ابتلع",
  "جرعه زياده",
  "جلطه",
  "شلل مفاجئ",
  "وشي مايل",
  "لساني تقيل",
  "مش قادر احرك",
  "تنميل نص",
  "حساسيه شديده",
  "ورم في الزور",
  "لدغه",
  "عضه تعبان",
  "عقرب",
  "صعقه",
  "غرق",
  "حرق في",
  "اتحرق",
  "اتحرقت",
  "حروق",
  "مايه سخنه",
  "زيت سخن",
];
const soonWords = ["شديد", "جامد", "مش قادر", "من امبارح", "ورم", "وارم", "سخونيه عاليه", "مستمر"];

export function runLocalTriage(need: string): TriageResult {
  const t = norm(need);
  const scores = rules
    .map((r) => ({ r, s: r.words.filter((w) => containsPhrase(t, w)).length }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  const picked = scores.slice(0, 2).map((x) => x.r);
  const selfHarm = hasSelfHarmIntent(need);
  if (selfHarm) {
    return {
      specialtyIds: [],
      urgency: "emergency",
      summary: "مش لوحدك — في ناس جاهزة تسمعك.",
      advice: SELF_HARM_LOCAL_REPLY,
    };
  }
  const urgency =
    selfHarm || emergencyWords.some((w) => containsPhrase(t, w))
      ? "emergency"
      : soonWords.some((w) => containsPhrase(t, w))
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

import { SELF_HARM_LOCAL_REPLY } from "./crisis-support.ts";

export function getLocalNemoReply(text: string, triage: TriageResult): string {
  if (hasSelfHarmIntent(text)) {
    return SELF_HARM_LOCAL_REPLY;
  }
  if (triage.urgency === "emergency") {
    return "ألف سلامة عليك، الأعراض دي محتاجة مساعدة عاجلة. اتصل بالإسعاف 123 أو توجّه لأقرب طوارئ الآن.";
  }
  if (/روشت|دواء|ادويه|أدوية|حبوب|قرص|علاج/.test(text)) {
    return "أقدر أساعدك تفهم معلومات الدواء، لكن ما أقدرش أحدد جرعة مناسبة من غير طبيب. قل لي اسم الدواء وإيه اللي حابب تعرفه عنه.";
  }
  if (/تحليل|تحاليل|نتيجه التحليل|نتيجة التحليل|هيموجلوبين|صفائح|بوتاسيوم|صوديوم/.test(text)) {
    return "أقدر أشرح نتيجة التحليل بشكل عام، لكن التفسير النهائي يكون مع طبيبك. قل لي اسم التحليل والنتيجة المكتوبة فيه، أو افتح قارئ التحاليل لقراءة التقرير.";
  }
  if (/قلق|متوتر|توتر|خايف|خايفه|خوف|مضغوط|مش مرتاح/.test(text)) {
    return "أنا سامعك ومتفهم قلقك، ومش لازم تواجهه لوحدك. جرّب تاخد نفس هادي، واحكي لي إيه أكتر حاجة مقلقاك دلوقتي.";
  }

  if (triage.summary.startsWith("مش قادر أحدد التخصص")) {
    return `${triage.summary} ${triage.advice} هل تقدر توضح مكان الألم أو العرض، ومنذ متى بدأ؟`;
  }

  const specialty = getSpecialty(triage.specialtyIds[0])?.name ?? "طب الأسرة";
  const urgencyAdvice =
    triage.urgency === "soon" ? "لو الأعراض مستمرة أو بتزيد، تواصل مع طبيب قريباً." : triage.advice;
  return `ألف سلامة عليك يا غالي، من وصفك ممكن يكون تخصص ${specialty} مناسباً كبداية. ${urgencyAdvice} قل لي مكان الألم ومنذ متى بدأ، وهل عندك أعراض تانية؟`;
}

const RANK = { routine: 0, soon: 1, emergency: 2 } as const;
/** Never let AI lower urgency below the local rule-based result. */
export function mergeTriageUrgency<T extends TriageResult>(ai: T, need: string): T {
  const local = runLocalTriage(need).urgency;
  return RANK[local] > RANK[ai.urgency] ? { ...ai, urgency: local } : ai;
}
