import { createFileRoute, Link } from "@tanstack/react-router";
import { Stethoscope, UserRound, ClipboardList, ShieldCheck, HeartPulse } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "طبيبك — اختر دورك" },
      { name: "description", content: "طبيبك: احجز عند أقرب طبيب واعرف دورك أول بأول." },
    ],
  }),
  component: Landing,
});

const roles = [
  { to: "/patient", title: "أنا مريض", desc: "دور على طبيب واحجز موعد", icon: UserRound, tone: "gradient-primary text-white" },
  { to: "/reception", title: "سكرتير عيادة", desc: "إدارة الحجوزات ودخول المرضى", icon: ClipboardList, tone: "bg-card text-foreground" },
  { to: "/doctor", title: "طبيب / عيادة", desc: "بروفايل العيادة ومواعيدها", icon: Stethoscope, tone: "bg-card text-foreground" },
  { to: "/admin", title: "مالك التطبيق", desc: "توثيق العيادات والإحصائيات", icon: ShieldCheck, tone: "bg-card text-foreground" },
] as const;

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 py-10">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl gradient-primary text-white shadow-soft">
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">طبيبك</h1>
            <p className="text-sm text-muted-foreground">صحتك أهم حاجة، وإحنا معاك</p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl gradient-primary p-6 text-white shadow-soft">
          <h2 className="text-xl font-bold">أهلاً بيك</h2>
          <p className="mt-1 text-sm opacity-90">
            اختار الواجهة اللي تخصك عشان تبدأ. التطبيق يشتغل بالكامل باللغة العربية ومظبوط لكبار السن.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">اختار دورك</p>
          {roles.map((r) => (
            <Link
              key={r.to}
              to={r.to}
              className={`flex items-center gap-4 rounded-2xl border border-border p-4 transition hover:shadow-soft ${r.tone}`}
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/20">
                <r.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold">{r.title}</div>
                <div className={`text-sm ${r.tone.includes("text-white") ? "opacity-90" : "text-muted-foreground"}`}>{r.desc}</div>
              </div>
              <div className="text-xl opacity-70">←</div>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          نسخة تجريبية للعرض — بيانات نموذجية
        </p>
      </div>
    </div>
  );
}
