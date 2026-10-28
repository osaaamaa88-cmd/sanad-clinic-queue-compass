/** Pure queue-tracking math shared by the live tracker card and the queue page. */

export type QueueState = {
  /** Patients still ahead of you (0 = you are next). */
  ahead: number;
  /** True once the clinic passed your number. */
  arrived: boolean;
  /** Estimated waiting minutes (~10 min per patient). */
  etaMinutes: number;
  /** 0..1 progress of the queue towards your number. */
  progress: number;
  /** Short Arabic status line for the tracker card. */
  statusLabel: string;
};

export function computeQueueState(nowServing: number, yourNumber: number): QueueState {
  const serving = Math.max(0, Math.floor(nowServing));
  const mine = Math.max(0, Math.floor(yourNumber));
  const arrived = mine > 0 && serving >= mine;
  const ahead = mine > 0 ? Math.max(0, mine - serving - 1) : 0;
  const progress = mine > 0 ? Math.min(1, Math.max(0, serving / mine)) : 0;
  const statusLabel =
    mine <= 0
      ? "لا يوجد دور نشط"
      : arrived
        ? "🎉 دورك دلوقتي! اتفضل"
        : ahead === 0
          ? "دورك بعد المريض ده مباشرة"
          : `فاضل قدامك ${ahead} مرضى`;
  return { ahead, arrived, etaMinutes: arrived ? 0 : ahead * 10, progress, statusLabel };
}
