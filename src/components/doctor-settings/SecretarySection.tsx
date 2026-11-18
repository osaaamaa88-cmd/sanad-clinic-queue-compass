import { Loader2, UserPlus } from "lucide-react";

export function SecretarySection({
  secretaries,
  secName,
  setSecName,
  secEmail,
  setSecEmail,
  secPass,
  setSecPass,
  secError,
  secBusy,
  onAddSecretary,
}: {
  secretaries: { id: string; full_name: string }[];
  secName: string;
  setSecName: (value: string) => void;
  secEmail: string;
  setSecEmail: (value: string) => void;
  secPass: string;
  setSecPass: (value: string) => void;
  secError: string;
  secBusy: boolean;
  onAddSecretary: () => void;
}) {
  return (
    <>
      <h2 className="mt-6 text-base font-bold">فريق العمل — حسابات السكرتير</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        السكرتير بيدخل بالبريد وكلمة السر ويقدر يفتح دفتر الحجز ويعدّل رقم الدور — المرضى مش
        بيقدروا.
      </p>
      <div className="mt-3 space-y-2">
        {secretaries.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card shadow-soft p-3"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary">
              {(s.full_name || "س").charAt(0)}
            </div>
            <p className="min-w-0 flex-1 truncate text-sm font-bold">{s.full_name || "سكرتير"}</p>
            <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-bold text-success">
              مفعّل
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2 rounded-2xl border-2 border-dashed border-border p-3">
        <input
          value={secName}
          onChange={(e) => setSecName(e.target.value)}
          placeholder="اسم السكرتير"
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <input
          value={secEmail}
          onChange={(e) => setSecEmail(e.target.value)}
          placeholder="بريد السكرتير"
          type="email"
          dir="ltr"
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <input
          value={secPass}
          onChange={(e) => setSecPass(e.target.value)}
          placeholder="كلمة سر السكرتير"
          type="password"
          dir="ltr"
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        {secError && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-[12px] font-bold text-destructive">
            {secError}
          </p>
        )}
        <button
          onClick={onAddSecretary}
          disabled={secBusy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-2.5 text-sm font-bold disabled:opacity-60"
        >
          {secBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}{" "}
          إضافة حساب سكرتير
        </button>
      </div>
    </>
  );
}
