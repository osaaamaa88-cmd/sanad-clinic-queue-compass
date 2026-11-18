/** مبدّل «تسجيل الدخول / حساب جديد» — نفس الكتلة في صفحة دخول الطبيب
 * وإعدادات العيادة (تسمية زر التسجيل فقط تختلف بينهما). */
export function AuthModeToggle({
  mode,
  setMode,
  signupLabel,
}: {
  mode: "login" | "signup";
  setMode: (mode: "login" | "signup") => void;
  signupLabel: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(
        [
          ["login", "تسجيل الدخول"],
          ["signup", signupLabel],
        ] as const
      ).map(([m, label]) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={`rounded-xl py-2.5 text-sm font-bold ${
            mode === m ? "gradient-primary text-white" : "border border-border bg-card"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
