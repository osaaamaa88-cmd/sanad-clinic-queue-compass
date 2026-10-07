import { toast } from "sonner";
import { reportSaveFailure } from "@/lib/health.functions";

// Every error toast in the app = a failed user action; log it for the owner's health panel.
if (typeof window !== "undefined" && !(toast as unknown as { __sanad?: boolean }).__sanad) {
  const orig = toast.error;
  (toast as unknown as { __sanad: boolean }).__sanad = true;
  (toast as { error: typeof toast.error }).error = ((msg, opts) => {
    reportSaveFailure({
      data: { action: document.title.split("|")[0].trim() || "حفظ", message: String(typeof msg === "function" ? "error" : msg), path: location.pathname },
    }).catch(() => {});
    return orig(msg, opts);
  }) as typeof toast.error;
}
