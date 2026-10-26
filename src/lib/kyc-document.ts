export const KYC_DOCUMENT_LIMIT = 10 * 1024 * 1024;
export const KYC_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function isKycDocumentType(value: string): value is (typeof KYC_DOCUMENT_TYPES)[number] {
  return (KYC_DOCUMENT_TYPES as readonly string[]).includes(value);
}

export function isKycDocumentWithinLimit(contentType: string, size: number): boolean {
  return (
    isKycDocumentType(contentType) &&
    Number.isSafeInteger(size) &&
    size > 0 &&
    size <= KYC_DOCUMENT_LIMIT
  );
}

export function hasValidKycDocumentSignature(contentType: string, signature: Uint8Array): boolean {
  if (contentType === "application/pdf") {
    return new TextDecoder().decode(signature).startsWith("%PDF-");
  }
  if (contentType === "image/jpeg") {
    return signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  }
  if (contentType === "image/png") {
    return (
      signature[0] === 0x89 &&
      signature[1] === 0x50 &&
      signature[2] === 0x4e &&
      signature[3] === 0x47 &&
      signature[4] === 0x0d &&
      signature[5] === 0x0a &&
      signature[6] === 0x1a &&
      signature[7] === 0x0a
    );
  }
  return (
    contentType === "image/webp" &&
    new TextDecoder().decode(signature.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(signature.slice(8, 12)) === "WEBP"
  );
}
