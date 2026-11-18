// fetch لعميل Supabase يُنشأ يدويًا بمفتاح عام: يمرّر المفتاح في هيدر
// apikey، ويحذف هيدر Authorization عندما يكون المفتاح من النوع الجديد
// sb_... (مفتاح شفاف لا يُرسل كـ Bearer). نفس المنطق كان مكررًا يدويًا
// في godmode.functions.ts و staff.functions.ts.
// (ملفات integrations/supabase/* مولّدة تلقائيًا وفيها نسختها الخاصة — لا تُلمس.)
export function createSupabaseKeyFetch(key: string): typeof fetch {
  return (input, init) => {
    const h = new Headers(init?.headers);
    if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
      h.delete("Authorization");
    h.set("apikey", key);
    return fetch(input, { ...init, headers: h });
  };
}
