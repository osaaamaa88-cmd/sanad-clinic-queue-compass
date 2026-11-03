import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scrubPath } from "../analytics.ts";

describe("scrubPath", () => {
  it("hides clinic UUIDs and query strings", () => {
    assert.equal(
      scrubPath("/patient/clinic/3f2b1c4d-1234-4abc-9def-0123456789ab?x=1"),
      "/patient/clinic/:id",
    );
  });
  it("hides numeric ids", () => {
    assert.equal(scrubPath("/booking/12345"), "/booking/:id");
  });
});
