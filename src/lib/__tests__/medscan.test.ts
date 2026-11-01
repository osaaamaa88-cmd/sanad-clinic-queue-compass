import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkStatus, isCriticalLab } from "../lab-values.ts";

describe("isCriticalLab", () => {
  it("detects critically low or high potassium and accepts the limits and normal values", () => {
    assert.equal(isCriticalLab("potassium", "2.7", "mmol/L"), true);
    assert.equal(isCriticalLab("potassium", "6.1", "mmol/L"), true);
    assert.equal(isCriticalLab("potassium", "2.8", "mmol/L"), false);
    assert.equal(isCriticalLab("potassium", "6.0", "mmol/L"), false);
    assert.equal(isCriticalLab("potassium", "4.2", "mmol/L"), false);
  });

  it("detects critically low or high sodium and accepts the limits and normal values", () => {
    assert.equal(isCriticalLab("sodium", "124", "mmol/L"), true);
    assert.equal(isCriticalLab("sodium", "156", "mmol/L"), true);
    assert.equal(isCriticalLab("sodium", "125", "mmol/L"), false);
    assert.equal(isCriticalLab("sodium", "155", "mmol/L"), false);
    assert.equal(isCriticalLab("sodium", "140", "mmol/L"), false);
  });

  it("detects critically low or high glucose and handles mmol/L conversion", () => {
    assert.equal(isCriticalLab("glucose", "53", "mg/dL"), true);
    assert.equal(isCriticalLab("glucose", "401", "mg/dL"), true);
    assert.equal(isCriticalLab("glucose", "54", "mg/dL"), false);
    assert.equal(isCriticalLab("glucose", "400", "mg/dL"), false);
    assert.equal(isCriticalLab("glucose", "90", "mg/dL"), false);
    assert.equal(isCriticalLab("glucose", "2", "mmol/L"), true);
    assert.equal(isCriticalLab("glucose", "5", "mmol/L"), false);
  });

  it("detects critically low hemoglobin and handles g/L conversion", () => {
    assert.equal(isCriticalLab("hemoglobin", "6.9", "g/dL"), true);
    assert.equal(isCriticalLab("hemoglobin", "7", "g/dL"), false);
    assert.equal(isCriticalLab("hemoglobin", "60", "g/L"), true);
    assert.equal(isCriticalLab("hemoglobin", "140", "g/L"), false);
  });

  it("detects critically low platelets in both supported unit formats", () => {
    assert.equal(isCriticalLab("platelets", "19", "10^3/µL"), true);
    assert.equal(isCriticalLab("platelets", "20000", "/µL"), false);
    assert.equal(isCriticalLab("platelets", "18000", "/µL"), true);
    assert.equal(isCriticalLab("platelets", "250", "10^3/µL"), false);
  });

  it("returns false when the value cannot be parsed or the lab is not critical", () => {
    assert.equal(isCriticalLab("potassium", "unknown", "mmol/L"), false);
    assert.equal(isCriticalLab("creatinine", "1000", "mg/dL"), false);
  });
});

describe("checkStatus", () => {
  it("recomputes low, high, and normal status from a two-value range", () => {
    assert.equal(checkStatus("2.9", "3-4", "normal"), "low");
    assert.equal(checkStatus("4.1", "3-4", "normal"), "high");
    assert.equal(checkStatus("3.5", "3-4", "high"), "normal");
  });

  it("treats the endpoints of a two-value range as normal", () => {
    assert.equal(checkStatus("3", "3-4", "low"), "normal");
    assert.equal(checkStatus("4", "3-4", "high"), "normal");
  });

  it("handles one-sided upper and lower reference ranges", () => {
    assert.equal(checkStatus("6", "< 5", "normal"), "high");
    assert.equal(checkStatus("5", "< 5", "high"), "normal");
    assert.equal(checkStatus("4", "> 5", "normal"), "low");
    assert.equal(checkStatus("5", "> 5", "low"), "normal");
  });

  it("preserves the supplied status when value or range cannot be interpreted", () => {
    assert.equal(checkStatus("unknown", "3-4", "high"), "high");
    assert.equal(checkStatus("3.5", "unknown", "low"), "low");
  });
});
