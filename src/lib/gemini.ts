// استدعاء واحد لنماذج Gemini عبر REST — يوحّد النسخ المكررة في
// nutrition.functions.ts (مرتان) و triage.functions.ts.
// كل مستدعٍ يبقي معالجة الخطأ الخاصة به (رمي استثناء / إرجاع خطأ / إرجاع null).

export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

export type GeminiTextResult = { ok: true; text: string } | { ok: false; status: number };

export async function fetchGeminiText({
  key,
  model,
  parts,
  signal,
}: {
  key: string;
  model: string;
  parts: GeminiPart[];
  signal?: AbortSignal;
}): Promise<GeminiTextResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: "low" },
        },
      }),
      ...(signal ? { signal } : {}),
    },
  );
  const json = (await res.json().catch(() => ({}))) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  if (!res.ok) return { ok: false, status: res.status };
  const text = (json?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  return { ok: true, text };
}

/** استخراج JSON من رد النموذج (يزيل أسوار ```json إن وُجدت). */
export function parseGeminiJson<T>(raw: string): T {
  return JSON.parse(raw.replace(/```json|```/g, "").trim()) as T;
}
