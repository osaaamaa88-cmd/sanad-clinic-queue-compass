import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bpStatus, healthScore, parseReadings, sugarStatus } from "./organ-insights.ts";

describe("organ insights", () => {
  it("high blood pressure 150/95 is an alert", () => {
    assert.equal(bpStatus({ sys: 150, dia: 95, at: "" }), "alert");
  });
  it("fasting sugar 95 is normal, 250 is alert", () => {
    assert.equal(sugarStatus({ value: 95, at: "" }), "normal");
    assert.equal(sugarStatus({ value: 250, at: "" }), "alert");
  });
  it("uses the latest reading of each kind", () => {
    const snap = parseReadings(
      JSON.stringify([
        { kind: "bp", sys: 150, dia: 95, at: "2026-01-01" },
        { kind: "bp", sys: 118, dia: 76, at: "2026-02-01" },
      ]),
    );
    assert.equal(snap.bp?.sys, 118);
  });
  it("no readings gives no score", () => {
    assert.equal(healthScore({}), null);
  });
});
