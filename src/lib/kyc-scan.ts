export type KycDocumentType =
  "syndicate_card" | "practice_license" | "national_id" | "other" | "unknown";

export type KycImageQuality = "clear" | "blurry" | "cropped" | "glare" | "unreadable" | "unknown";

export type KycScanResult = {
  found: boolean;
  docType: KycDocumentType;
  fullName: string;
  syndicateNo: string;
  licenseNo: string;
  nationalIdMasked: string;
  nationalIdFormatValid: boolean | null;
  grade: string;
  specialty: string;
  branch: string;
  imageQuality: KycImageQuality;
};

const DOC_TYPES: readonly KycDocumentType[] = [
  "syndicate_card",
  "practice_license",
  "national_id",
  "other",
  "unknown",
];
const IMAGE_QUALITIES: readonly KycImageQuality[] = [
  "clear",
  "blurry",
  "cropped",
  "glare",
  "unreadable",
  "unknown",
];

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const text = (value: unknown, maxLength: number): string =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

export function parseKycScanResult(value: unknown): KycScanResult {
  const result = asRecord(value);
  const docType = DOC_TYPES.find((type) => type === result.docType) ?? "unknown";
  const imageQuality =
    IMAGE_QUALITIES.find((quality) => quality === result.imageQuality) ?? "unknown";
  const nationalId = normalizeDigits(text(result.nationalId, 30)).replace(/\D/g, "").slice(0, 14);
  return {
    found: result.found === true,
    docType,
    fullName: text(result.fullName, 120),
    syndicateNo: text(result.syndicateNo, 30),
    licenseNo: text(result.licenseNo, 30),
    nationalIdMasked: nationalId.length === 14 ? maskNationalId(nationalId) : "",
    nationalIdFormatValid: nationalId.length === 14 ? validateEgyptianNationalId(nationalId) : null,
    grade: text(result.grade, 80),
    specialty: text(result.specialty, 100),
    branch: text(result.branch, 80),
    imageQuality,
  };
}

export function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

export function compareName(doctorName: string, documentName: string): "match" | "review" {
  const normalize = (value: string) =>
    value
      .normalize("NFKC")
      .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
      .replace(/^(?:دكتور|دكتورة|د\.?)\s*/i, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/[ؤ]/g, "و")
      .replace(/[ئىي]/g, "ي")
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "");
  const left = normalize(doctorName);
  const right = normalize(documentName);
  return left && right && left === right ? "match" : "review";
}

export function validateEgyptianNationalId(value: string): boolean {
  const digits = normalizeDigits(value).replace(/\D/g, "");
  if (digits.length !== 14 || (digits[0] !== "2" && digits[0] !== "3")) return false;

  const century = digits[0] === "2" ? 1900 : 2000;
  const year = century + Number(digits.slice(1, 3));
  const month = Number(digits.slice(3, 5));
  const day = Number(digits.slice(5, 7));
  const date = new Date(Date.UTC(year, month - 1, day));
  const isValidDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isValidDate && date.getTime() <= Date.now();
}

export function maskNationalId(value: string): string {
  const digits = normalizeDigits(value).replace(/\D/g, "");
  return digits.length >= 4 ? `••••••••••${digits.slice(-4)}` : "غير متاح";
}
