import assert from "node:assert/strict";
import { it } from "node:test";
import { isVoiceModeOn, setVoiceMode, VOICE_KEY } from "../voice.ts";

it("voice settings persist enable and disable and notify the mounted assistant", () => {
  const values = new Map<string, string>([["voice_disclaimer_seen", "true"]]);
  const events: string[] = [];
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      dispatchEvent: (event: Event) => {
        events.push(event.type);
        return true;
      },
    },
  });
  try {
    assert.equal(isVoiceModeOn(), false);
    setVoiceMode(true);
    assert.equal(values.get(VOICE_KEY), "true");
    assert.equal(isVoiceModeOn(), true);
    setVoiceMode(false);
    assert.equal(values.get(VOICE_KEY), "false");
    assert.equal(isVoiceModeOn(), false);
    assert.deepEqual(events, ["sanad:voice-mode", "sanad:voice-mode"]);
  } finally {
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
