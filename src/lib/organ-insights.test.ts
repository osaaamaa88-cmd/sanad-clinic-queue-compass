import { describe, expect, it } from "vitest";
import { bpStatus, healthScore, parseReadings, sugarStatus } from "./organ-insights";

describe("organ insights", () => {
  it("high blood pressure 150/95 is an alert", () => {
    expect(bpStatus({ sys: 150, dia: 95, at: "" })).toBe("alert");
  });
  it("fasting sugar 95 is normal, 250 is alert", () => {
    expect(sugarStatus({ value: 95, at: "" })).toBe("normal");
    expect(sugarStatus({ value: 250, at: "" })).toBe("alert");
  });
  it("uses the latest reading of each kind", () => {
    const snap = parseReadings(JSON.stringify([
      { kind: "bp", sys: 150, dia: 95, at: "2026-01-01" },
      { kind: "bp", sys: 118, dia: 76, at: "2026-02-01" },
    ]));
    expect(snap.bp?.sys).toBe(118);
  });
  it("no readings gives no score", () => {
    expect(healthScore({})).toBeNull();
  });
});
