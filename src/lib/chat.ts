import { supabase } from "@/integrations/supabase/client";

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string;
  body: string;
  kind?: string;
  attachment_path?: string;
  payload?: unknown;
  read_at: string | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  clinic_id: string;
  patient_id: string;
  patient_name: string;
  last_message: string;
  last_message_at: string;
  allow_images?: boolean;
};

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Find or create the patient's conversation with a clinic. Requires a signed-in account. */
export async function openConversation(
  clinicId: string,
  patientName: string,
): Promise<string | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data: existing } = await supabase
    .from("clinic_conversations")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("patient_id", uid)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("clinic_conversations")
    .insert({ clinic_id: clinicId, patient_id: uid, patient_name: patientName })
    .select("id")
    .single();
  if (error) return null;
  return data.id;
}

export async function listConversations(): Promise<Conversation[]> {
  const { data } = await supabase
    .from("clinic_conversations")
    .select("*")
    .order("last_message_at", { ascending: false });
  return (data ?? []) as Conversation[];
}

export async function unreadCounts(uid: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from("clinic_messages")
    .select("conversation_id")
    .is("read_at", null)
    .neq("sender_id", uid);
  const map: Record<string, number> = {};
  for (const r of data ?? []) map[r.conversation_id] = (map[r.conversation_id] ?? 0) + 1;
  return map;
}

export async function loadMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from("clinic_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);
  return (data ?? []) as ChatMessage[];
}

export async function sendMessage(conversationId: string, body: string): Promise<boolean> {
  const uid = await currentUserId();
  const text = body.trim().slice(0, 2000);
  if (!uid || !text) return false;
  const { error } = await supabase
    .from("clinic_messages")
    .insert({ conversation_id: conversationId, sender_id: uid, body: text });
  return !error;
}

export async function markRead(conversationId: string, uid: string) {
  await supabase
    .from("clinic_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", uid)
    .is("read_at", null);
}

export type RxItem = { name: string; dose: string; notes?: string };
export type RxPayload = {
  patient: string;
  age?: string;
  diagnosis?: string;
  items: RxItem[];
  advice?: string;
  tests?: string;
  doctor: string;
  specialty?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicHours?: string;
  date: string;
};

async function compressImage(file: File, max = 1280, quality = 0.75): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((r) => c.toBlob((b) => r(b!), "image/jpeg", quality));
}

export async function sendImage(conversationId: string, file: File): Promise<boolean> {
  const uid = await currentUserId();
  if (!uid) return false;
  const blob = await compressImage(file);
  const path = `${conversationId}/${crypto.randomUUID()}.jpg`;
  const up = await supabase.storage
    .from("chat-media")
    .upload(path, blob, { contentType: "image/jpeg" });
  if (up.error) return false;
  const { error } = await supabase.from("clinic_messages").insert({
    conversation_id: conversationId,
    sender_id: uid,
    body: "📷 صورة",
    kind: "image",
    attachment_path: path,
  });
  return !error;
}

export async function sendRx(conversationId: string, rx: RxPayload): Promise<boolean> {
  const uid = await currentUserId();
  if (!uid) return false;
  const { error } = await supabase.from("clinic_messages").insert({
    conversation_id: conversationId,
    sender_id: uid,
    body: "💊 روشتة طبية",
    kind: "rx",
    payload: rx as never,
  });
  return !error;
}

const urlCache = new Map<string, string>();
export async function signedImageUrl(path: string): Promise<string> {
  if (urlCache.has(path)) return urlCache.get(path)!;
  const { data } = await supabase.storage.from("chat-media").createSignedUrl(path, 300);
  const u = data?.signedUrl ?? "";
  if (u) urlCache.set(path, u);
  return u;
}

export async function setAllowImages(conversationId: string, allow: boolean): Promise<boolean> {
  const { error } = await supabase
    .from("clinic_conversations")
    .update({ allow_images: allow })
    .eq("id", conversationId);
  if (!error)
    await sendMessage(
      conversationId,
      allow ? "📷 سمح الطبيب بإرسال الصور في المحادثة دي" : "🚫 تم إيقاف إرسال الصور",
    );
  return !error;
}
