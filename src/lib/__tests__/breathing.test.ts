import { test } from "node:test";
import assert from "node:assert/strict";
import { breathPhaseAt, BREATH_CYCLE_SECONDS } from "../breathing.ts";

test("4-7-8 cycle lasts 19 seconds", () => assert.equal(BREATH_CYCLE_SECONDS, 19));
test("starts with 4s inhale", () => {
  assert.equal(breathPhaseAt(0).phase.key, "inhale");
  assert.equal(breathPhaseAt(0).remaining, 4);
});
test("hold from 4s, exhale from 11s, new cycle at 19s", () => {
  assert.equal(breathPhaseAt(4).phase.key, "hold");
  assert.equal(breathPhaseAt(11).phase.key, "exhale");
  assert.equal(breathPhaseAt(19).phase.key, "inhale");
  assert.equal(breathPhaseAt(19).cycle, 1);
});
