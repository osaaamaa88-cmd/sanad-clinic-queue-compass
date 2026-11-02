import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, describe, it } from "node:test";
import { issueAdminToken, verifyAdminToken } from "../admin-auth.server.ts";

const originalKey = process.env.ADMIN_TOKEN_KEY;
process.env.ADMIN_TOKEN_KEY = "sanad-admin-auth-test-key";
after(() => {
  if (originalKey === undefined) delete process.env.ADMIN_TOKEN_KEY;
  else process.env.ADMIN_TOKEN_KEY = originalKey;
});

describe("admin access tokens", () => {
  it("issues a valid versioned token that expires within 30 minutes", () => {
    const token = issueAdminToken();
    const [payload] = token.split(".");
    const claims = JSON.parse(Buffer.from(payload!, "base64url").toString("utf8"));

    assert.equal(verifyAdminToken(token), true);
    assert.equal(claims.version, 2);
    assert.ok(claims.exp > Date.now());
    assert.ok(claims.exp <= Date.now() + 30 * 60 * 1000);
  });

  it("rejects previously issued persistent tokens", () => {
    const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 60 * 60 * 1000 })).toString(
      "base64url",
    );
    const signature = createHmac("sha256", process.env.ADMIN_TOKEN_KEY!)
      .update(payload)
      .digest("base64url");

    assert.equal(verifyAdminToken(`${payload}.${signature}`), false);
  });

  it("rejects malformed, expired, and tampered tokens", () => {
    const expiredPayload = Buffer.from(
      JSON.stringify({ exp: Date.now() - 1, version: 2 }),
    ).toString("base64url");
    const signature = createHmac("sha256", process.env.ADMIN_TOKEN_KEY!)
      .update(expiredPayload)
      .digest("base64url");
    const valid = issueAdminToken();

    assert.equal(verifyAdminToken(`${expiredPayload}.${signature}`), false);
    assert.equal(verifyAdminToken(`${valid}.extra`), false);
    assert.equal(verifyAdminToken(`${valid.slice(0, -1)}x`), false);
  });
});
