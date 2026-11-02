import { describe, expect, it } from "vitest";
import { compareName, compareNumber } from "../kyc-match.ts";

describe("doctor card matching", () => {
  it("matches syndicate number written in Arabic digits", () => {
    expect(compareNumber("123456", "رقم القيد: ١٢٣٤٥٦")).toBe("match");
  });
  it("flags a different syndicate number", () => {
    expect(compareNumber("123456", "123457")).toBe("mismatch");
  });
  it("matches name despite title and hamza spelling", () => {
    expect(compareName("أحمد محمد علي", "د. احمد محمد علي حسن")).toBe("match");
  });
  it("flags a different person's card", () => {
    expect(compareName("أحمد محمد علي", "سارة محمود إبراهيم")).toBe("mismatch");
  });
});
