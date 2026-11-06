import { describe, expect, it } from "vitest";
import { decodeHealthPass, encodeHealthPass, PASS_TTL_MS } from "./health-pass";

describe("health pass", () => {
  it("round-trips Arabic data", () => {
    const code = encodeHealthPass({ name: "أسامة محمد", bloodType: "O+", allergies: "بنسلين", issuedAt: 1000 });
    const r = decodeHealthPass(code, 2000);
    expect(r.ok && r.pass.name).toBe("أسامة محمد");
    expect(r.ok && r.pass.allergies).toBe("بنسلين");
    expect(r.ok && r.expired).toBe(false);
  });
  it("marks passes older than 30 days as expired", () => {
    const code = encodeHealthPass({ name: "x", issuedAt: 0 });
    const r = decodeHealthPass(code, PASS_TTL_MS + 1);
    expect(r.ok && r.expired).toBe(true);
  });
  it("rejects non-SANAD codes", () => {
    expect(decodeHealthPass("https://example.com").ok).toBe(false);
  });
});
