/** Strips personal data (phones, emails, quoted user text, tokens) from log/crash text. */
export function redact(input: unknown, max = 400): string {
  return (
    String(input ?? "")
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
      .replace(/(?:\+?\d[\d\s-]{6,}\d)/g, "[phone]")
      .replace(/(?:eyJ|sb_)[\w.-]{10,}/g, "[token]")
      .replace(/(["'«“])[^"'»”]{2,}(["'»”])/g, "$1[text]$2")
      .replace(/[\u0600-\u06FF][\u0600-\u06FF\s]{20,}/g, "[arabic-text]")
      // eslint-disable-next-line no-control-regex -- control characters are exactly what we strip
      .replace(/[\u0000-\u001f]/g, " ")
      .slice(0, max)
  );
}
