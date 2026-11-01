import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getLocalNemoReply,
  hasSelfHarmIntent,
  mergeTriageUrgency,
  replyMentionsEmergency,
  runLocalTriage,
} from "../triage-local.ts";

describe("runLocalTriage emergency recognition", () => {
  for (const text of [
    "عندي ضيق في التنفس",
    "مش عارف أتنفس",
    "مش قادر اتنفس",
    "ألم في صدري",
    "صدري بيوجعني",
    "قلبي واجعني",
    "الألم ممتد للذراع",
    "وجع ممتد للفك",
    "الدم مش بيقف",
    "الرضيع مش بيرضع",
    "البيبي مش عارف يتنفس",
    "الطفل مش بيفوق",
    "هأذي نفسي",
    "بفكر في الانتحار",
    "أفكر في إيذاء نفسي",
    "مش قادر أبطل أفكر في الانتحار",
  ]) {
    it(`marks "${text}" as emergency`, () => {
      assert.equal(runLocalTriage(text).urgency, "emergency");
    });
  }

  it("uses a fixed local response for self-harm intent", () => {
    const text = "أنا بفكر انتحر";
    const reply = getLocalNemoReply(text, runLocalTriage(text));
    assert.match(reply, /مش لوحدك/);
    assert.match(reply, /شخصاً تثق به/);
    assert.match(reply, /123/);
  });

  it("matches specialty words without matching substrings", () => {
    assert.deepEqual(runLocalTriage("عندي سنة").specialtyIds, ["family-medicine"]);
    assert.deepEqual(runLocalTriage("فكرة جديدة").specialtyIds, ["family-medicine"]);
    assert.deepEqual(runLocalTriage("عينة الدم سليمة").specialtyIds, ["family-medicine"]);
    assert.deepEqual(runLocalTriage("هنتظر سنة").specialtyIds, ["family-medicine"]);
    assert.ok(runLocalTriage("فكي بيوجعني").specialtyIds.includes("dental"));
  });

  it("does not lower emergency urgency when merging triage", () => {
    const ai = runLocalTriage("صداع");
    assert.equal(mergeTriageUrgency(ai, "مش عارف أتنفس").urgency, "emergency");
  });

  it("recognizes emergency references written with Arabic digits", () => {
    assert.equal(replyMentionsEmergency("اتصل بالإسعاف ١٢٣"), true);
    assert.equal(replyMentionsEmergency("اتصل بالطوارئ ۱۲۳"), true);
  });

  it("does not treat explicit denial of self-harm as intent", () => {
    assert.equal(hasSelfHarmIntent("مش عايز أذي نفسي"), false);
    assert.equal(hasSelfHarmIntent("مش بفكر في الانتحار"), false);
    assert.notEqual(runLocalTriage("مش عايز انتحر").urgency, "emergency");
  });
});
