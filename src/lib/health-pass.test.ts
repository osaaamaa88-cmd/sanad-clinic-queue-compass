import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decodeHealthPass, encodeHealthPass, PASS_TTL_MS } from "./health-pass.ts";

describe("health pass", () => {
  it("round-trips Arabic data", () => {
    const code = encodeHealthPass({
      name: "أسامة محمد",
      bloodType: "O+",
      allergies: "بنسلين",
      issuedAt: 1000,
    });
    const r = decodeHealthPass(code, 2000);
    assert.equal(r.ok && r.pass.name, "أسامة محمد");
    assert.equal(r.ok && r.pass.allergies, "بنسلين");
    assert.equal(r.ok && r.expired, false);
  });
  it("marks passes older than 30 days as expired", () => {
    const code = encodeHealthPass({ name: "x", issuedAt: 0 });
    const r = decodeHealthPass(code, PASS_TTL_MS + 1);
    assert.equal(r.ok && r.expired, true);
  });
  it("rejects non-SANAD codes", () => {
    assert.equal(decodeHealthPass("https://example.com").ok, false);
  });
});
