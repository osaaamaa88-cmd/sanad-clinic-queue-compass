import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Public: create a doctor account via normal sign-up (email confirmation) + its unverified clinic. */
export const svrRegisterDoctor = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      email: string;
      password: string;
      doctor: string;
      specialtyId: string;
      phone: string;
      redirectTo?: string;
    }) => {
      const email = String(data?.email ?? "")
        .trim()
        .toLowerCase();
      const password = String(data?.password ?? "");
      const doctor = String(data?.doctor ?? "")
        .trim()
        .slice(0, 120);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200)
        throw new Error("INVALID_EMAIL");
      if (password.length < 8 || password.length > 128) throw new Error("WEAK_PASSWORD");
      if (!doctor) throw new Error("INVALID_NAME");
      const redirectTo =
        typeof data?.redirectTo === "string" && /^https:\/\/[^\s]+$/.test(data.redirectTo)
          ? data.redirectTo.slice(0, 300)
          : undefined;
      return {
        email,
        password,
        doctor,
        specialtyId: String(data?.specialtyId ?? "internal").slice(0, 60),
        phone: String(data?.phone ?? "")
          .trim()
          .slice(0, 40),
        redirectTo,
      };
    },
  )
  .handler(async ({ data }) => {
    const { assertRateLimit, clientIp } = await import("@/lib/rate-limit.server");
    await assertRateLimit(`signup:${await clientIp()}`, 5, 3600, "RATE_LIMITED");
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY!;
    const pub = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
            h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: res, error } = await pub.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.doctor, role: "doctor" },
        emailRedirectTo: data.redirectTo,
      },
    });
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (
        msg.includes("pwned") ||
        msg.includes("leaked") ||
        msg.includes("weak") ||
        msg.includes("password")
      )
        throw new Error("WEAK_PASSWORD");
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists"))
        return { ok: true as const };
      if (msg.includes("rate")) throw new Error("RATE_LIMITED");
      throw new Error("SIGNUP_FAILED");
    }
    const user = res?.user;
    // Existing emails come back obfuscated (no identities): respond identically, create nothing.
    if (!user || !user.identities?.length) return { ok: true as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("clinics")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!existing) {
      await supabaseAdmin.from("clinics").insert({
        doctor: data.doctor,
        specialty_id: data.specialtyId,
        phone: data.phone,
        owner_id: user.id,
        is_verified: false,
      });
    }
    return { ok: true as const };
  });

/** The clinic the signed-in user manages (as owner or as staff), plus their role. */
export const svrMyClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: owned } = await supabaseAdmin
      .from("clinics")
      .select("*")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (owned) return { row: owned, role: "doctor" as const };

    const { data: staff } = await supabaseAdmin
      .from("clinic_staff")
      .select("clinic_id, role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!staff) return { row: null, role: null };

    const { data: row } = await supabaseAdmin
      .from("clinics")
      .select("*")
      .eq("id", staff.clinic_id)
      .maybeSingle();
    return { row: row ?? null, role: (staff.role as "doctor" | "secretary") ?? "secretary" };
  });

/** Doctor creates a secretary login for their own clinic. */
export const svrAddSecretary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; password: string; fullName: string }) => {
    const email = String(data?.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(data?.password ?? "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("INVALID_EMAIL");
    if (password.length < 6) throw new Error("WEAK_PASSWORD");
    return {
      email,
      password,
      fullName: String(data?.fullName ?? "")
        .trim()
        .slice(0, 120),
    };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!clinic) throw new Error("NO_CLINIC");

    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, role: "secretary" },
    });
    if (authError || !created?.user) {
      const msg = (authError?.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        throw new Error("EMAIL_TAKEN");
      }
      if (
        msg.includes("pwned") ||
        msg.includes("leaked") ||
        msg.includes("weak") ||
        msg.includes("password")
      ) {
        throw new Error("WEAK_PASSWORD");
      }
      throw new Error("SIGNUP_FAILED");
    }
    const { error } = await supabaseAdmin.from("clinic_staff").insert({
      clinic_id: clinic.id,
      user_id: created.user.id,
      full_name: data.fullName,
      role: "secretary",
    });
    if (error) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error("SIGNUP_FAILED");
    }
    return { ok: true as const };
  });

/** Secretaries of the signed-in doctor's clinic. */
export const svrListSecretaries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!clinic) return { rows: [] };
    const { data: rows } = await supabaseAdmin
      .from("clinic_staff")
      .select("id, full_name, role, created_at")
      .eq("clinic_id", clinic.id)
      .order("created_at", { ascending: true });
    return { rows: rows ?? [] };
  });

/** Signed-in user without any clinic: create their (unverified) clinic row as owner. */
export const svrCreateMyClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { doctor: string; specialtyId: string; phone: string }) => ({
    doctor: String(data?.doctor ?? "")
      .trim()
      .slice(0, 120),
    specialtyId: String(data?.specialtyId ?? "")
      .trim()
      .slice(0, 60),
    phone: String(data?.phone ?? "")
      .replace(/[^\d+]/g, "")
      .slice(0, 20),
  }))
  .handler(async ({ data, context }) => {
    if (!data.doctor || !data.phone) throw new Error("INVALID_NAME");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;
    const { data: staff } = await supabaseAdmin
      .from("clinic_staff")
      .select("id")
      .eq("user_id", uid)
      .maybeSingle();
    if (staff) throw new Error("ALREADY_STAFF");
    const { data: existing } = await supabaseAdmin
      .from("clinics")
      .select("id")
      .eq("owner_id", uid)
      .maybeSingle();
    if (existing) return { id: existing.id as string };
    const { data: clinic, error } = await supabaseAdmin
      .from("clinics")
      .insert({
        doctor: data.doctor,
        specialty_id: data.specialtyId,
        phone: data.phone,
        owner_id: uid,
        is_verified: false,
      })
      .select("id")
      .single();
    if (error || !clinic) throw new Error("SIGNUP_FAILED");
    return { id: clinic.id as string };
  });
