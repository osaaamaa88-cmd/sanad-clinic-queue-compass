import test from "node:test";
import assert from "node:assert/strict";
import { buildBookingDays, days } from "../booking-days.ts";

const fmt = new Intl.DateTimeFormat("ar-EG", {
  day: "numeric",
  month: "long",
});
const weekdayFmt = new Intl.DateTimeFormat("ar-EG", { weekday: "long" });

function atMidnight(offset: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

test("booking days are the next 5 days from today, not a fixed list", () => {
  assert.equal(days.length, 5);
  assert.equal(days[0]?.label, "اليوم");
  assert.equal(days[0]?.date, fmt.format(atMidnight(0)));
  assert.equal(days[1]?.label, "بكرة");
  assert.equal(days[1]?.date, fmt.format(atMidnight(1)));
  for (let i = 2; i < 5; i++) {
    assert.equal(days[i]?.label, weekdayFmt.format(atMidnight(i)));
    assert.equal(days[i]?.date, fmt.format(atMidnight(i)));
  }
});

test("buildBookingDays honors the requested count", () => {
  const three = buildBookingDays(3);
  assert.equal(three.length, 3);
  assert.equal(three[0]?.label, "اليوم");
  assert.equal(three[2]?.date, fmt.format(atMidnight(2)));
});
