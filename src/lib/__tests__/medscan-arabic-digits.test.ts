import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkStatus, isCriticalLab } from "../lab-values.ts";

describe("Arabic-number lab results", () => {
  it("parses Arabic-Indic and Eastern Arabic-Indic critical values", () => {
    assert.equal(isCriticalLab("بوتاسيوم", "٢٫٧", "mmol/L"), true);
    assert.equal(isCriticalLab("بوتاسيوم", "۶٫۱", "mmol/L"), true);
    assert.equal(isCriticalLab("صوديوم", "۱۲۴", "mmol/L"), true);
    assert.equal(isCriticalLab("هيموجلوبين", "٦٫٩", "g/dL"), true);
    assert.equal(isCriticalLab("صفائح", "١٩", "10^3/µL"), true);
  });

  it("keeps values at critical thresholds non-critical", () => {
    assert.equal(isCriticalLab("بوتاسيوم", "٢٫٨", "mmol/L"), false);
    assert.equal(isCriticalLab("صوديوم", "١٢٥", "mmol/L"), false);
    assert.equal(isCriticalLab("هيموجلوبين", "٧", "g/dL"), false);
  });

  it("compares Arabic values against Arabic reference ranges", () => {
    assert.equal(checkStatus("٢٫٩", "٣–٤", "normal"), "low");
    assert.equal(checkStatus("٤٫١", "٣–٤", "normal"), "high");
    assert.equal(checkStatus("٣٫٥", "٣–٤", "high"), "normal");
  });

  it("parses grouped Arabic thousands and Arabic minus signs", () => {
    assert.equal(isCriticalLab("سكر", "−١٬٢٣٤", "mg/dL"), true);
    assert.equal(checkStatus("١٬٢٣٤٫٥", "١٬٠٠٠–١٬٥٠٠", "high"), "normal");
  });
});
