/** Browser-safe rules shared by Nemo's microphone lifecycle and tests. */
export function isNemoSessionComplete(text: string): boolean {
  const normalized = text.toLowerCase().replace(/[\u064B-\u065F\u0670]/g, "").replace(/[أإآ]/g, "ا").replace(/[.,!؟?،]/g, " ").replace(/\s+/g, " ").trim();
  return normalized === "انا راض عن خدمتك الصحية" || normalized === "i am satisfied with my care";
}

export function shouldResumeNemo(state: { enabled: boolean; listening: boolean; speaking: boolean; loading: boolean; complete: boolean }): boolean {
  return state.enabled && !state.listening && !state.speaking && !state.loading && !state.complete;
}

export function finalNemoTranscript(results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>): string {
  return Array.from(results).filter((result) => result.isFinal).map((result) => result[0]?.transcript ?? "").join(" ").trim();
}