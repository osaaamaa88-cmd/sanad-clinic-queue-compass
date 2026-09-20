import { svrListClinicReviews, svrSubmitVerifiedReview } from "@/lib/reviews.functions";

export type ClinicReview = {
  id: string;
  rating: number;
  comment: string;
  patientName: string;
  visited: boolean;
  createdAt: string;
};

export async function listClinicReviews(clinicId: string): Promise<ClinicReview[]> {
  try {
    const { rows } = await svrListClinicReviews({ data: { clinicId } });
    return rows;
  } catch {
    return [];
  }
}

const REVIEW_ERRORS: Record<string, string> = {
  NO_CODE: "اكتب كود الحجز الأول.",
  INVALID_RATING: "اختار عدد النجوم من ١ لـ ٥.",
  CODE_NOT_FOUND: "كود الحجز ده مش موجود في العيادة دي.",
  VISIT_NOT_DONE: "التقييم بيتفتح بعد ما العيادة تسجّل إنك خلصت كشف.",
  ALREADY_REVIEWED: "الكود ده اتقيّم قبل كده. شكراً لك 🙏",
};

export async function submitVerifiedReview(input: {
  clinicId: string;
  bookingCode: string;
  rating: number;
  comment?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await svrSubmitVerifiedReview({ data: input });
    return { ok: true };
  } catch (e) {
    const code = (e as Error)?.message || "SAVE_FAILED";
    return { ok: false, error: REVIEW_ERRORS[code] ?? "حصلت مشكلة، حاول تاني." };
  }
}
