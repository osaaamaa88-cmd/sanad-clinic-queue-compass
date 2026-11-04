import { createFileRoute } from "@tanstack/react-router";
import { generateSpeech, GatewayError } from "@lovable.dev/ai-gateway";

// Natural Arabic voice for Nemo. Public because guests use Nemo; guarded by
// a length cap and a per-IP rate limit. Returns only generated audio.
const hits = new Map<string, number[]>();
const LIMIT = 40; // requests per IP per 10 minutes
const WINDOW = 10 * 60 * 1000;

export const Route = createFileRoute("/api/public/nemo-voice")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "anon";
        const now = Date.now();
        const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
        if (recent.length >= LIMIT) return new Response("rate_limited", { status: 429 });
        recent.push(now);
        hits.set(ip, recent);

        let body: { text?: unknown; calm?: unknown };
        try {
          body = await request.json();
        } catch {
          return new Response("bad_request", { status: 400 });
        }
        const text = typeof body.text === "string" ? body.text.trim().slice(0, 900) : "";
        if (!text) return new Response("bad_request", { status: 400 });
        const style = body.calm
          ? "بصوت أنثوي دافي وهادي جداً، ببطء وطمأنينة، باللهجة المصرية"
          : "بصوت أنثوي دافي وودود وطبيعي، بإيقاع مريح، باللهجة المصرية";

        try {
          const audio = await generateSpeech({
            model: "google/gemini-3.1-flash-tts-preview",
            contents: [{ role: "user", parts: [{ text: `اقرئي النص ده ${style}:\n${text}` }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } },
            },
          });
          return audio.toResponse({ headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          const status = error instanceof GatewayError && error.httpStatus ? error.httpStatus : 502;
          console.error("[nemo-voice] speech failed", error);
          return new Response("speech_failed", { status: status >= 400 ? status : 502 });
        }
      },
    },
  },
});
