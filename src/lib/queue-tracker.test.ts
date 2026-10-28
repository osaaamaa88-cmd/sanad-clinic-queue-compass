import { describe, expect, it } from "vitest";
import { computeQueueState } from "@/lib/queue-tracker";

describe("computeQueueState", () => {
  it("counts patients ahead excluding the one being served", () => {
    const state = computeQueueState(3, 7);
    expect(state.ahead).toBe(3);
    expect(state.arrived).toBe(false);
    expect(state.etaMinutes).toBe(30);
  });

  it("marks the patient as next when only the served one remains", () => {
    const state = computeQueueState(6, 7);
    expect(state.ahead).toBe(0);
    expect(state.arrived).toBe(false);
    expect(state.statusLabel).toContain("مباشرة");
  });

  it("arrives once the clinic passes the patient number", () => {
    const state = computeQueueState(7, 7);
    expect(state.arrived).toBe(true);
    expect(state.etaMinutes).toBe(0);
  });

  it("reports no active queue when the patient has no number", () => {
    const state = computeQueueState(5, 0);
    expect(state.ahead).toBe(0);
    expect(state.arrived).toBe(false);
    expect(state.progress).toBe(0);
  });

  it("clamps progress between 0 and 1", () => {
    expect(computeQueueState(2, 8).progress).toBe(0.25);
    expect(computeQueueState(20, 8).progress).toBe(1);
  });
});
