import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { patientOAuthCallback, safePatientReturnPath } from "../patient-auth-return";

describe("Google patient sign-in return", () => {
  it("returns clinic patients to the clinic that initiated sign-in", () => {
    const path = "/patient/clinic/demo-clinic-minya?day=2#booking";
    const callback = new URL(patientOAuthCallback("https://sanad.example", path));
    assert.equal(callback.origin, "https://sanad.example");
    assert.equal(callback.pathname, "/patient/login");
    assert.equal(safePatientReturnPath(callback.searchParams.get("returnTo")), path);
  });
  it("preserves community and home sign-in destinations", () => {
    for (const path of ["/community", "/"]) {
      assert.equal(
        new URL(patientOAuthCallback("https://sanad.example", path)).searchParams.get("returnTo"),
        path,
      );
    }
  });
  it("rejects external destinations and login redirect loops", () => {
    for (const path of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/patient/login",
      "/patient/login?returnTo=/community",
      "/\nevil.example",
      undefined,
    ]) {
      assert.equal(safePatientReturnPath(path), undefined);
    }
  });
});
