import assert from "node:assert/strict";
import test from "node:test";
import {
  KYC_DOCUMENT_LIMIT,
  hasValidKycDocumentSignature,
  isKycDocumentType,
  isKycDocumentWithinLimit,
} from "../kyc-document.ts";

test("KYC document validation accepts supported types and bounded sizes", () => {
  for (const type of ["application/pdf", "image/jpeg", "image/png", "image/webp"]) {
    assert.equal(isKycDocumentType(type), true);
    assert.equal(isKycDocumentWithinLimit(type, 1), true);
    assert.equal(isKycDocumentWithinLimit(type, KYC_DOCUMENT_LIMIT), true);
  }

  assert.equal(isKycDocumentType("image/svg+xml"), false);
  assert.equal(isKycDocumentWithinLimit("application/pdf", 0), false);
  assert.equal(isKycDocumentWithinLimit("application/pdf", KYC_DOCUMENT_LIMIT + 1), false);
  assert.equal(isKycDocumentWithinLimit("text/html", 1), false);
});

test("KYC document validation checks file signatures against declared MIME types", () => {
  assert.equal(
    hasValidKycDocumentSignature("application/pdf", new TextEncoder().encode("%PDF-1.7")),
    true,
  );
  assert.equal(
    hasValidKycDocumentSignature("image/jpeg", new Uint8Array([0xff, 0xd8, 0xff, 0x00])),
    true,
  );
  assert.equal(
    hasValidKycDocumentSignature(
      "image/png",
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
    true,
  );
  assert.equal(
    hasValidKycDocumentSignature(
      "image/webp",
      new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]),
    ),
    true,
  );
  assert.equal(
    hasValidKycDocumentSignature("image/jpeg", new TextEncoder().encode("<html>")),
    false,
  );
  assert.equal(
    hasValidKycDocumentSignature("image/svg+xml", new TextEncoder().encode("<svg/>")),
    false,
  );
});
