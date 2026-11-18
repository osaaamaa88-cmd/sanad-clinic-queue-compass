/* Staff membership: the signed-in doctor/secretary and their clinic. */

import { supabase } from "@/integrations/supabase/client";
import { svrMyClinic, svrRegisterDoctor } from "@/lib/staff.functions";
import { rowToClinic, type Clinic } from "./clinics.ts";

function isBrowser() {
  return typeof window !== "undefined";
}

/** Identity now comes from the real signed-in session, not the device. */
async function getCurrentSession() {
  if (!isBrowser()) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export type ClinicMembership = {
  clinic: Clinic | undefined;
  role: "doctor" | "secretary" | null;
  medicalLicense?: string;
  syndicateNo?: string;
  licenseDocPath?: string;
  verificationStatus?: string;
};

/** The clinic of the signed-in doctor/secretary (server-verified). */
export async function getMyClinicMembership(): Promise<ClinicMembership> {
  const session = await getCurrentSession();
  if (!session) return { clinic: undefined, role: null };
  try {
    const res = await svrMyClinic();
    return {
      clinic: res.row ? rowToClinic(res.row) : undefined,
      role: (res.role as "doctor" | "secretary" | null) ?? null,
      medicalLicense: res.medicalLicense,
      syndicateNo: res.syndicateNo,
      licenseDocPath: res.licenseDocPath,
      verificationStatus: res.verificationStatus,
    };
  } catch {
    return { clinic: undefined, role: null };
  }
}

/** Creates the doctor login + the unverified clinic, then signs the doctor in. */
export async function registerDoctorAccount(input: {
  email: string;
  password: string;
  doctor: string;
  specialtyId: string;
  phone: string;
  medicalLicense: string;
  syndicateNo: string;
}): Promise<{ ok: true } | { ok: false; code: string }> {
  try {
    await svrRegisterDoctor({
      data: { ...input, redirectTo: `${window.location.origin}/doctor/login` },
    });
  } catch (e) {
    return { ok: false, code: (e as Error)?.message || "SIGNUP_FAILED" };
  }
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  // Email must be confirmed first (or the email already had an account) — same neutral message.
  if (error) return { ok: false, code: "CHECK_EMAIL" };
  return { ok: true };
}

export async function signOutStaff() {
  const { clearAllLocalUserData } = await import("@/lib/user-profile-cache");
  clearAllLocalUserData();
  await supabase.auth.signOut();
}
