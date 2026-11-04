import Dexie, { type Table } from "dexie";

/** بطاقة الطوارئ المحفوظة على الجهاز فقط — تفتح بدون إنترنت. */
export type EmergencyVault = {
  id: "me";
  bloodType: string;
  allergies: string;
  chronic: string;
  contactName: string;
  contactPhone: string;
  updatedAt: number;
};

class SanadOfflineDB extends Dexie {
  emergency_vault!: Table<EmergencyVault, string>;
  constructor() {
    super("sanad-offline");
    this.version(1).stores({ emergency_vault: "id" });
  }
}

let db: SanadOfflineDB | null = null;
function getDb() {
  if (typeof indexedDB === "undefined") return null;
  db ??= new SanadOfflineDB();
  return db;
}

export async function loadVault(): Promise<EmergencyVault | undefined> {
  return getDb()?.emergency_vault.get("me");
}

export async function saveVault(v: Omit<EmergencyVault, "id" | "updatedAt">) {
  await getDb()?.emergency_vault.put({ ...v, id: "me", updatedAt: Date.now() });
}
