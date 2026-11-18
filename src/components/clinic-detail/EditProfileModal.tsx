import { useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { youtubeId } from "@/lib/youtube";
import { AvatarActionSheet } from "@/components/AvatarActionSheet";
import { removeClinicAvatar } from "@/lib/stories";
import { saveClinicProfile, uploadClinicMedia } from "@/lib/clinic-profile";
import { specialties, type Clinic } from "@/lib/mock-data";

export function EditProfileModal({
  clinic,
  initialBio,
  onClose,
  onSaved,
}: {
  clinic: Clinic;
  initialBio: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [doctor, setDoctor] = useState(clinic.doctor);
  const [specialtyId, setSpecialtyId] = useState(clinic.specialtyId);
  const [price, setPrice] = useState(String(clinic.price || ""));
  const [phone, setPhone] = useState(clinic.phone);
  const [bio, setBio] = useState(initialBio);
  const [hours, setHours] = useState(clinic.workingHours ?? "");
  const [yt, setYt] = useState(clinic.youtubeUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const [msg, setMsg] = useState("");
  const [sheet, setSheet] = useState(false);

  const uploadFile = async (kind: "avatar" | "cover", file: File) => {
    setUploading(kind);
    const res = await uploadClinicMedia({ clinicId: clinic.id, kind, file });
    setUploading(null);
    if (res.ok) {
      setMsg(kind === "avatar" ? "تم تحديث الصورة الشخصية ✅" : "تم تحديث صورة الغلاف ✅");
      await onSaved();
    } else {
      setMsg(
        res.error === "FILE_TOO_LARGE"
          ? "الصورة كبيرة جداً، جرب صورة أصغر."
          : "تعذر رفع الصورة، حاول تاني.",
      );
    }
  };

  const pick = (kind: "avatar" | "cover") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await uploadFile(kind, file);
  };

  const save = async () => {
    if (yt.trim() && !youtubeId(yt)) {
      setMsg("رابط يوتيوب غير صحيح — انسخ رابط الفيديو من يوتيوب.");
      return;
    }
    setSaving(true);
    const ok = await saveClinicProfile({
      clinicId: clinic.id,
      doctor,
      specialtyId,
      price: Number(price) || 0,
      phone,
      bio,
      workingHours: hours,
      youtubeUrl: yt,
    });
    setSaving(false);
    if (!ok) {
      setMsg("تعذر الحفظ، حاول تاني.");
      return;
    }
    await onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-background/80 p-0 backdrop-blur sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-gold/25 bg-card p-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black">تعديل البروفايل</h3>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="grid h-11 w-11 place-items-center rounded-full bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSheet(true)}
            className="flex min-h-11 flex-col items-center gap-1 rounded-2xl border border-dashed border-gold/40 p-3 text-xs font-bold text-gold"
          >
            {uploading === "avatar" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            تعديل الصورة الشخصية
          </button>
          <label className="flex min-h-11 cursor-pointer flex-col items-center gap-1 rounded-2xl border border-dashed border-gold/40 p-3 text-xs font-bold text-gold">
            {uploading === "cover" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            صورة الغلاف
            <input type="file" accept="image/*" className="hidden" onChange={pick("cover")} />
          </label>
        </div>

        <AvatarActionSheet
          open={sheet}
          onClose={() => setSheet(false)}
          hasPhoto
          busy={uploading === "avatar"}
          onFile={async (file) => {
            await uploadFile("avatar", file);
            setSheet(false);
          }}
          onRemove={async () => {
            const ok = await removeClinicAvatar(clinic.id);
            setSheet(false);
            setMsg(ok ? "تم حذف الصورة الشخصية" : "تعذر حذف الصورة.");
            if (ok) await onSaved();
          }}
        />

        <div className="mt-4 space-y-3">
          <Field label="اسم الطبيب">
            <input
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary p-3 text-sm"
            />
          </Field>
          <Field label="التخصص">
            <select
              value={specialtyId}
              onChange={(e) => setSpecialtyId(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary p-3 text-sm"
            >
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.emoji} {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="سعر الكشف (جنيه)">
            <input
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-full rounded-xl border border-border bg-secondary p-3 text-sm"
            />
          </Field>
          <Field label="رقم الهاتف / واتساب">
            <input
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary p-3 text-sm"
            />
          </Field>
          <Field label="مواعيد وأيام العمل">
            <textarea
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              rows={2}
              placeholder="مثال: السبت للخميس 5م – 10م • الجمعة إجازة"
              className="w-full rounded-xl border border-border bg-secondary p-3 text-sm"
            />
          </Field>
          <Field label="فيديو العيادة (رابط يوتيوب)">
            <input
              dir="ltr"
              value={yt}
              onChange={(e) => setYt(e.target.value)}
              placeholder="https://youtu.be/..."
              className="w-full rounded-xl border border-border bg-secondary p-3 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              للفيديوهات الطويلة وجولات العيادة — ارفعه على يوتيوب والصق الرابط هنا.
            </p>
          </Field>
          <Field label="نبذة عن العيادة">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="اكتب نبذة قصيرة تظهر للمرضى"
              className="w-full rounded-xl border border-border bg-secondary p-3 text-sm"
            />
          </Field>
        </div>

        {msg && <p className="mt-3 rounded-xl bg-secondary p-3 text-xs font-bold">{msg}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="gradient-gold mt-4 w-full rounded-2xl py-4 text-base font-black text-gold-foreground shadow-gold disabled:opacity-60"
        >
          {saving ? "جاري الحفظ…" : "حفظ التعديلات"}
        </button>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
