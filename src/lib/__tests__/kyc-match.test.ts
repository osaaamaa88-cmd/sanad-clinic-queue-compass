import assert from "node:assert/strict";
import test from "node:test";
import { compareName, compareNumber } from "../kyc-match.ts";

test("matches syndicate number written in Arabic digits", () => {
  assert.equal(compareNumber("123456", "رقم القيد: ١٢٣٤٥٦"), "match");
});
test("flags a different syndicate number", () => {
  assert.equal(compareNumber("123456", "123457"), "mismatch");
});
test("matches name despite title and hamza spelling", () => {
  assert.equal(compareName("أحمد محمد علي", "د. احمد محمد علي حسن"), "match");
});
test("flags a different person's card", () => {
  assert.equal(compareName("أحمد محمد علي", "سارة محمود إبراهيم"), "mismatch");
});
