import { describe, expect, test } from "bun:test";
import { navDirection } from "./nav-direction";

describe("navDirection", () => {
  test("switching between main tabs is a tab transition", () => {
    expect(navDirection("/patient", "/community", false)).toBe("tab");
  });
  test("opening a deeper page is push", () => {
    expect(navDirection("/patient/search", "/patient/clinic/abc", false)).toBe("push");
  });
  test("going back is pop", () => {
    expect(navDirection("/patient/clinic/abc", "/patient/search", true)).toBe("pop");
  });
  test("navigating to a shallower page is pop", () => {
    expect(navDirection("/patient/clinic/abc", "/patient/meds", false)).toBe("pop");
  });
});
