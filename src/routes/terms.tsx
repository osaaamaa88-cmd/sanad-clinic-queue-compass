import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldAlert,
  Lock,
  Bot,
  Stethoscope,
  Trash2,
  CalendarClock,
  Siren,
  Mic,
  UserRound,
  FileText,
  Volume2,
  Square,
  ChevronDown,
  BadgeCheck,
  Ban,
  Scale,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { speak } from "@/lib/voice";

export const Route = createFileRoute("/terms")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "شروط الاستخدام وإخلاء المسؤولية — سَنَد" },
      {
        name: "description",
        content:
          "شروط استخدام منصة سَنَد: إخلاء المسؤولية الطبية والطوارئ، حدود الذكاء الاصطناعي، حماية البيانات والتشفير، أهلية الاستخدام، سياسة الاستخدام العادل، وتنظيم المواعيد.",
      },
      { property: "og:title", content: "شروط الاستخدام وإخلاء المسؤولية — سَنَد" },
      {
        property: "og:description",
        content:
          "سَنَد أداة تنظيم مواعيد ومساعد ذكي للتوجيه فقط بلا وصف أدوية. بياناتك مشفّرة ولا تُباع، ولك حق حذف حسابك.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
});

/** Short spoken summary of the key legal highlights for the TTS button. */
const TERMS_SPOKEN_SUMMARY = [
  "أهلاً بك في شروط استخدام سَنَد. دي أهم النقاط اللي لازم تعرفها.",
  "أولاً: سَنَد أداة تقنية لتنظيم المواعيد فقط، ومش بتقدم أي استشارة طبية. في حالات الطوارئ اتصل بالإسعاف على ١٢٣ فوراً.",
  "ثانياً: المساعد الذكي والمساعد الصوتي بيوجهوك للتخصص المناسب بس، وممنوع عليهم وصف أي أدوية أو جرعات أو تشخيص نهائي. القرار الطبي دايماً للطبيب.",
  "ثالثاً: بياناتك الطبية والصوتية مشفرة ولا تُباع لأي جهة، ولك الحق الكامل في طلب حذف حسابك وبياناتك نهائياً من الإعدادات.",
  "رابعاً: استخدام المنصة لمن عمره ١٨ سنة فأكثر، أو بولي أمر.",
  "خامساً: ممنوع الحسابات الوهمية أو الحجوزات المزعجة أو انتحال هوية عيادة، والمخالفة تعرض الحساب للإيقاف.",
  "سادساً: سَنَد وسيط تقني بينك وبين العيادة، ومش مسؤول عن أوقات الانتظار أو قرارات الطبيب داخل العيادة.",
  "شكراً لاستخدامك سَنَد.",
].join(" ");

type TermSection = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  points: { title: string; body: React.ReactNode }[];
};

const SECTIONS: TermSection[] = [
  {
    icon: Siren,
    title: "إخلاء المسؤولية الطبية وحالات الطوارئ",
    points: [
      {
        title: "وسيط تقني فقط",
        body: "منصة سَنَد أداة تقنية لتنظيم المواعيد وتسهيل التواصل بين المريض والعيادة، ولا تقدم أي استشارات طبية ولا تتحمل المسؤولية القانونية عن الخدمات الطبية المقدمة من العيادات.",
      },
      {
        title: "الطوارئ — 123",
        body: "في الحالات الطارئة اتصل بالإسعاف فوراً على 123، ولا تعتمد على المنصة ولا على المساعد الذكي كبديل عن الرعاية العاجلة.",
      },
      {
        title: "الحاسبات الصحية",
        body: "حاسبة الضغط والسكر وتذكير الأدوية أدوات استرشادية للتنظيم الشخصي فقط، وليست بديلاً عن رأي الطبيب.",
      },
    ],
  },
  {
    icon: Bot,
    title: "حدود الذكاء الاصطناعي والمساعد الصوتي",
    points: [
      {
        title: "توجيه وفرز فقط",
        body: "مساعد سَنَد الذكي لا يصف أي أدوية كيميائية ولا يحدد جرعات ولا يغيّر علاجاً كتبته لك عيادة أو مستشفى. وظيفته فهم شكواك وتوجيهك للتخصص أو المنشأة المناسبة فقط.",
      },
      {
        title: "لا تشخيص حاسم",
        body: "أي تشخيص أو اقتراح يصدر من المساعد هو احتمال إرشادي وليس رأياً طبياً، ولا يُؤخذ به في صرف دواء أو إيقافه. القرار الطبي النهائي للطبيب المرخَّص.",
      },
      {
        title: "الصوت",
        body: "التعرّف على الكلام يتم بخدمة جهازك أو متصفحك، ولا نخزّن تسجيلات صوتية. يُرسل نص سؤالك لمزوّد معالجة لغوية لغرض توليد الرد وتوجيهك فقط.",
      },
    ],
  },
  {
    icon: Lock,
    title: "حماية البيانات والخصوصية والتشفير",
    points: [
      {
        title: "التشفير وعدم البيع",
        body: "كل ما تكتبه أو تقوله من استعلامات طبية (نص أو صوت) يُنقل ويُخزَّن بشكل مشفَّر طبقاً لقوانين حماية البيانات المحلية، ولا يُباع ولا يُؤجَّر ولا يُشارك مع أي جهة ثالثة لأغراض إعلانية أو تسويقية.",
      },
      {
        title: "حقك في حذف حسابك وبياناتك",
        body: (
          <>
            لك الحق الكامل في طلب حذف حسابك وكل بياناتك نهائياً من{" "}
            <Link to="/settings" className="font-bold text-primary underline">
              الإعدادات ← حسابي وبياناتي
            </Link>
            . يُنفَّذ الطلب دون تأخير غير مبرر وبحد أقصى 30 يوماً من تاريخه، ويمكنك إلغاء الطلب قبل
            تنفيذه.
          </>
        ),
      },
      {
        title: "بيانات الغير",
        body: "لا تدخل بيانات طبية أو أسماء ناس تانية إلا لو كنت ولي أمرهم أو مخوَّل رسمياً بالتصرف عنهم.",
      },
    ],
  },
  {
    icon: BadgeCheck,
    title: "أهلية الاستخدام",
    points: [
      {
        title: "18 عاماً فأكثر",
        body: "استخدام المنصة وإنشاء الحسابات متاح لمن بلغ 18 عاماً فأكثر. من هم دون ذلك يستخدمون المنصة فقط عن طريق ولي الأمر أو الوصي القانوني الذي يتحمل مسؤولية الحجز والبيانات.",
      },
      {
        title: "بيانات صحيحة",
        body: "تلتزم بإدخال اسمك ورقم هاتفك الصحيحين، وأنك المخوَّل باستخدام البيانات التي تدخلها.",
      },
    ],
  },
  {
    icon: Ban,
    title: "سياسة الاستخدام العادل",
    points: [
      {
        title: "حظر الحسابات المسيئة أو الوهمية",
        body: "ممنوع انتحال هوية عيادة أو طبيب، أو إنشاء حسابات وهمية، أو إزعاج العيادات بحجوزات غير جادة، أو استخدام المنصة لنشر بيانات طبية مضللة.",
      },
      {
        title: "الإيقاف والحذف",
        body: "لمالك المنصة الحق في إيقاف أو حذف أي حساب يخالف هذه السياسة، مع حفظ حقه في اتخاذ الإجراءات القانونية عند الضرر.",
      },
    ],
  },
  {
    icon: CalendarClock,
    title: "تنظيم المواعيد والربط بين المريض والعيادة",
    points: [
      {
        title: "دور سَنَد",
        body: "سَنَد يدير نظام الأدوار والمواعيد داخل التطبيق ويسهّل التواصل، ولا يملك العيادات ولا يشغّلها ولا يوظف الأطباء. العلاقة العلاجية بينك وبين العيادة مباشرة.",
      },
      {
        title: "أوقات الانتظار وسير العيادة",
        body: "سَنَد غير مسؤول عن أوقات الانتظار، ولا عن تأجيل أو إلغاء أو تأخير الموعد، ولا عن تغيير الأطباء أو الأسعار أو طريقة إدارة الطابور — كل هذا قرار العيادة ومسؤوليتها.",
      },
      {
        title: "قرارات الطبيب الفردية",
        body: "سَنَد غير مسؤول عن القرارات الطبية الفردية للطبيب: التشخيص، خطة العلاج، الإحالة، طلب تحاليل، رفض الحالة، أو أي إجراء يتم داخل العيادة.",
      },
      {
        title: "التزامك",
        body: "احضر في الموعد أو ألغِه من التطبيق. الحجز عبر سَنَد لا يعني ضمان الكشف أو أولوية طبية.",
      },
    ],
  },
];

function Terms() {
  const [open, setOpen] = useState<number>(0);
  const [speaking, setSpeaking] = useState(false);

  const toggleListen = () => {
    if (speaking) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speak(TERMS_SPOKEN_SUMMARY, () => setSpeaking(false));
  };

  return (
    <AppShell title="شروط الاستخدام" subtitle="وإخلاء المسؤولية" backTo="/">
      <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <p className="text-sm font-bold leading-relaxed text-foreground">
            منصة سَنَد هي أداة تقنية لتنظيم المواعيد وتسهيل التواصل بين المريض والعيادة، ولا تقدم
            المنصة أي استشارات طبية ولا تتحمل المسؤولية القانونية عن الخدمات الطبية المقدمة من قبل
            العيادات.
          </p>
        </div>
      </div>

      {/* ===== Listen to terms (TTS accessibility) ===== */}
      <button
        type="button"
        onClick={toggleListen}
        aria-pressed={speaking}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 p-3.5 text-sm font-extrabold transition-colors ${
          speaking
            ? "border-destructive/50 bg-destructive/10 text-destructive"
            : "border-primary/50 bg-primary/10 text-primary"
        }`}
      >
        {speaking ? <Square className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        {speaking ? "إيقاف الاستماع" : "استمع إلى الشروط 🔊"}
      </button>
      <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
        قراءة صوتية بصوت عربي نسائي لأهم نقاط الشروط — لدعم ضعاف البصر
      </p>

      {/* ===== Accordion sections ===== */}
      <div className="mt-4 space-y-3">
        {SECTIONS.map((sec, i) => {
          const isOpen = open === i;
          return (
            <div
              key={sec.title}
              className={`overflow-hidden rounded-2xl border bg-card transition-colors ${
                isOpen ? "border-primary/50" : "border-border"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2.5 p-4 text-start"
              >
                <sec.icon
                  className={`h-5 w-5 shrink-0 ${isOpen ? "text-primary" : "text-muted-foreground"}`}
                />
                <span className="flex-1 text-sm font-extrabold text-foreground">
                  {i + 1}. {sec.title}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="space-y-2.5 border-t border-border p-3">
                  {sec.points.map((p) => (
                    <div key={p.title} className="rounded-xl bg-secondary/50 p-3">
                      <p className="text-sm font-extrabold text-foreground">{p.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ===== General notes ===== */}
      <div className="mt-4 space-y-4 rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
        <Section icon={FileText} title="دقة البيانات">
          بيانات العيادات يدخلها أصحابها، وبيانات المستشفيات الحكومية تُجمع من مصادر مفتوحة ومراجع
          وتنقيح. نبذل جهدنا في المراجعة والتوثيق، لكن لا نضمن دقة كل البيانات في كل وقت.
        </Section>
        <Section icon={Stethoscope} title="مسؤولية العيادة والطبيب">
          كل الخدمات الطبية (الكشف، التشخيص، العلاج، الأسعار، المواعيد الفعلية) مسؤولية العيادة أو
          الطبيب وحده، وسَنَد غير مسؤول عن أي ضرر ناتج عنها.
        </Section>
        <Section icon={UserRound} title="الخصوصية">
          نستخدم بياناتك (الاسم ورقم الهاتف) فقط لإتمام الحجز وإبلاغ العيادة، ولا نبيعها لأي جهة.
          التفاصيل الكاملة في{" "}
          <Link to="/privacy" className="font-bold text-primary underline">
            سياسة الخصوصية
          </Link>
          .
        </Section>
        <Section icon={Scale} title="تعديل الشروط وقبولها">
          يمكن تحديث هذه الشروط في أي وقت، ويُنشر التاريخ المحدَّث على هذه الصفحة. استخدامك للمنصة
          أو تسجيل عيادتك عليها يعني موافقتك على هذه الشروط وعلى سياسة الخصوصية.
        </Section>
        <p className="text-xs text-muted-foreground">آخر تحديث: أكتوبر 2026</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          to="/privacy"
          className="rounded-2xl border border-border bg-card p-3 text-center text-sm font-extrabold text-primary"
        >
          سياسة الخصوصية
        </Link>
        <Link
          to="/settings"
          className="rounded-2xl border border-border bg-card p-3 text-center text-sm font-extrabold text-primary"
        >
          الإعدادات
        </Link>
      </div>
    </AppShell>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-extrabold text-foreground">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        {title}
      </p>
      <p className="mt-1">{children}</p>
    </div>
  );
}
