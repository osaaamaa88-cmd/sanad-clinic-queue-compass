export type Specialty = {
  id: string;
  name: string;
  emoji: string;
  category: "popular" | "surgical" | "family" | "therapy";
};

export const specialties: Specialty[] = [
  { id: "dental", name: "أسنان", emoji: "🦷", category: "popular" },
  { id: "internal", name: "باطنة", emoji: "🩺", category: "popular" },
  { id: "pediatrics", name: "أطفال", emoji: "👶", category: "family" },
  { id: "ortho", name: "عظام", emoji: "🦴", category: "therapy" },
  { id: "derma", name: "جلدية", emoji: "🧴", category: "popular" },
  { id: "cardio", name: "قلب وأوعية دموية", emoji: "❤️", category: "popular" },
  { id: "eye", name: "عيون", emoji: "👁️", category: "popular" },
  { id: "ent", name: "أنف وأذن وحنجرة", emoji: "👂", category: "popular" },
  { id: "gyneco", name: "نساء وتوليد", emoji: "🤰", category: "family" },
  { id: "neuro", name: "مخ وأعصاب", emoji: "🧠", category: "popular" },
  { id: "general-surgery", name: "جراحة عامة", emoji: "🩺", category: "surgical" },
  { id: "urology", name: "مسالك بولية", emoji: "🧬", category: "surgical" },
  { id: "physiotherapy", name: "علاج طبيعي", emoji: "🏃", category: "therapy" },
  { id: "oncology", name: "أورام", emoji: "🎗️", category: "popular" },
  { id: "endocrinology", name: "غدد صماء وسكر", emoji: "🩸", category: "popular" },
  { id: "gastro", name: "جهاز هضمي وكبد", emoji: "🫁", category: "popular" },
  { id: "chest", name: "صدرية", emoji: "🫁", category: "popular" },
  { id: "andrology", name: "أمراض ذكورة", emoji: "🧬", category: "surgical" },
  { id: "plastic-surgery", name: "جراحة تجميل", emoji: "✨", category: "surgical" },
  { id: "psychiatry", name: "نفسي وعصبي", emoji: "🧠", category: "therapy" },
  { id: "rheumatology", name: "روماتيزم", emoji: "🦴", category: "therapy" },
  { id: "neonatology", name: "طب أطفال حديثي الولادة", emoji: "🍼", category: "family" },
  { id: "speech-audiology", name: "تخاطب وسمعيات", emoji: "🗣️", category: "family" },
  { id: "nutrition", name: "تخسيس وتغذية", emoji: "🥗", category: "therapy" },
  { id: "family-medicine", name: "طب الأسرة", emoji: "👨‍👩‍👧", category: "family" },
];
