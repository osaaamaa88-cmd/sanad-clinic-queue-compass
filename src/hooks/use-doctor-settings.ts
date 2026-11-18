import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { authErrorMessage } from "@/lib/auth-error-message";
import { supabase } from "@/integrations/supabase/client";
import { svrAddSecretary, svrCreateMyClinic, svrListSecretaries } from "@/lib/staff.functions";
import { resetDoctorModeCache } from "@/lib/use-doctor-mode";
import { compressImage, uploadMedia } from "@/lib/media-upload";
import { validateDoctorSignup } from "@/lib/doctor-signup";
import { readFileAsBase64 } from "@/lib/file-base64";
import type { KycScanResult } from "@/lib/kyc-scan";
import { scanDoctorKyc } from "@/lib/kyc-scan.functions";
import {
  specialties,
  upsertClinic,
  getMyClinicMembership,
  registerDoctorAccount,
  signOutStaff,
  type Clinic,
} from "@/lib/mock-data";

export type DoctorSettingsMode = "login" | "signup";

/**
 * State + actions for the doctor settings page (profile, KYC, signup, secretaries).
 * The route component keeps only the JSX; everything stateful lives here.
 */
export function useDoctorSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [role, setRole] = useState<"doctor" | "secretary" | null>(null);
  const [mode, setMode] = useState<DoctorSettingsMode>("login");

  const [clinicId, setClinicId] = useState<string | undefined>(undefined);
  const [isVerified, setIsVerified] = useState(false);
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [hasLicenseDoc, setHasLicenseDoc] = useState(false);
  const [uploadingKyc, setUploadingKyc] = useState(false);
  const [kycAiConsent, setKycAiConsent] = useState(false);
  const [scanningKyc, setScanningKyc] = useState(false);
  const [kycScan, setKycScan] = useState<KycScanResult | null>(null);
  const [kycScanError, setKycScanError] = useState("");
  const kycFileInput = useRef<HTMLInputElement>(null);
  const kycScanSequence = useRef(0);
  const scanKyc = useServerFn(scanDoctorKyc);
  const [name, setName] = useState("");
  const [spec, setSpec] = useState(specialties[0].id);
  const [street, setStreet] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [area, setArea] = useState("");
  const [phone, setPhone] = useState("");
  const [price, setPrice] = useState("");
  const [available, setAvailable] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  // signup fields
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [medicalLicense, setMedicalLicense] = useState("");
  const [syndicateNo, setSyndicateNo] = useState("");
  const [signupError, setSignupError] = useState("");
  const [creating, setCreating] = useState(false);

  // secretary accounts
  const [secretaries, setSecretaries] = useState<{ id: string; full_name: string }[]>([]);
  const [secName, setSecName] = useState("");
  const [secEmail, setSecEmail] = useState("");
  const [secPass, setSecPass] = useState("");
  const [secError, setSecError] = useState("");
  const [secBusy, setSecBusy] = useState(false);

  const hydrate = (c: Clinic) => {
    setClinicId(c.id);
    setIsVerified(c.isVerified);
    setName(c.doctor);
    setSpec(c.specialtyId);
    setArea(c.area);
    setPhone(c.phone);
    setPrice(String(c.price));
    setAvailable(c.availableNow);
    setStreet(c.address);
  };

  const loadSecretaries = useCallback(async () => {
    try {
      const { rows } = await svrListSecretaries();
      setSecretaries(rows as { id: string; full_name: string }[]);
    } catch {
      setSecretaries([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setSignedIn(false);
      setRole(null);
      setClinicId(undefined);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    const membership = await getMyClinicMembership();
    setRole(membership.role);
    if (membership.clinic) hydrate(membership.clinic);
    if (membership.medicalLicense) setMedicalLicense(membership.medicalLicense);
    if (membership.syndicateNo) setSyndicateNo(membership.syndicateNo);
    if (membership.licenseDocPath) setHasLicenseDoc(true);
    if (membership.role === "doctor") await loadSecretaries();
    setLoading(false);
  }, [loadSecretaries]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("اكتب اسم الطبيب ورقم الموبايل الأول");
      return;
    }
    setSaving(true);
    let targetId = clinicId;
    if (!targetId) {
      try {
        const res = await svrCreateMyClinic({
          data: { doctor: name.trim(), specialtyId: spec, phone: phone.trim().replace(/^0/, "20") },
        });
        targetId = res.id;
        setClinicId(targetId);
        resetDoctorModeCache();
      } catch {
        setSaving(false);
        toast.error("تعذر إنشاء العيادة، حاول تاني");
        return;
      }
    }
    const address = [street, building, floor].filter(Boolean).join("، ");
    const updated = await upsertClinic({
      id: targetId,
      doctor: name.trim(),
      specialtyId: spec,
      address: address || street.trim(),
      area: area.trim(),
      distanceKm: 0,
      price: Number(price) || 0,
      rating: 0,
      reviews: 0,
      availableNow: available,
      phone: phone.trim().replace(/^0/, "20"),
      nowServing: 0,
      yourNumber: 0,
      waitingCount: 0,
      lat: 30.0444,
      lng: 31.2357,
    });
    if (!updated) {
      setSaving(false);
      toast.error("تعذر حفظ التعديلات، حاول تاني");
      return;
    }
    setIsVerified(updated.isVerified);
    setSaving(false);
    toast.success("تم حفظ بيانات عيادتك ✅");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const doSignup = async () => {
    setSignupError("");
    const { error, licenseDigits, syndicateDigits } = validateDoctorSignup({
      name,
      phone,
      email,
      pass,
      medicalLicense,
      syndicateNo,
    });
    if (error) return setSignupError(error);
    setCreating(true);
    const res = await registerDoctorAccount({
      email: email.trim(),
      password: pass,
      doctor: name.trim(),
      specialtyId: spec,
      phone: phone.trim().replace(/^0/, "20"),
      medicalLicense: licenseDigits,
      syndicateNo: syndicateDigits,
    });
    setCreating(false);
    if (!res.ok) return setSignupError(authErrorMessage(res.code));
    setJustSubmitted(true);
    setPass("");
    await refresh();
  };

  const addSecretary = async () => {
    setSecError("");
    if (!secName.trim()) return setSecError("اكتب اسم السكرتير");
    if (!secEmail.trim()) return setSecError("اكتب بريد السكرتير");
    if (secPass.length < 6) return setSecError("كلمة السر لازم ٦ حروف أو أرقام على الأقل");
    setSecBusy(true);
    try {
      await svrAddSecretary({
        data: { email: secEmail.trim(), password: secPass, fullName: secName.trim() },
      });
      setSecName("");
      setSecEmail("");
      setSecPass("");
      await loadSecretaries();
    } catch (e) {
      setSecError(authErrorMessage((e as Error)?.message));
    }
    setSecBusy(false);
  };

  const scanKycFile = async (file: File) => {
    if (!clinicId || !kycAiConsent || !file.type.startsWith("image/")) return;
    const sequence = ++kycScanSequence.current;
    setScanningKyc(true);
    setKycScan(null);
    setKycScanError("");
    try {
      const compressed = await compressImage(file, 1440, 0.82);
      if (!["image/jpeg", "image/png", "image/webp"].includes(compressed.type)) {
        throw new Error("صيغة الصورة غير مدعومة للفحص الآلي");
      }
      const result = await scanKyc({
        data: {
          clinicId,
          image: await readFileAsBase64(compressed),
          mime: compressed.type as "image/jpeg" | "image/png" | "image/webp",
          consent: kycAiConsent,
        },
      });
      if (sequence === kycScanSequence.current) setKycScan(result);
    } catch (error) {
      if (sequence === kycScanSequence.current) {
        const message = error instanceof Error ? error.message : "";
        setKycScanError(
          message.includes("RATE_LIMITED")
            ? "تم الوصول لحد الفحوصات المؤقت، حاول بعد دقيقة."
            : "تعذر قراءة المستند حالياً. يمكنك رفعه ليتمكن فريق التوثيق من مراجعته يدوياً.",
        );
      }
    } finally {
      if (sequence === kycScanSequence.current) setScanningKyc(false);
    }
  };

  const uploadKycDocument = async () => {
    if (!clinicId || !kycFile) return;
    setUploadingKyc(true);
    try {
      const result = await uploadMedia({ clinicId, kind: "kyc", file: kycFile });
      if (result.ok) {
        setHasLicenseDoc(true);
        setKycFile(null);
        setKycScan(null);
        setKycScanError("");
        if (kycFileInput.current) kycFileInput.current.value = "";
      }
    } finally {
      setUploadingKyc(false);
    }
  };

  const signOut = async () => {
    await signOutStaff();
    setSignedIn(false);
    setRole(null);
    setClinicId(undefined);
    navigate({ to: "/doctor/login", replace: true });
  };

  return {
    navigate,
    loading,
    signedIn,
    role,
    mode,
    setMode,
    clinicId,
    isVerified,
    kycFile,
    setKycFile,
    hasLicenseDoc,
    uploadingKyc,
    kycAiConsent,
    setKycAiConsent,
    scanningKyc,
    kycScan,
    setKycScan,
    kycScanError,
    setKycScanError,
    kycFileInput,
    name,
    setName,
    spec,
    setSpec,
    street,
    setStreet,
    building,
    setBuilding,
    floor,
    setFloor,
    area,
    setArea,
    phone,
    setPhone,
    price,
    setPrice,
    available,
    setAvailable,
    saved,
    saving,
    justSubmitted,
    email,
    setEmail,
    pass,
    setPass,
    medicalLicense,
    setMedicalLicense,
    syndicateNo,
    setSyndicateNo,
    signupError,
    creating,
    secretaries,
    secName,
    setSecName,
    secEmail,
    setSecEmail,
    secPass,
    setSecPass,
    secError,
    secBusy,
    refresh,
    save,
    doSignup,
    addSecretary,
    scanKycFile,
    uploadKycDocument,
    signOut,
  };
}
