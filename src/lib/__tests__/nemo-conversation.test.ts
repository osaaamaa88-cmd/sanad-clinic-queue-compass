import assert from "node:assert/strict";
import { it } from "node:test";
import { finalNemoTranscript, isNemoSessionComplete, shouldResumeNemo } from "../nemo-conversation";

it("Nemo resumes after his spoken reply without another microphone tap", () => {
  const state = {
    enabled: true,
    listening: false,
    speaking: false,
    loading: false,
    complete: false,
  };
  assert.equal(shouldResumeNemo(state), true);
  assert.equal(shouldResumeNemo({ ...state, speaking: true }), false);
  assert.equal(shouldResumeNemo({ ...state, loading: true }), false);
  assert.equal(shouldResumeNemo({ ...state, listening: true }), false);
});
it("manual microphone stop and session completion prevent automatic restart", () => {
  const state = {
    enabled: true,
    listening: false,
    speaking: false,
    loading: false,
    complete: false,
  };
  assert.equal(shouldResumeNemo({ ...state, enabled: false }), false);
  assert.equal(shouldResumeNemo({ ...state, complete: true }), false);
});
it("the spoken satisfaction phrase completes the session, ordinary thanks does not", () => {
  assert.equal(isNemoSessionComplete("أنا راضٍ عن خدمتك الصحية"), true);
  assert.equal(isNemoSessionComplete("I am satisfied with my care"), true);
  assert.equal(isNemoSessionComplete("شكراً يا نيمو"), false);
  assert.equal(isNemoSessionComplete("أنا مش راض عن خدمتك الصحية"), false);
});
it("recognition reads cumulative final results once and ignores interim text", () => {
  const final = Object.assign([{ transcript: "عندي صداع" }], { isFinal: true });
  const interim = Object.assign([{ transcript: "من امبارح" }], { isFinal: false });
  assert.equal(finalNemoTranscript([final, interim]), "عندي صداع");
  assert.equal(finalNemoTranscript([final, interim]), "عندي صداع");
});
