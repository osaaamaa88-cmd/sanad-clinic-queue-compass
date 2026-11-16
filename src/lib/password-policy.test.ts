import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkPassword } from "./password-policy.ts";

describe("password policy", () => {
  it("rejects under 10 chars", () => assert.equal(checkPassword("Ab1!xyz").ok, false));
  it("rejects common passwords", () => assert.equal(checkPassword("Password12345!").ok, false));
  it("rejects passwords containing the email name", () =>
    assert.equal(checkPassword("Osama#2026xy", ["osama@mail.com"]).ok, false));
  it("requires 3 character types", () => assert.equal(checkPassword("abcdefghijk1").ok, false));
  it("accepts a strong password", () => assert.equal(checkPassword("Nile#River2026").ok, true));
});
