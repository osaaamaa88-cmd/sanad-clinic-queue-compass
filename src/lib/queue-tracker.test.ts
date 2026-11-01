import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeQueueState } from "./queue-tracker.ts";

describe("computeQueueState", () => {
  it("counts patients ahead excluding the one being served", () => {
    const state = computeQueueState(3, 7);
    assert.equal(state.ahead, 3);
    assert.equal(state.arrived, false);
    assert.equal(state.etaMinutes, 30);
  });

  it("marks the patient as next when only the served one remains", () => {
    const state = computeQueueState(6, 7);
    assert.equal(state.ahead, 0);
    assert.equal(state.arrived, false);
    assert.ok(state.statusLabel.includes("مباشرة"));
  });

  it("arrives once the clinic passes the patient number", () => {
    const state = computeQueueState(7, 7);
    assert.equal(state.arrived, true);
    assert.equal(state.etaMinutes, 0);
  });

  it("reports no active queue when the patient has no number", () => {
    const state = computeQueueState(5, 0);
    assert.equal(state.ahead, 0);
    assert.equal(state.arrived, false);
    assert.equal(state.progress, 0);
  });

  it("clamps progress between 0 and 1", () => {
    assert.equal(computeQueueState(2, 8).progress, 0.25);
    assert.equal(computeQueueState(20, 8).progress, 1);
  });
});
