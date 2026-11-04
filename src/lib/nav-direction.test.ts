import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import { navDirection } from "./nav-direction.ts";

describe("navDirection", () => {
  test("switching between main tabs is a tab transition", () => {
    assert.equal(navDirection("/patient", "/community", false), "tab");
  });
  test("opening a deeper page is push", () => {
    assert.equal(navDirection("/patient/search", "/patient/clinic/abc", false), "push");
  });
  test("going back is pop", () => {
    assert.equal(navDirection("/patient/clinic/abc", "/patient/search", true), "pop");
  });
  test("navigating to a shallower page is pop", () => {
    assert.equal(navDirection("/patient/clinic/abc", "/patient/meds", false), "pop");
  });
});
