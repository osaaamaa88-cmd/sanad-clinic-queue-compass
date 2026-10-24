import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ChevronDown, HeartPulse, Phone } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { speak } from "@/lib/voice";
import { Volume2, Square } from "lucide-react";

export const Route = createFileRoute("/patient/first-aid")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "سَنَد — دليل الإسعافات الأولية" },
      {
        name: "description",
        content:
          "خطوات إسعافات أولية سريعة تعمل بدون إنترنت: الغيبوبة، الحروق، ضربات الشمس، الاختناق.",
      },
    ],
  }),
  component: FirstAidPage,
});

type AidCard = { id: string; icon: string; title: string; steps: string[]; warn: string };

const CARDS: AidCard[] = [
  {
    id: "faint",
    icon: "🫨",
    title: "الغيبوبة وفقدان الوعي وهبوط السكر",
    steps: [
      "اتصل بالإسعاف 123 فوراً أو خلي حد تاني يتصل وانت بتعمل الخطوات.",
      "افتح مجرى الهواء: ارنح الشخص على ضهره وارفع راسه لورا شوية وشدّه من الفك برفق.",
      "شوف التنفس 10 ثواني: ناظر للحركة واسمع وحس ببخار النفس على خدك.",
      "لو مش بيتنفس: ابدأ إنعاش قلبي — 30 ضغطة في نص الصدر تليها نفسين، واستمر لحد وصول الإسعاف.",
      "لو بيتنفس وعنده سكر (مريض سكر معروف وبيبص رجلاوي): حط سكر أو عصاير تحت لسانه لو واعي جزئياً فقط.",
      "ما تحاولش تسيبله أكل أو مية لو مش واعي خالص — خطر الاختناق.",
    ],
    warn: "لو الشخص مش بيتنفس والضغط القلبي هو الحل الوحيد المتاح — ابدأ فوراً ولا توقف غير لما الإسعاف يوصل.",
  },
  {
    id: "burn",
    icon: "🔥",
    title: "الحروق والجروح",
    steps: [
      "ابعد الشخص عن مصدر الحرق فوراً وبعدين بردّ المنطقة بمية باردة جارية 10-20 دقيقة.",
      "شيل الخواتم والساعات من المنطقة المصابة قبل ما يتورم.",
      "غطي الحرق بشاش نظيف أو قماش نظيف غير لاصق — من غير كريمات أو معجون أسنان أو زيت.",
      "للجروح: اضغط على الجرح بقماش نظيف 10 دقايق لرفع النزيف، وارفع الطرف لفوق لو ينفع.",
      "خد مسكن بانادول لو الوجع شديد (مش أسبرين للحروق).",
    ],
    warn: "روح الطوارئ فوراً لو: الحرق أكبر من كف الايد، أو في الوش أو المفاصل، أو طبقة الجلد الجاي تفصل، أو جروح نازفة مش بتقف بالضغط.",
  },
  {
    id: "sun",
    icon: "☀️",
    title: "ضربات الشمس والحرارة العالية عند الأطفال",
    steps: [
      "انقل الطفل لمكان مظلل بارد فوراً وشيل الملابس السميكة.",
      "برّد الجسم بفوط مبلولة بمية فاترة (مش ثلج) على الرقبة والابط والفخذ.",
      "شغّل مروحة أو نااوية هواء وبعيد عن الشمس مباشرة.",
      "لو الطفل واعي وصاحي: قدمه رشفات صغيرة من مية أو محلول إماهة كل شوية.",
      "لو الحرارة فوق 39.5 وحصل تشنج أو فقد وعي: اتصل بالإسعاف 123 فوراً.",
    ],
    warn: "ماتعطيش خافض حرارة (مثل باراسيتامول) لو الضربة الشمسية من نفسها — البرودة الفيزيائية هي اللي تهم الأول.",
  },
  {
    id: "choking",
    icon: "😮‍💨",
    title: "الاختناق وبلع اللسان",
    steps: [
      "لو الشخص بيسعل بشدة: سيبه يسعل — السعال هو أنجع طريقة لإخراج الجسم الغريب.",
      "لو مش قادر يتنفس ولا يسعل ولا يتكلم: اعمل 5 ضربات قوية على الضهر بين الكتافين (الميل لقدام).",
      "لو لسه متسدد: اعمل مناورة هيمليك — احضن الشخص من ورا، حط ايدك فوق السرة وتحت القفص الصدري، واعمل 5 ضغطات جوا وناحية فوق.",
      "للرضع: 5 ضربات ضهر والطفل على وشه على ساعدك، وبعدين 5 ضغطات صدر بأصابعك — مش هيمليك كامل.",
      "لو الشخص فاقد الوعي بسبب تشنج أو بلع لسان: ارنحه على جنبه (وضعية النوم الجانبي) عشان اللعاب والمخاط يطلع برا، واتصل بالإسعاف فوراً.",
    ],
    warn: "بلع اللسان مش حاجة بتتحصل فعلياً — لكن التشنجات ممكن تسبب اصابة الفك. ماتحطش حاجة في بوق شخص بيعمل تشنج — بس ارنحه على جنبه.",
  },
];

function FirstAidPage() {
  const [open, setOpen] = useState<string | null>(CARDS[0].id);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  function toggleSpeak(card: AidCard) {
    if (speakingId === card.id) {
      stopRef.current?.();
      stopRef.current = null;
      setSpeakingId(null);
      return;
    }
    stopRef.current?.();
    stopRef.current = speak(`${card.title}. ${card.steps.join(" ")}`, () => setSpeakingId(null));
    setSpeakingId(card.id);
  }

  return (
    <AppShell
      title="الإسعافات الأولية"
      subtitle="يعمل بدون إنترنت — احفظه في جهازك"
      backTo="/patient/emergency"
      tone="light"
      right={
        <a
          href="tel:123"
          aria-label="اتصل بالإسعاف 123"
          className="grid h-10 w-10 place-items-center rounded-full bg-rose-600 text-white"
        >
          <Phone className="h-5 w-5" />
        </a>
      }
    >
      <div className="mx-auto max-w-xl space-y-3 p-4 pb-28">
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <HeartPulse className="h-6 w-6 shrink-0 text-rose-600" />
          <p className="text-xs leading-6 text-rose-900">
            الخطوات دي إرشادية للتعامل الأولي بس، ومبتغيش عن الرعاية الطبية. لو الحالة خطيرة اتصل
            بالإسعاف <b>123</b> فوراً.
          </p>
        </div>
        {CARDS.map((card) => {
          const isOpen = open === card.id;
          return (
            <section
              key={card.id}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : card.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 p-4 text-right"
              >
                <span className="text-2xl" aria-hidden="true">
                  {card.icon}
                </span>
                <span className="flex-1 text-sm font-extrabold">{card.title}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div className="border-t border-border px-4 pb-4 pt-3">
                  <ol className="space-y-2 text-sm leading-7 text-foreground">
                    {card.steps.map((step, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-black text-primary">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 rounded-xl bg-warning/15 p-3 text-xs leading-6 text-warning-foreground">
                    ⚠️ {card.warn}
                  </p>
                  <button
                    type="button"
                    onClick={() => toggleSpeak(card)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 py-2.5 text-xs font-extrabold text-primary"
                  >
                    {speakingId === card.id ? (
                      <>
                        <Square className="h-4 w-4" /> إيقاف القراءة
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4" /> اسمع الخطوات بصوت نيمو
                      </>
                    )}
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
