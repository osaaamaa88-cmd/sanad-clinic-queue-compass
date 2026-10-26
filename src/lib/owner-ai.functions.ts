import { createServerFn } from "@tanstack/react-start";

type Msg = { role: "user" | "assistant"; text: string };

const MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];

async function buildSnapshot() {
  const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const since = today.toISOString();
  const week = new Date(Date.now() - 7 * 864e5).toISOString();
  const count = async (t: string, f?: (q: any) => any) => {
    let q: any = (sb as any).from(t).select("id", { count: "exact", head: true });
    if (f) q = f(q);
    const { count } = await q;
    return count ?? 0;
  };
  const [
    clinicsRes,
    bookingsToday,
    bookingsWeek,
    bookingsAll,
    patients,
    hospitals,
    stories,
    reviews,
    errorsOpen,
    deletions,
    settings,
    recentErrors,
    recentBookings,
    users,
  ] = await Promise.all([
    sb
      .from("clinics")
      .select(
        "doctor, specialty_id, area, is_verified, is_disabled, clinic_status, rating, reviews, price",
      ),
    count("bookings", (q) => q.gte("created_at", since)),
    count("bookings", (q) => q.gte("created_at", week)),
    count("bookings"),
    count("patients"),
    count("governmental_hospitals"),
    count("clinic_stories", (q) => q.gt("expires_at", new Date().toISOString())),
    count("clinic_reviews"),
    count("app_error_logs", (q) => q.eq("resolved", false)),
    count("deletion_requests", (q) => q.eq("status", "pending")),
    sb.from("app_settings").select("maintenance, broadcast").limit(1).maybeSingle(),
    sb
      .from("app_error_logs")
      .select("created_at, screen, message")
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .limit(8),
    sb
      .from("bookings")
      .select("created_at, status, visit_type, clinic_id")
      .order("created_at", { ascending: false })
      .limit(15),
    sb.auth.admin.listUsers({ page: 1, perPage: 200 }),
  ]);
  const clinics = clinicsRes.data ?? [];
  return {
    now: new Date().toISOString(),
    users_total: users.data?.users.length ?? 0,
    users_new_today: (users.data?.users ?? []).filter((u) => u.created_at >= since).length,
    clinics_total: clinics.length,
    clinics_verified: clinics.filter((c) => c.is_verified).length,
    clinics_pending: clinics.filter((c) => !c.is_verified).length,
    clinics_disabled: clinics.filter((c) => c.is_disabled).length,
    clinics: clinics.slice(0, 60),
    bookings: { today: bookingsToday, last7days: bookingsWeek, total: bookingsAll },
    recent_bookings: recentBookings.data ?? [],
    patients_records: patients,
    governmental_hospitals: hospitals,
    active_stories: stories,
    reviews_total: reviews,
    open_errors: errorsOpen,
    recent_errors: (recentErrors.data ?? []).map((e) => ({
      ...e,
      message: String(e.message).slice(0, 200),
    })),
    pending_deletion_requests: deletions,
    settings: settings.data,
  };
}

const SYSTEM = `أنت "مساعد المالك" لتطبيق سند (منصة صحية مصرية: عيادات، حجوزات، مستشفيات حكومية، قصص العيادات، مساعد صوتي).
تتحدث مع مالك التطبيق فقط. أجب بالعربية المصرية بإيجاز ووضوح، واستخدم أرقاماً من "لقطة البيانات" فقط ولا تخترع أرقاماً.
ميزات التطبيق: بوابة مريض (بحث بالتخصص، خريطة، حجز، طابور مباشر، طوارئ 123، اتجاهات داخل التطبيق)، بوابة فريق العيادة (روشتة ذكية، استقبال وطابور، رسائل، قصص 12/24 ساعة وهايلايت)، لوحة إدارة (توثيق العيادات، الحسابات، الأمان، صحة النظام).
لا يمكنك تعديل الكود؛ لو طلب المالك تعديلاً برمجياً اقترح عليه التعديل بدقة ليطلبه من Lovable. لا تكشف كلمات مرور أو مفاتيح.`;

export const ownerAiChat = createServerFn({ method: "POST" })
  .inputValidator((d: { messages: Msg[] }) => {
    if (!d || !Array.isArray(d.messages)) throw new Error("Invalid input");
    const messages = d.messages
      .slice(-12)
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.text === "string")
      .map((m) => ({ role: m.role, text: m.text.slice(0, 4000) }));
    if (!messages.length) throw new Error("Invalid input");
    return { messages };
  })
  .handler(async ({ data }) => {
    const { assertAdminRequest } = await import("./admin-auth.server");
    await assertAdminRequest();
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("مفتاح الذكاء الاصطناعي غير مضبوط");
    const snapshot = await buildSnapshot();
    const body = JSON.stringify({
      systemInstruction: {
        parts: [
          { text: `${SYSTEM}\n\nلقطة البيانات الحالية (JSON):\n${JSON.stringify(snapshot)}` },
        ],
      },
      contents: data.messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }],
      })),
    });
    let lastErr = "تعذر الاتصال بالمساعد";
    for (const model of MODELS) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body,
        },
      );
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        lastErr =
          res.status === 429
            ? "تم تجاوز الحد المجاني مؤقتاً، جرّب بعد دقيقة."
            : json?.error?.message
              ? `خطأ من Gemini: ${json.error.message}`
              : "تعذر الاتصال بالمساعد";
        continue;
      }
      const text = (json?.candidates?.[0]?.content?.parts ?? [])
        .map((p: any) => p.text ?? "")
        .join("")
        .trim();
      if (text) return { text };
    }
    throw new Error(lastErr);
  });
