import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Lock, Mic, Share2, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/privacy")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — سَنَد" },
      {
        name: "description",
        content:
          "سياسة خصوصية سَنَد: البيانات التي نجمعها، وكيف نحميها بالتشفير، وبيانات المساعد الصوتي والذكاء الاصطناعي، وحقك في حذف حسابك نهائياً.",
      },
      { property: "og:title", content: "سياسة الخصوصية — سَنَد" },
      {
        property: "og:description",
        content: "بياناتك مشفّرة ولا تُباع لأحد، ولك الحق في حذف حسابك نهائياً من الإعدادات.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <AppShell title="سياسة الخصوصية" subtitle="إيه اللي بنجمعه وإزاي بنحميه" backTo="/">
      <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm font-bold leading-relaxed text-foreground">
            سَنَد يجمع أقل بيانات ممكنة عشان يخلّيك تلاقي عيادة وتحجز وتتواصل، وبياناتك دي مشفّرة
            ومبتتباعش ومبتتأجرش لأي جهة.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4 rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
        <Section icon={Lock} title="1) البيانات اللي بنجمعها">
          <ul className="mt-1 list-disc space-y-1 pr-4">
            <li>
              بيانات الحساب: الاسم ورقم الهاتف، والبريد الإلكتروني وصورة الحساب لو دخلت بحساب
              Google.
            </li>
            <li>بيانات الحجز: العيادة، اليوم، الدور أو الموعد، حالة الحجز، ورقمك في الطابور.</li>
            <li>
              الموقع (باختيارك): بنطلبه عشان نوريك أقرب العيادات والمستشفيات، ومبنخزّنهوش عشان
              نتتبعك.
            </li>
            <li>
              بيانات الاستخدام: الصفحات اللي فتحتها والأخطاء اللي حصلت وجهازك، عشان نصلّح التطبيق.
            </li>
            <li>بيانات المساعد: النص اللي اتحوّل من كلامك، وسؤالك الطبي المختصر.</li>
          </ul>
        </Section>

        <Section icon={Lock} title="2) إزاي بنحميها">
          <ul className="mt-1 list-disc space-y-1 pr-4">
            <li>
              كل البيانات بتتنقل مشفّرة عبر اتصال آمن (HTTPS) وبتتخزّن في قواعد بيانات مشفّرة مقفلة.
            </li>
            <li>الوصول لها محدود لفريق التشغيل ولوحة الإدارة فقط، ومفيش وصول عام لها.</li>
            <li>مبنبيعلهاش، ومبنأجرهاش، ومبنشاركهاش مع أي جهة إعلانية أو تسويقية.</li>
            <li>
              العيادات الخاصة والمستشفيات الحكومية في الدليل بتدخل بياناتها بنفسها، وسَنَد ما يبيعش
              بيانات مرضاها.
            </li>
          </ul>
        </Section>

        <Section icon={Mic} title="3) بيانات الذكاء الاصطناعي والصوت">
          <ul className="mt-1 list-disc space-y-1 pr-4">
            <li>التعرّف على الكلام بيتم بخدمة جهازك أو متصفحك، وإحنا مبنخزّنيش تسجيلات صوتية.</li>
            <li>
              في ماسح الأدوية وقارئ التحاليل والتغذية والفرز الذكي، الصورة أو النص اللي بتبعته
              بيتبعت لخدمة Google Gemini (من Google) عشان يتحلل، وبنطلب موافقتك قبل أول فحص. مبنبعتش
              اسمك ولا رقمك معاه.
            </li>
            <li>
              نص سؤالك بس اللي بيروح لمزوّد الذكاء الاصطناعي عشان يطلعلك رد ويوجّهك للنوع المناسب من
              الرعاية.
            </li>
            <li>مبنستخدمش كلامك للتدريب التجاري ولا لربطه بحملات إعلانات.</li>
            <li>
              المساعد مبيعرفش يصف دواء ولا جرعة، فهو للتوجيه والفرز بس — راجع الطبيب لأي قرار علاجي.
            </li>
            <li>ما تكتبش في المحادثة بيانات ناس تانية أو تفاصيل طبية عن غيرك.</li>
          </ul>
        </Section>

        <Section icon={Share2} title="4) مع مين بنشارك بياناتك">
          <ul className="mt-1 list-disc space-y-1 pr-4">
            <li>
              العيادة اللي تحجز معها: بيوصلها اسمك ورقم هاتفك وموعدك أو دورك عشان تدير الطابور
              وتتواصل معاك.
            </li>
            <li>
              مزوّد الاستضافة وقاعدة البيانات ومزوّد الذكاء الاصطناعي: كمعالِجين للبيانات للقيام
              بالخدمة بس، بدون حق بيعها.
            </li>
            <li>
              مبنشاركهاش مع سماسرة بيانات أو شبكات إعلانات، ومبنديهاش لجهات تانية إلا بأمر قضائي أو
              لمصلحة صحية.
            </li>
          </ul>
        </Section>

        <Section icon={Lock} title="5) التخزين المحلي على جهازك">
          التطبيق بيحفظ على جهازك تفضيلاتك زي نمط المساعد الصوتي، وآخر بحث، وبيانات حجزك السريع.
          تقدر تمسحها في أي وقت من إعدادات المتصفح أو التطبيق، ومسحها مبيأثرش على حسابك.
        </Section>

        <Section icon={Trash2} title="6) مدة الاحتفاظ وحقك في الحذف">
          <p>
            بنحتفظ ببيانات الحجز بقدر الحاجة لتشغيل الخدمة والسجلات القانونية، وبنحذف اللي مابقاش
            ليه لازمة.
          </p>
          <p className="mt-1">
            ليك الحق الكامل تطلب حذف حسابك وكل بياناتك نهائياً من{" "}
            <span className="font-bold text-foreground">الإعدادات ← حسابي وبياناتي</span>، وتقدر
            تلغي الطلب قبل تنفيذه. بننفّذ الحذف دون تأخير غير مبرر، وبحد أقصى 30 يوم من تاريخ الطلب.
          </p>
        </Section>

        <Section icon={ShieldCheck} title="7) الأطفال">
          المنصة مخصصة للبالغين (18 سنة فأكثر). استخدام الطفل يكون بمسؤولية ومتابعة ولي الأمر.
        </Section>

        <Section icon={ShieldCheck} title="8) تغييرات السياسة">
          أي تعديل على السياسة دي بنعلنه هنا على نفس الصفحة، واستخدامك المستمر بعد الإعلان معناه
          موافقتك على النسخة المحدّثة. للمراجعة أو طلب حذف بياناتك، استخدم{" "}
          <span className="font-bold text-foreground">الإعدادات</span> أو{" "}
          <span className="font-bold text-foreground">صفحة عن المطوّر</span>.
        </Section>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        في الحالات الطارئة اتصل بالإسعاف فوراً على 123، وماتبوصلش انتظار الرد من المنصة.
      </p>
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
      <div className="mt-1">{children}</div>
    </div>
  );
}
