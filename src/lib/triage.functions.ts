import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runTriage } from "./triage.server";

export const triageNeed = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ need: z.string().trim().min(3).max(800), location: z.string().trim().max(120) }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      return { ok: true as const, result: await runTriage(data.need, data.location) };
    } catch (e) {
      console.error("triage failed", e);
      const status = (e as { statusCode?: number })?.statusCode;
      const error =
        status === 429
          ? "الضغط عالي دلوقتي، جرّب بعد دقيقة."
          : status === 402 || status === 403
            ? "خدمة المساعد الذكي متوقفة مؤقتاً."
            : "تعذّر فهم الطلب، جرّب تكتبه بشكل أوضح.";
      return { ok: false as const, error };
    }
  });
