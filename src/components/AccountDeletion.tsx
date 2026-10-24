import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, ShieldCheck, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPatientSession } from "@/lib/patient-session";
import {
  LOCAL_PATIENT_KEYS,
  svrCancelDeletionRequest,
  svrMyDeletionRequest,
  svrRequestAccountDeletion,
} from "@/lib/account.functions";

type RequestRow = {
  id: string;
  status: "pending" | "processed" | "cancelled";
  created_at: string;
  processed_at: string | null;
};

/** Settings section: request a full account & data wipe, or clear this device. */
export function AccountDeletion() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [request, setRequest] = useState<RequestRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const askDelete = useServerFn(svrRequestAccountDeletion);
  const loadRequest = useServerFn(svrMyDeletionRequest);
  const cancelRequest = useServerFn(svrCancelDeletionRequest);

  useEffect(() => {
    let alive = true;
    const sync = async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      const id = data.session?.user?.id ?? null;
      setUserId(id);
      setReady(true);
      if (!id) {
        setRequest(null);
        return;
      }
      try {
        const res = await loadRequest();
        if (alive) setRequest(res.request as RequestRow | null);
      } catch {
        /* status is informative only */
      }
    };
    void sync();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void sync());
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [loadRequest]);

  const submit = async () => {
    if (busy) return;
    const ok = window.confirm(
      "حذف حسابك وبياناتك نهائياً؟ هيتسجل طلب حذف كامل لبياناتك من التطبيق وسجلات العيادات المرتبطة بحجزك. تقدر تلغي الطلب قبل تنفيذه.",
    );
    if (!ok) return;
    setBusy(true);
    setNote(null);
    try {
      const phone = getPatientSession()?.phone ?? "";
      await askDelete({ data: { phone } });
      const res = await loadRequest();
      setRequest(res.request as RequestRow | null);
      setNote(
        "تم استلام طلب حذف حسابك وبياناتك. هيتم التنفيذ بدون تأخير غير مبرر، وبحد أقصى 30 يوم.",
      );
    } catch {
      setNote("مقدرناش نسجّل الطلب دلوقتي. جرّب تاني بعد شوية.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      await cancelRequest();
      const res = await loadRequest();
      setRequest(res.request as RequestRow | null);
      setNote("تم إلغاء طلب الحذف، وحسابك شغال عادي.");
    } catch {
      setNote("مقدرناش نلغي الطلب دلوقتي. جرّب تاني.");
    } finally {
      setBusy(false);
    }
  };

  const clearDevice = () => {
    if (
      window.confirm("مسح بيانات هذا الجهاز؟ هيتشيل حجزك المحفوظ وجلسة المريض من الجهاز ده بس.")
    ) {
      for (const k of LOCAL_PATIENT_KEYS) window.localStorage.removeItem(k);
      setNote("تم مسح بيانات هذا الجهاز.");
    }
  };

  if (!ready) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> جاري التحقق من الحساب…
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-extrabold text-foreground">
        <Trash2 className="h-4 w-4 shrink-0 text-primary" />
        حسابي وبياناتي
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        ليك الحق تطلب حذف حسابك وكل بياناتك نهائياً.{" "}
        <Link to="/privacy" className="font-bold text-primary underline">
          سياسة الخصوصية
        </Link>{" "}
        و{" "}
        <Link to="/terms" className="font-bold text-primary underline">
          شروط الاستخدام
        </Link>
        .
      </p>

      {!userId && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            انت مش مسجل دخول على الجهاز ده. سجّل دخولك عشان تقدر تطلب حذف حسابك كامل، أو امسح بيانات
            الجهاز المحلي.
          </p>
          <button
            onClick={clearDevice}
            className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm font-bold"
          >
            مسح بيانات هذا الجهاز
          </button>
        </div>
      )}

      {userId && request?.status === "pending" && (
        <div className="mt-3 space-y-2">
          <p className="rounded-xl bg-warning/10 p-3 text-xs font-bold leading-relaxed text-foreground">
            طلب الحذف بتاعك مستلم وقيد التنفيذ من تاريخ{" "}
            {new Date(request.created_at).toLocaleDateString("ar-EG")}.
          </p>
          <button
            onClick={cancel}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            إلغاء طلب الحذف
          </button>
        </div>
      )}

      {userId && request?.status === "processed" && (
        <p className="mt-3 rounded-xl bg-secondary p-3 text-xs font-bold text-foreground">
          تم تنفيذ حذف بياناتك. لو لسه شايف بياناتك، تواصل معانا تاني.
        </p>
      )}

      {userId && (!request || request.status === "cancelled") && (
        <button
          onClick={submit}
          disabled={busy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-extrabold text-destructive disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          طلب حذف حسابي وبياناتي نهائياَ
        </button>
      )}

      {note && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-secondary p-3 text-xs font-bold leading-relaxed text-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          {note}
        </p>
      )}
    </div>
  );
}
