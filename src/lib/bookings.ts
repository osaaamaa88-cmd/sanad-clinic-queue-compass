/* Booking data access: patient bookings for a clinic. */

import {
  svrCreateBooking,
  svrListBookingsForClinic,
  svrUpdateBookingStatus,
  svrAddWalkIn,
} from "@/lib/data.functions";

export type Booking = {
  id: string;
  code: string;
  clinicId: string;
  patientName: string;
  patientPhone: string;
  dayLabel: string;
  slot: string;
  queueNumber: number;
  status: "waiting" | "in" | "done" | "cancelled";
  createdAt: number;
  visitType: "new" | "followup";
};

type BookingRow = {
  id: string;
  code: string;
  clinic_id: string;
  patient_name: string;
  patient_phone: string;
  day_label: string;
  slot: string;
  queue_number: number;
  status: string;
  created_at: string;
  visit_type?: string | null;
};

function rowToBooking(r: BookingRow): Booking {
  return {
    id: r.id,
    code: r.code,
    clinicId: r.clinic_id,
    patientName: r.patient_name,
    patientPhone: r.patient_phone,
    dayLabel: r.day_label,
    slot: r.slot,
    queueNumber: r.queue_number,
    status: (r.status as Booking["status"]) || "waiting",
    createdAt: new Date(r.created_at).getTime(),
    visitType: r.visit_type === "followup" ? "followup" : "new",
  };
}

export async function createBooking(input: {
  clinicId: string;
  patientName: string;
  patientPhone: string;
  dayLabel: string;
  slot: string;
  visitType?: "new" | "followup";
}): Promise<Booking | null> {
  try {
    const res = await svrCreateBooking({ data: input });
    return {
      id: res.id,
      code: res.code,
      clinicId: input.clinicId,
      patientName: input.patientName,
      patientPhone: input.patientPhone,
      dayLabel: input.dayLabel,
      slot: input.slot,
      queueNumber: res.queueNumber,
      status: "waiting",
      createdAt: Date.now(),
      visitType: input.visitType ?? "new",
    };
  } catch {
    return null;
  }
}

/** Walk-in patients added by the clinic secretary (bypasses the closed-bookings flag). */
export async function addWalkIn(input: {
  clinicId: string;
  patientName: string;
  patientPhone: string;
  slot: string;
  visitType?: "new" | "followup";
}): Promise<boolean> {
  try {
    await svrAddWalkIn({ data: input });
    return true;
  } catch {
    return false;
  }
}

export async function listBookingsForClinic(clinicId: string): Promise<Booking[]> {
  try {
    const { rows } = await svrListBookingsForClinic({ data: { clinicId } });
    return (rows as BookingRow[]).map(rowToBooking);
  } catch {
    return [];
  }
}

export async function updateBookingStatus(id: string, status: Booking["status"]): Promise<boolean> {
  try {
    await svrUpdateBookingStatus({ data: { id, status } });
    return true;
  } catch {
    return false;
  }
}
