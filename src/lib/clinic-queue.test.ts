import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { kindOf, liveQueue, makePatientCode, PATIENT_CODE_RE, slotFor } from "./clinic-queue.ts";

const b = (n: number, kind: "new" | "followup" | "urgent", status: "waiting" | "in" | "done" = "waiting") => ({
  queueNumber: n,
  status,
  visitType: kind === "followup" ? ("followup" as const) : ("new" as const),
  slot: slotFor(kind, "10:00"),
});

describe("clinic queue", () => {
  it("puts urgent cases at the top of waiting patients", () => {
    const q = liveQueue([b(1, "new"), b(2, "followup"), b(3, "urgent")]);
    assert.deepEqual(q.map((x) => x.queueNumber), [3, 1, 2]);
  });
  it("keeps the patient currently inside first and hides finished ones", () => {
    const q = liveQueue([b(1, "new", "done"), b(2, "urgent"), b(4, "new", "in")]);
    assert.deepEqual(q.map((x) => x.queueNumber), [4, 2]);
  });
  it("detects visit kind", () => {
    assert.equal(kindOf(b(1, "urgent")), "urgent");
    assert.equal(kindOf(b(1, "followup")), "followup");
  });
  it("patient code format is SANAD-EG-XXXX-XXXX", () => {
    assert.match(makePatientCode(), PATIENT_CODE_RE);
  });
});
