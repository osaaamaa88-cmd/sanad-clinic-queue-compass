import { useCallback, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const KEY = "sanad_ai_consent_v1";

/** One-time consent before the first AI scan. `ask()` resolves true when allowed. */
export function useAiConsent() {
  const [open, setOpen] = useState(false);
  const resolver = useRef<(v: boolean) => void>(undefined);
  const pending = useRef<Promise<boolean> | null>(null);

  const ask = useCallback((): Promise<boolean> => {
    if (pending.current) return pending.current;
    try {
      if (localStorage.getItem(KEY) === "yes") return Promise.resolve(true);
    } catch {
      /* ignore */
    }
    setOpen(true);
    pending.current = new Promise((r) => {
      resolver.current = r;
    });
    return pending.current;
  }, []);

  const finish = (ok: boolean) => {
    if (ok) {
      try {
        localStorage.setItem(KEY, "yes");
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
    resolver.current?.(ok);
    resolver.current = undefined;
    pending.current = null;
  };

  const dialog = (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) finish(false);
      }}
    >
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>قبل أول استخدام لمساعد نيمو</AlertDialogTitle>
          <AlertDialogDescription className="text-right leading-7">
            عند إرسال رسالة، قد يُرسل نصها أو تفريغها الصوتي والموقع التقريبي إلى Groq أو Google
            لمعالجتها. إذا تعذّر التعرف الصوتي على جهازك، قد يُرسل التسجيل الصوتي إلى Groq لتفريغه،
            وقد تُرسل الصور إلى Google للتحليل. لا نرسل اسمك أو رقمك مع الطلب. لا تكتب معلومات شخصية
            غير لازمة، ويمكنك رفض الإرسال. الردود إرشادية ولا تغني عن الطبيب.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={() => finish(false)}>لا، مش دلوقتي</AlertDialogCancel>
          <AlertDialogAction onClick={() => finish(true)}>موافق، كمّل</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { ask, dialog };
}

export function aiErrorMessage(e: unknown): string {
  const m = (e as Error)?.message || "";
  if (/unauthori|auth|jwt|401/i.test(m))
    return "سجّل دخولك الأول عشان تستخدم الفحص بالذكاء الاصطناعي.";
  return m.replace(/^RATE_LIMITED:\s*/, "") || "حصل خطأ";
}
