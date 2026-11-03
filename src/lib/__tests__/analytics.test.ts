import { describe, expect, it } from "vitest";
import { scrubPath } from "../analytics";

describe("scrubPath", () => {
  it("hides clinic UUIDs and query strings", () => {
    expect(scrubPath("/patient/clinic/3f2b1c4d-1234-4abc-9def-0123456789ab?x=1")).toBe("/patient/clinic/:id");
  });
  it("hides numeric ids", () => {
    expect(scrubPath("/booking/12345")).toBe("/booking/:id");
  });
});
