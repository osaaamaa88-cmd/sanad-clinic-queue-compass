import { describe, expect, it } from "vitest";
import { checkPassword } from "./password-policy";

describe("password policy", () => {
  it("rejects under 10 chars", () => expect(checkPassword("Ab1!xyz").ok).toBe(false));
  it("rejects common passwords", () => expect(checkPassword("Password12345!").ok).toBe(false));
  it("rejects passwords containing the email name", () =>
    expect(checkPassword("Osama#2026xy", ["osama@mail.com"]).ok).toBe(false));
  it("requires 3 character types", () => expect(checkPassword("abcdefghijk1").ok).toBe(false));
  it("accepts a strong password", () => expect(checkPassword("Nile#River2026").ok).toBe(true));
});
