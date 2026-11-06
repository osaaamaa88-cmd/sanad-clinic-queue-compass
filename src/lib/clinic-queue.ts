import type { Booking } from "@/lib/mock-data";

/** علامة الحالة المستعجلة داخل خانة الموعد، حتى تظهر على كل الأجهزة بدون تغيير قاعدة البيانات. */
export const URGENT_MARK = "🚨";

export type VisitKind = "new" | "followup" | "urgent";

export function slotFor(kind: VisitKind, time: string) {
  return kind === "urgent" ? `${URGENT_MARK} ${time}` : time;
}

export function kindOf(b: Pick<Booking, "slot" | "visitType">): VisitKind {
  if (b.slot?.startsWith(URGENT_MARK)) return "urgent";
  return b.visitType === "followup" ? "followup" : "new";
}

/** الطابور الحي: المستعجل أولاً، ثم بالترتيب. المنتهي والملغي يُستبعد. */
export function liveQueue<T extends Pick<Booking, "slot" | "visitType" | "status" | "queueNumber">>(rows: T[]): T[] {
  return rows
    .filter((r) => r.status === "waiting" || r.status === "in")
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "in" ? -1 : 1;
      const ua = kindOf(a) === "urgent" ? 0 : 1;
      const ub = kindOf(b) === "urgent" ? 0 : 1;
      return ua - ub || a.queueNumber - b.queueNumber;
    });
}

/** كود المريض الموحد بصيغة SANAD-EG-XXXX-XXXX */
export function makePatientCode(rand: () => number = Math.random) {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () => Array.from({ length: 4 }, () => A[Math.floor(rand() * A.length)]).join("");
  return `SANAD-EG-${part()}-${part()}`;
}

export const PATIENT_CODE_RE = /^SANAD-EG-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
