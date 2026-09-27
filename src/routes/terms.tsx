import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "شروط الاستخدام وإخلاء المسؤولية — سَنَد" },
      {
        name: "description",
        content:
          "شروط استخدام منصة سَنَد وإخلاء المسؤولية: أداة تقنية لتنظيم المواعيد وتسهيل التواصل بين المريض والعيادة.",
      },
      { property: "og:title", content: "شروط الاستخدام وإخلاء المسؤولية — سَنَد" },
      {
        property: "og:description",
        content: "سَنَد أداة تنظيم مواعيد ولا تقدم استشارات طبية.",
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

      <div className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
        <Section title="طبيعة الخدمة">
          سَنَد منصة تنظيمية فقط: تعرض بيانات العيادات، وتتيح حجز دور أو موعد، وتسهّل التواصل مع
          العيادة. المنصة ليست جهة علاجية ولا تشخيصية.
        </Section>
        <Section title="مسؤولية العيادة والطبيب">
          كل الخدمات الطبية (الكشف، التشخيص، العلاج، الأسعار، المواعيد الفعلية) مسؤولية العيادة أو
          الطبيب وحده، وسَنَد غير مسؤول عن أي ضرر ناتج عنها.
        </Section>
        <Section title="دقة البيانات">
          بيانات العيادات يدخلها أصحابها. نبذل جهدنا في المراجعة والتوثيق، لكن لا نضمن دقة كل
          البيانات في كل وقت.
        </Section>
        <Section title="الطوارئ">
          في الحالات الطارئة اتصل بالإسعاف فوراً على 123، ولا تعتمد على المنصة كبديل عن الرعاية
          العاجلة.
        </Section>
        <Section title="الحاسبات الصحية">
          حاسبة الضغط والسكر وتذكير الأدوية أدوات استرشادية للتنظيم الشخصي فقط، وليست بديلاً عن رأي
          الطبيب.
        </Section>
        <Section title="الخصوصية">
          نستخدم بياناتك (الاسم ورقم الهاتف) فقط لإتمام الحجز وإبلاغ العيادة، ولا نبيعها لأي جهة.
        </Section>
        <Section title="قبول الشروط">
          استخدامك للمنصة أو تسجيل عيادتك عليها يعني موافقتك على هذه الشروط.
        </Section>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-extrabold text-foreground">{title}</p>
      <p className="mt-1">{children}</p>
    </div>
  );
}
