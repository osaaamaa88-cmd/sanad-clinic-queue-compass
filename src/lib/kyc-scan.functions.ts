import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";

export type KycScan = {
  found: boolean;
  docType: "syndicate_card" | "practice_license" | "national_id" | "other";
  fullName: string;
  syndicateNo: string;
  licenseNo: string;
  grade: string;
  specialty: string;
  branch: string;
  expiry: string;
  looksEdited: boolean;
};

const PROMPT = `أنت موظف توثيق في منصة طبية مصرية. اقرأ صورة المستند المهني للطبيب (كارنيه نقابة أطباء مصر أو ترخيص مزاولة المهنة من وزارة الصحة).
استخرج فقط ما هو مطبوع وظاهر بوضوح، ولا تخمّن أي رقم. اكتب الأرقام كما هي.
لاحظ إذا كانت الصورة لقطة شاشة من موقع/سوشيال، أو بها تعديل واضح، أو ليست مستندا أصليا: looksEdited=true.
أعد JSON فقط:
{"found":true,"docType":"syndicate_card|practice_license|national_id|other","fullName":"","syndicateNo":"رقم القيد","licenseNo":"رقم الترخيص","grade":"ممارس عام|أخصائي|استشاري|","specialty":"","branch":"النقابة الفرعية","expiry":"","looksEdited":false}
لو الصورة ليست مستندا مهنيا طبيا اجعل found=false.`;

const s = (v: unknown, n = 120) => (typeof v === "string" ? v.slice(0, n).trim() : "");

export const scanDoctorKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { image: string; mime: string }) => {
    const image = typeof d?.image === "string" ? d.image : "";
    if (!image || image.length > 8_000_000) throw new Error("الصورة غير صالحة أو كبيرة جداً");
    const mime = /^image\/(jpeg|png|webp)$/.test(d?.mime ?? "") ? d.mime : "image/jpeg";
    return { image, mime };
  })
  .handler(async ({ data, context }): Promise<KycScan> => {
    await (await import("@/lib/rate-limit.server")).assertAiRateLimit("scanDoctorKyc", context.userId);
    const { callGemini } = await import("@/lib/medscan.functions");
    let o: Record<string, unknown>;
    try {
      o = (await callGemini(PROMPT, undefined, data.image, data.mime)) as Record<string, unknown>;
    } catch {
      throw new Error("تعذّرت قراءة المستند الآن، جرّب صورة أوضح بعد قليل.");
    }
    const t = s(o.docType, 30);
    return {
      found: o.found === true,
      docType:
        t === "syndicate_card" || t === "practice_license" || t === "national_id" ? t : "other",
      fullName: s(o.fullName),
      syndicateNo: s(o.syndicateNo, 30),
      licenseNo: s(o.licenseNo, 30),
      grade: s(o.grade, 30),
      specialty: s(o.specialty, 60),
      branch: s(o.branch, 60),
      expiry: s(o.expiry, 30),
      looksEdited: o.looksEdited === true,
    };
  });
