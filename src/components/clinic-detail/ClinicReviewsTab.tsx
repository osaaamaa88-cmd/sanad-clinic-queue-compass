import { BadgeCheck, Star } from "lucide-react";
import { listClinicReviews, submitVerifiedReview, type ClinicReview } from "@/lib/reviews";
import type { Clinic } from "@/lib/mock-data";
import type { ClinicProfileExtras } from "@/lib/clinic-profile";
import type { PatientSession } from "@/lib/patient-session";

/** Feature flag: review form stays disabled until verified booking codes reach patients. */
const REVIEW_FORM_ENABLED = false;

export function ClinicReviewsTab({
  id,
  clinic,
  extras,
  reviews,
  setReviews,
  isOwner,
  reviewRating,
  setReviewRating,
  reviewCode,
  setReviewCode,
  reviewComment,
  setReviewComment,
  reviewMsg,
  setReviewMsg,
  busy,
  setBusy,
  requirePatient,
  refreshExtras,
}: {
  id: string;
  clinic: Clinic;
  extras: ClinicProfileExtras | null;
  reviews: ClinicReview[];
  setReviews: (reviews: ClinicReview[]) => void;
  isOwner: boolean;
  reviewRating: number;
  setReviewRating: (n: number) => void;
  reviewCode: string;
  setReviewCode: (v: string) => void;
  reviewComment: string;
  setReviewComment: (v: string) => void;
  reviewMsg: string;
  setReviewMsg: (v: string) => void;
  busy: string | null;
  setBusy: (v: string | null) => void;
  requirePatient: (action: (s: PatientSession) => void) => void;
  refreshExtras: () => Promise<void>;
}) {
  const realReviewsCount = clinic.isDemo ? 0 : (extras?.reviewsCount ?? 0);
  const realRating = extras?.ratingAvg ?? 0;
  return (
    <div className="mt-4 space-y-4">
      {/* Reviews */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-bold">التقييم</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="text-3xl font-black text-primary">
            {clinic.isDemo ? "—" : realReviewsCount > 0 ? realRating.toFixed(1) : "جديد"}
          </div>
          <div>
            {!clinic.isDemo && realReviewsCount > 0 && (
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-4 w-4 ${n <= Math.round(realRating) ? "fill-warning text-warning" : "text-muted-foreground"}`}
                  />
                ))}
              </div>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">
              {clinic.isDemo
                ? "العيادة تجريبية ولا تملك تقييماً حقيقياً"
                : realReviewsCount > 0
                  ? `${realReviewsCount} تقييم من المرضى`
                  : "لسه مفيش تقييمات"}
            </p>
          </div>
        </div>
        <p className="mt-3 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
          {clinic.isDemo
            ? "بيانات التقييمات التجريبية غير معروضة كتقييمات حقيقية."
            : "التقييم بيتحدّث تلقائياً من تقييمات المرضى اللي خلصوا كشف فعلاً."}
        </p>

        {/* Real reviews */}
        <div className="mt-3 space-y-2">
          {clinic.isDemo || reviews.length === 0 ? (
            <p className="text-xs text-muted-foreground">لسه مفيش تعليقات من المرضى.</p>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-secondary/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold">{r.patientName}</span>
                    {r.visited && (
                      <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-xs font-bold text-success">
                        <BadgeCheck className="h-3 w-3" /> مريض قام بالزيارة
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-3 w-3 ${n <= r.rating ? "fill-warning text-warning" : "text-muted-foreground"}`}
                      />
                    ))}
                  </div>
                </div>
                {r.comment && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.comment}</p>
                )}
              </div>
            ))
          )}
        </div>

        {!isOwner && (
          <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-center text-xs font-bold text-muted-foreground">
            التقييم بكود الحجز قريباً ⏳
          </p>
        )}
        {/* Verified review form — shipped behind a flag until codes reach patients. */}
        {REVIEW_FORM_ENABLED && !isOwner && (
          <div className="mt-3 rounded-xl border border-dashed border-border p-3">
            <p className="text-xs font-extrabold">قيّم الطبيب بعد الكشف</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              اكتب كود الحجز بتاعك (SND-XXXXX) — التقييم متاح بعد ما العيادة تسجّل إنك خلصت كشف.
            </p>
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setReviewRating(n)}
                  aria-label={`${n} نجوم`}
                  className="grid h-11 w-11 place-items-center"
                >
                  <Star
                    className={`h-5 w-5 ${n <= reviewRating ? "fill-warning text-warning" : "text-muted-foreground"}`}
                  />
                </button>
              ))}
            </div>
            <input
              value={reviewCode}
              onChange={(e) => setReviewCode(e.target.value)}
              placeholder="كود الحجز"
              className="mt-2 w-full rounded-xl border border-border bg-background p-2 text-sm"
            />
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="رأيك في الدكتور والعيادة (اختياري)"
              rows={2}
              className="mt-2 w-full rounded-xl border border-border bg-background p-2 text-sm"
            />
            {reviewMsg && <p className="mt-2 text-xs font-bold text-primary">{reviewMsg}</p>}
            <button
              disabled={busy === "review"}
              onClick={() =>
                requirePatient(async () => {
                  setReviewMsg("");
                  setBusy("review");
                  const res = await submitVerifiedReview({
                    clinicId: id,
                    bookingCode: reviewCode,
                    rating: reviewRating,
                    comment: reviewComment,
                  });
                  setBusy(null);
                  if (res.ok) {
                    setReviewMsg("تم إضافة تقييمك، شكراً ليك 🙏");
                    setReviewCode("");
                    setReviewComment("");
                    setReviews(await listClinicReviews(id));
                    refreshExtras();
                  } else {
                    setReviewMsg(res.error ?? "");
                  }
                })
              }
              className="mt-2 w-full rounded-xl bg-primary p-2.5 text-sm font-extrabold text-primary-foreground disabled:opacity-60"
            >
              {busy === "review" ? "جاري الإرسال…" : "إرسال التقييم"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
