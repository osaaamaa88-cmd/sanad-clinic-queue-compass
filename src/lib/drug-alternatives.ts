// دليل البديل المصري للدواء الناقص — جدول محلي سريع يعمل أوفلاين.
// الأسعار استرشادية بالجنيه المصري وتتغير — راجع الصيدلية دائماً.

export type LocalAlt = {
  name: string;
  company: string;
  strength: string;
  price: string;
  note: string;
};

export type LocalDrug = {
  keys: string[]; // كلمات البحث (عربي/إنجليزي، صغيرة الحروف)
  active: string;
  strength: string;
  alts: LocalAlt[];
};

export const LOCAL_ALTS: LocalDrug[] = [
  {
    keys: ["concor", "كونكور", "bisoprolol", "بيسوبرولول"],
    active: "بيسوبرولول فومارات",
    strength: "5mg / 10mg",
    alts: [
      { name: "Bisocor", company: "Hikma", strength: "5mg", price: "≈ 25 ج", note: "مثيل مباشر" },
      {
        name: "Bisotop",
        company: "Global Napi",
        strength: "5mg",
        price: "≈ 28 ج",
        note: "مثيل مباشر",
      },
      {
        name: "Concor 10",
        company: "Merck",
        strength: "10mg",
        price: "≈ 55 ج",
        note: "التركيز الأعلى",
      },
    ],
  },
  {
    keys: ["augmentin", "أوجمنتين", "amoxicillin", "أموكسيسيلين", "clavulanic"],
    active: "أموكسيسيلين + كلافولانيك أسيد",
    strength: "1g",
    alts: [
      { name: "Hibiotic", company: "Hikma", strength: "1g", price: "≈ 60 ج", note: "مثيل مباشر" },
      { name: "Curam", company: "Eva Pharma", strength: "1g", price: "≈ 63 ج", note: "مثيل مباشر" },
      {
        name: "Hibiotic Duo",
        company: "Hikma",
        strength: "625mg",
        price: "≈ 40 ج",
        note: "تركيز أقل",
      },
    ],
  },
  {
    keys: [
      "panadol",
      "بانادول",
      "paracetamol",
      "باراسيتامول",
      "abimol",
      "أبيمول",
      "cetal",
      "ستامول",
    ],
    active: "باراسيتامول",
    strength: "500mg / 1g",
    alts: [
      { name: "Abimol", company: "Adco", strength: "500mg", price: "≈ 12 ج", note: "أرخص بوضوح" },
      { name: "Cetal", company: "EIPICO", strength: "500mg", price: "≈ 10 ج", note: "أرخص بوضوح" },
      {
        name: "Stamol",
        company: "SciPharm",
        strength: "500mg",
        price: "≈ 12 ج",
        note: "أقراص / فوار",
      },
    ],
  },
  {
    keys: ["statin", "lipitor", "ليبيتور", "atorvastatin", "أتورفاستاتين", "ATOR"],
    active: "أتورفاستاتين",
    strength: "20mg / 40mg",
    alts: [
      {
        name: "Ator",
        company: "Eva Pharma",
        strength: "20mg",
        price: "≈ 33 ج",
        note: "مثيل مباشر",
      },
      { name: "Vasten", company: "Amoun", strength: "20mg", price: "≈ 30 ج", note: "مثيل مباشر" },
      {
        name: "Atorva",
        company: "Global Napi",
        strength: "20mg",
        price: "≈ 35 ج",
        note: "مثيل مباشر",
      },
    ],
  },
  {
    keys: ["glucophage", "جلوكوفاج", "metformin", "ميتفورمين", "metformin hcl"],
    active: "ميتفورمين هيدروكلوريد",
    strength: "500mg / 1000mg",
    alts: [
      {
        name: "Cidophage",
        company: "CID",
        strength: "500mg",
        price: "≈ 15 ج",
        note: "الأرخص الشائع",
      },
      {
        name: "Metfgyn",
        company: "Marcyrl",
        strength: "500mg",
        price: "≈ 18 ج",
        note: "مثيل مباشر",
      },
      {
        name: "Cidophage Lev",
        company: "CID",
        strength: "1000mg",
        price: "≈ 30 ج",
        note: "تركيز أعلى",
      },
    ],
  },
  {
    keys: ["synthroid", "euthyrox", "يوثيروكس", "levothyroxine", "ليفوثيروكسين", "Eltroxin"],
    active: "ليفوثيروكسين صوديوم",
    strength: "50mcg / 100mcg",
    alts: [
      {
        name: "Euthyrox",
        company: "Merck",
        strength: "100mcg",
        price: "≈ 40 ج",
        note: "المرجع الأشهر",
      },
      {
        name: "Thyroxal",
        company: "Amoun",
        strength: "100mcg",
        price: "≈ 32 ج",
        note: "مثيل مباشر",
      },
      {
        name: "Thyrosafe",
        company: "Rameda",
        strength: "50mcg",
        price: "≈ 25 ج",
        note: "تركيز أدق",
      },
    ],
  },
  {
    keys: ["nurofen", "نيوروفين", "ibuprofen", "ايبوبروفين", "brufen", "بروفين"],
    active: "إيبوبروفين",
    strength: "400mg / 600mg",
    alts: [
      { name: "Brufen", company: "Abbott", strength: "600mg", price: "≈ 30 ج", note: "الأصل" },
      {
        name: "Ibuprex",
        company: "Delta Pharma",
        strength: "400mg",
        price: "≈ 18 ج",
        note: "مثيل مباشر",
      },
      { name: "Ibucap", company: "SIGMA", strength: "400mg", price: "≈ 20 ج", note: "كبسولات" },
    ],
  },
  {
    keys: ["ventolin", "فنتولين", "salbutamol", "سالبوتامول"],
    active: "سالبوتامول",
    strength: "بخاخ 100mcg",
    alts: [
      {
        name: "Ventolin inhaler",
        company: "GSK",
        strength: "100mcg",
        price: "≈ 45 ج",
        note: "الأصل",
      },
      {
        name: "Salbutamol HFA",
        company: "SEDICO",
        strength: "100mcg",
        price: "≈ 32 ج",
        note: "مثيل محلي",
      },
    ],
  },
  {
    keys: ["buscopan", "بوسكوبان", "hyoscine", "هيوسين", "butylscopolamine"],
    active: "هيوسين بيوتيل بروميد",
    strength: "10mg",
    alts: [
      { name: "Buscopan", company: "Sanofi", strength: "10mg", price: "≈ 28 ج", note: "الأصل" },
      { name: "Brospan", company: "Borg", strength: "10mg", price: "≈ 16 ج", note: "مثيل مباشر" },
      {
        name: "Hyosine-NB",
        company: "Nile Pharma",
        strength: "10mg",
        price: "≈ 15 ج",
        note: "أرخص بوضوح",
      },
    ],
  },
  {
    keys: [
      "vomistop",
      "فوميتوب",
      "motilium",
      "موتيليوم",
      "domperidone",
      "دومبيريدون",
      "motinorm",
      "موتينورم",
    ],
    active: "دومبيريدون",
    strength: "10mg",
    alts: [
      { name: "Motinorm", company: "SIGMA", strength: "10mg", price: "≈ 20 ج", note: "مثيل مباشر" },
      {
        name: "Domperidone 10",
        company: "Multiple",
        strength: "10mg",
        price: "≈ 15 ج",
        note: "جنيريك",
      },
    ],
  },
  {
    keys: ["zestril", "استريل", "lisinopril", "ليسينوبريل", "capoten", "كابوتين", "captopril"],
    active: "ليسينوبريل / كابتوبريل",
    strength: "5mg / 10mg",
    alts: [
      {
        name: "Lisiprol",
        company: "EIPICO",
        strength: "10mg",
        price: "≈ 22 ج",
        note: "مثيل مباشر",
      },
      {
        name: "Lisiprol Plus",
        company: "EIPICO",
        strength: "10+12.5",
        price: "≈ 30 ج",
        note: "مدمج مع مدر",
      },
    ],
  },
  {
    keys: [
      "zantac",
      "رانيتيد",
      "peptid",
      "ببتيد",
      "omeprazole",
      "أوميبرازول",
      "omec",
      "نوكسياك",
      "nexium",
      "نكسيوم",
      "esomeprazole",
      "إيزوميبرازول",
      "proton pump",
    ],
    active: "مثبطات مضخة البروتون",
    strength: "20mg / 40mg",
    alts: [
      {
        name: "Omec",
        company: "Multi-Apex",
        strength: "20mg",
        price: "≈ 25 ج",
        note: "أوميبرازول جنيريك",
      },
      {
        name: "Peptazol",
        company: "Global Napi",
        strength: "20mg",
        price: "≈ 35 ج",
        note: "بانتوبرازول",
      },
      {
        name: "Esomeprazole 20",
        company: "Multiple",
        strength: "20mg",
        price: "≈ 40 ج",
        note: "نكسيوم جنيريك",
      },
    ],
  },
];

/** بحث نصي عربي/إنجليزي بسيط في الدليل المحلي. */
export function findLocalAlts(query: string): LocalDrug | null {
  const t = query.trim().toLowerCase();
  if (t.length < 2) return null;
  const hit = LOCAL_ALTS.find((d) => d.keys.some((k) => t.includes(k) || k.includes(t)));
  return hit ?? null;
}
