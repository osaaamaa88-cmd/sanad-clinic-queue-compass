import assert from "node:assert/strict";
import test from "node:test";
import {
  compareName,
  maskNationalId,
  normalizeDigits,
  parseKycScanResult,
  validateEgyptianNationalId,
} from "../kyc-scan.ts";

test("parses and bounds extracted KYC fields without trusting unsupported values", () => {
  const result = parseKycScanResult({
    found: true,
    docType: "syndicate_card",
    fullName: " د. أحمد محمد ",
    syndicateNo: "١٢٣٤",
    nationalId: "٢٩٠٠١٠١٠١٢٣٤٥٦",
    imageQuality: "looks-authentic",
  });
  assert.equal(result.found, true);
  assert.equal(result.fullName, "د. أحمد محمد");
  assert.equal(result.syndicateNo, "١٢٣٤");
  assert.equal(result.nationalIdMasked, "••••••••••3456");
  assert.equal(result.nationalIdFormatValid, true);
  assert.equal(result.imageQuality, "unknown");
  assert.equal(parseKycScanResult({ fullName: "x".repeat(200) }).fullName.length, 120);
});

test("normalizes Arabic-Indic and Eastern Arabic-Indic digits", () => {
  assert.equal(normalizeDigits("٠١٢٣٤٥٦٧٨٩"), "0123456789");
  assert.equal(normalizeDigits("۰۱۲۳۴۵۶۷۸۹"), "0123456789");
});

test("compares normalized Arabic names without claiming partial matches", () => {
  assert.equal(compareName("د. أَحْمَد محمد", "احمد محمد"), "match");
  assert.equal(compareName("أحمد محمد علي", "أحمد محمد"), "review");
  assert.equal(compareName("", "أحمد محمد"), "review");
});

test("validates only the visible Egyptian national ID format and embedded date", () => {
  assert.equal(validateEgyptianNationalId("٢٩٠٠١٠١٠١٢٣٤٥٦"), true);
  assert.equal(validateEgyptianNationalId("39002329123456"), false);
  assert.equal(validateEgyptianNationalId("29002329123456"), false);
  assert.equal(validateEgyptianNationalId("1234567890123"), false);
  assert.equal(maskNationalId("٢٩٠٠١٠١٠١٢٣٤٥٦"), "••••••••••3456");
});
