import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeEgyptianMobile, bloodPressureError, sugarError, parseReading } from "../input-validation";

test("accepts 010/011/012/015 mobiles with spaces, +20 and Arabic digits", () => {
  assert.equal(normalizeEgyptianMobile("010 1234 5678"), "01012345678");
  assert.equal(normalizeEgyptianMobile("+20 115 123 4567"), "01151234567");
  assert.equal(normalizeEgyptianMobile("٠١٢٣٤٥٦٧٨٩٠"), "01234567890");
  assert.equal(normalizeEgyptianMobile("01512345678"), "01512345678");
});

test("rejects 013/014 prefixes and wrong lengths", () => {
  assert.equal(normalizeEgyptianMobile("01312345678"), null);
  assert.equal(normalizeEgyptianMobile("0101234567"), null);
});

test("blood pressure must be within 60-260 / 30-160 and systolic above diastolic", () => {
  assert.equal(bloodPressureError(120, 80), null);
  assert.notEqual(bloodPressureError(300, 80), null);
  assert.notEqual(bloodPressureError(120, 10), null);
  assert.notEqual(bloodPressureError(80, 90), null);
});

test("sugar must be within 20-700 and Arabic digits parse", () => {
  assert.equal(sugarError(parseReading("١٢٠")), null);
  assert.notEqual(sugarError(5), null);
  assert.notEqual(sugarError(900), null);
});
