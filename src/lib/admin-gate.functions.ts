import { createServerFn } from "@tanstack/react-start";

export const checkAdminUnlocked = createServerFn({ method: "GET" }).handler(async () => {
  const { isAdminRequest } = await import("./admin-auth.server");
  return { unlocked: await isAdminRequest() };
});

export const unlockAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => {
    if (!data || typeof data.password !== "string" || data.password.length > 200) {
      throw new Error("Invalid input");
    }
    return { password: data.password };
  })
  .handler(async ({ data }) => {
    const { assertRateLimit, clientIp } = await import("./rate-limit.server");
    await assertRateLimit(`admin-unlock:${await clientIp()}`, 5, 15 * 60, "RATE_LIMITED: محاولات كتير، استنى ربع ساعة.");
    const { createHash, timingSafeEqual } = await import("node:crypto");
    const { useSession } = await import("@tanstack/react-start/server");
    const { sessionConfig, issueAdminToken } = await import("./admin-auth.server");
    const expected = process.env.SITE_PASSWORD;
    if (!expected) throw new Error("SITE_PASSWORD is not set");
    const a = createHash("sha256").update(data.password, "utf8").digest();
    const b = createHash("sha256").update(expected, "utf8").digest();
    if (!timingSafeEqual(a, b)) return { ok: false as const, token: "" };
    try {
      const session = await useSession<{ unlocked?: boolean }>(sessionConfig());
      await session.update({ unlocked: true });
    } catch { /* cookie optional */ }
    return { ok: true as const, token: issueAdminToken() };
  });

export const lockAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { useSession } = await import("@tanstack/react-start/server");
  const { sessionConfig } = await import("./admin-auth.server");
  try {
    const session = await useSession(sessionConfig());
    await session.clear();
  } catch { /* ignore */ }
  return { ok: true as const };
});
