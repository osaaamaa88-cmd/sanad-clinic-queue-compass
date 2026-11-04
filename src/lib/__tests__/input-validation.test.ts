import { test, expect } from "bun:test";
import { normalizeEgyptianMobile, bloodPressureError, sugarError, parseReading } from "../input-validation";

test("accepts 010/011/012/015 mobiles with spaces, +20 and Arabic digits", () => {
  expect(normalizeEgyptianMobile("010 1234 5678")).toBe("01012345678");
  expect(normalizeEgyptianMobile("+20 115 123 4567")).toBe("01151234567");
  expect(normalizeEgyptianMobile("٠١٢٣٤٥٦٧٨٩٠")).toBe("01234567890");
  expect(normalizeEgyptianMobile("01512345678")).toBe("01512345678");
});

test("rejects 013/014 prefixes and wrong lengths", () => {
  expect(normalizeEgyptianMobile("01312345678")).toBeNull();
  expect(normalizeEgyptianMobile("0101234567")).toBeNull();
});

test("blood pressure must be within 60-260 / 30-160 and systolic above diastolic", () => {
  expect(bloodPressureError(120, 80)).toBeNull();
  expect(bloodPressureError(300, 80)).not.toBeNull();
  expect(bloodPressureError(120, 10)).not.toBeNull();
  expect(bloodPressureError(80, 90)).not.toBeNull();
});

test("sugar must be within 20-700 and Arabic digits parse", () => {
  expect(sugarError(parseReading("١٢٠"))).toBeNull();
  expect(sugarError(5)).not.toBeNull();
  expect(sugarError(900)).not.toBeNull();
});
