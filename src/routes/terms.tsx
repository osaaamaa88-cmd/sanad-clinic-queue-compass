import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldAlert,
  Lock,
  Bot,
  Stethoscope,
  Trash2,
  CalendarClock,
  Siren,
  Calculator,
  Mic,
  UserRound,
  FileText,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/terms")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "شروط الاستخدام وإخلاء المسؤولية — سَنَد" },
      {
        name: "description",
        content:
          "شروط استخدام منصة سَنَد: حماية البيانات والذكاء الاصطناعي، وحدود مسؤولية المساعد الطبي، ومسؤولية العيادات عن المواعيد والقرارات الطبية، وحق حذف الحساب.",
      },
      { property: "og:title", content: "شروط الاستخدام وإخلاء المسؤولية — سَنَد" },
      {
        property: "og:description",
        content:
          "سَنَد أداة تنظيم مواعيد، ومساعد ذكي للتوجيه بس من غير وصف أدوية. بياناتك مشفّرة ولا تُباع، ولك حق حذف حسابك.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
});

function Terms() {
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

      {/* ===== Sensitive data & AI limitations ===== */}
      <div className="mt-4 rounded-2xl border-2 border-primary/50 bg-card p-4">
        <p className="flex items-center gap-2 text-base font-extrabold text-foreground">
          <Lock className="h-5 w-5 shrink-0 text-primary" />
          حماية البيانات والذكاء الاصطناعي
        </p>

        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <StrictPoint icon={Lock} title="التشفير وعدم البيع">
            كل ما تكتبه أو تقوله من استعلامات طبية (نص أو صوت) يُنقل ويُخزَّن بشكل مشفَّر، ولا يُباع
            ولا يُؤجَّر ولا يُشارك مع أي جهة ثالثة لأغراض إعلانية أو تسويقية أو تجارية.
          </StrictPoint>

          <StrictPoint icon={Bot} title="حدود المساعد الذكي">
            مساعد سَنَد الذكي <b className="text-foreground">لا يصف أي أدوية كيميائية</b> ولا يحدد
            أي جرعات دوائية أو يخفّضها، ولا يغيّر علاجاً كتبته لك عيادة أو مستشفى. وظيفته{" "}
            <b className="text-foreground">التوجيه والفرز فقط</b>: يفهم شكواك، يوجّهك للنوع المناسب
            من الرعاية أو التخصص، ويسهّل لك الوصول لأقرب منشأة أو رقم اتصال.
          </StrictPoint>

          <StrictPoint icon={Stethoscope} title="القرار للطبيب">
            أي تشخيص أو اقتراح يطلع من المساعد هو احتمال إرشادي وليس رأياً طبياً، ولا يُؤخذ به في
            صرف دواء أو إيقافه. القرار الطبي النهائي للطبيب المرخَّص الذي يراك ويسمع تاريخك.
          </StrictPoint>

          <StrictPoint icon={Mic} title="الصوت">
            التعرّف على الكلام يتم بخدمة جهازك أو متصفحك، ولا نخزَّن تسجيلات صوتية. يُرسل نص سؤالك
            لمزوّد معالجة لغوية لغرض توليد الرد وتوجيهك فقط.
          </StrictPoint>

          <StrictPoint icon={Trash2} title="حقك في حذف حسابك وبياناتك">
            لك الحق الكامل في طلب حذف حسابك وكل بياناتك نهائياً من{" "}
            <Link to="/settings" className="font-bold text-primary underline">
              الإعدادات ← حسابي وبياناتي
            </Link>
            . نفّذ الطلب دون تأخير غير مبرر وبحد أقصى 30 يوم من تاريخه، ويمكنك إلغاء الطلب قبل
            تنفيذه.
          </StrictPoint>

          <StrictPoint icon={UserRound} title="بيانات الغير">
            لا تدخل بيانات طبية أو أسماء ناس تانية إلا لو كنت ولي أمرهم أو مخوَّل رسمياً بالتصرف
            عنهم.
          </StrictPoint>
        </div>
      </div>

      {/* ===== Appointments & clinics ===== */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <p className="flex items-center gap-2 text-base font-extrabold text-foreground">
          <CalendarClock className="h-5 w-5 shrink-0 text-primary" />
          حجز المواعيد وحدود مسؤوليتنا
        </p>

        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <StrictPoint icon={CalendarClock} title="وسيط تقني فقط">
            سَنَد وسيط تقني لتسهيل الحجز فقط: هو من يدير نظام الأدوار والمواعيد داخل التطبيق، ولا
            يملك العيادات ولا يشغّلها ولا يوظف الأطباء. العلاقة العلاجية بينك وبين العيادة.
          </StrictPoint>

          <StrictPoint icon={CalendarClock} title="أوقات الانتظار وسير العيادة">
            سَنَد غير مسؤول عن أوقات الانتظار، ولا عن تأجيل أو إلغاء أو تأخير الموعد، ولا عن تغيير
            الأطباء أو الأسعار أو طريقة إدارة الطابور داخل العيادة — كل ده قرار العيادة ومسؤوليتها.
          </StrictPoint>

          <StrictPoint icon={Stethoscope} title="قرارات الطبيب الفردية">
            سَنَد غير مسؤول عن القرارات الطبية الفردية للطبيب: التشخيص، خطة العلاج، الإحالة، طلب
            تحاليل، رفض الحالة، أو أي إجراء يتم داخل العيادة.
          </StrictPoint>

          <StrictPoint icon={FileText} title="التزامك">
            ادخل اسمك ورقم هاتفك الصحيحين، واحضر في الموعد أو ألغيه من التطبيق. الحجز عبر سَنَد لا
            يعني ضمان الكشف أو أولوية طبية.
          </StrictPoint>
        </div>
      </div>

      <div className="mt-4 space-y-4 rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
        <Section icon={FileText} title="طبيعة الخدمة">
          سَنَد منصة تنظيمية فقط: تعرض بيانات العيادات والمستشفيات، وتتيح حجز دور أو موعد، وتسهّل
          التواصل مع العيادة. المنصة ليست جهة علاجية ولا تشخيصية.
        </Section>
        <Section icon={Stethoscope} title="مسؤولية العيادة والطبيب">
          كل الخدمات الطبية (الكشف، التشخيص، العلاج، الأسعار، المواعيد الفعلية) مسؤولية العيادة أو
          الطبيب وحده، وسَنَد غير مسؤول عن أي ضرر ناتج عنها.
        </Section>
        <Section icon={FileText} title="دقة البيانات">
          بيانات العيادات يدخلها أصحابها، وبيانات المستشفيات الحكومية تُجمع من مصادر مفتوحة ومراجع
          وتنقيح. نبذل جهدنا في المراجعة والتوثيق، لكن لا نضمن دقة كل البيانات في كل وقت.
        </Section>
        <Section icon={Siren} title="الطوارئ">
          في الحالات الطارئة اتصل بالإسعاف فوراً على 123، ولا تعتمد على المنصة ولا على المساعد
          الذكي كبديل عن الرعاية العاجلة.
        </Section>
        <Section icon={Calculator} title="الحاسبات الصحية">
          حاسبة الضغط والسكر وتذكير الأدوية أدوات استرشادية للتنظيم الشخصي فقط، وليست بديلاَ عن رأي
          الطبيب.
        </Section>
        <Section icon={Lock} title="الخصوصية">
          نستخدم بياناتك (الاسم ورقم الهاتف) فقط لإتمام الحجز وإبلاغ العيادة، ولا نبيعها لأي جهة.
          التفاصيل الكاملة في{" "}
          <Link to="/privacy" className="font-bold text-primary underline">
            سياسة الخصوصية
          </Link>
          .
        </Section>
        <Section icon={FileText} title="إساءة الاستخدام">
          ممنوع انتحال هوية عيادة أو طبيب، أو إزعاج العيادات بحجوزات وهمية، أو استخدام المنصة لنشر
          بيانات طبية مضللة. لمالك المنصة إيقاف الحساب أو حذفه عند المخالفة.
        </Section>
        <Section icon={FileText} title="تعديل الشروط">
          يمكن تحديث هذه الشروط في أي وقت، ويُنشر التاريخ المحدَّث على هذه الصفحة. استخدامك المستمر
          بعد التحديث معناه موافقتك عليه.
        </Section>
        <Section icon={FileText} title="قبول الشروط">
          استخدامك للمنصة أو تسجيل عيادتك عليها يعني موافقتك على هذه الشروط وعلى سياسة الخصوصية.
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

function StrictPoint({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-secondary/50 p-3">
      <p className="flex items-center gap-2 text-sm font-extrabold text-foreground">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        {title}
      </p>
      <p className="mt-1">{children}</p>
    </div>
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
