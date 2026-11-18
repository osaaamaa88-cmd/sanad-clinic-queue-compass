import { MapPin } from "lucide-react";
import { Field } from "./Field";
import { SpecialtyChips } from "./SpecialtyChips";

export function DoctorProfileForm({
  name,
  setName,
  spec,
  setSpec,
  area,
  setArea,
  street,
  setStreet,
  building,
  setBuilding,
  floor,
  setFloor,
  phone,
  setPhone,
  price,
  setPrice,
}: {
  name: string;
  setName: (value: string) => void;
  spec: string;
  setSpec: (value: string) => void;
  area: string;
  setArea: (value: string) => void;
  street: string;
  setStreet: (value: string) => void;
  building: string;
  setBuilding: (value: string) => void;
  floor: string;
  setFloor: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  price: string;
  setPrice: (value: string) => void;
}) {
  return (
    <>
      {/* Profile form */}
      <div className="mt-6 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold">بيانات العيادة</h2>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-muted-foreground">
          اختيارية — أضفها لاحقاً
        </span>
      </div>
      <div className="mt-3 space-y-4 rounded-2xl border border-border bg-card p-4">
        <Field label="اسم الطبيب *" value={name} onChange={setName} placeholder="د. الاسم الكامل" />
        <div>
          <label className="text-xs font-bold text-muted-foreground">التخصص</label>
          <SpecialtyChips spec={spec} setSpec={setSpec} />
        </div>
        <Field
          label="المنطقة / الحي (اختياري)"
          value={area}
          onChange={setArea}
          placeholder="مثال: المهندسين"
        />
        <Field
          label="الشارع (اختياري)"
          value={street}
          onChange={setStreet}
          placeholder="اسم الشارع"
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="العمارة (اختياري)"
            value={building}
            onChange={setBuilding}
            placeholder="عمارة رقم…"
          />
          <Field label="الدور (اختياري)" value={floor} onChange={setFloor} placeholder="الدور…" />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground">رقم الموبايل (واتساب) *</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="01xxxxxxxxx"
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-bold outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground">سعر الكشف (اختياري)</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="numeric"
            placeholder="مثال: 250"
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-bold outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Map picker */}
      <h2 className="mt-6 text-base font-bold">حدد الموقع على الخريطة (اختياري)</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative">
          <iframe
            title="اختيار موقع العيادة"
            className="h-56 w-full"
            loading="lazy"
            src="https://maps.google.com/maps?q=cairo%20egypt&z=13&output=embed"
          />
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <MapPin className="h-10 w-10 fill-destructive text-destructive drop-shadow" />
          </div>
        </div>
      </div>
    </>
  );
}
