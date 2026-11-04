import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectPersonalData,
  flattenPages,
  nextCursor,
  sortComments,
  type FeedPost,
} from "@/components/community/community-logic";

const post = (id: string, created_at: string) => ({ id, created_at }) as FeedPost;

test("blocks a 14-digit national ID, also in Arabic digits", () => {
  assert.ok(detectPersonalData("رقمي 29801011234567").includes("national_id"));
  assert.ok(detectPersonalData("٢٩٨٠١٠١١٢٣٤٥٦٧").includes("national_id"));
});

test("blocks Egyptian mobile numbers", () => {
  assert.ok(detectPersonalData("كلمني 01012345678").includes("phone"));
  assert.ok(detectPersonalData("+20 115 123 4567").includes("phone"));
});

test("blocks emails and links", () => {
  assert.ok(detectPersonalData("a@b.com").includes("email"));
  assert.ok(detectPersonalData("شوف https://x.co/abc").includes("link"));
});

test("allows ordinary medical text with numbers", () => {
  assert.deepEqual(detectPersonalData("الضغط 140/90 والسكر 180 من 3 أيام"), []);
});

test("full page yields cursor of last post, short page ends the feed", () => {
  const page = Array.from({ length: 10 }, (_, i) => post(`p${i}`, `2026-01-${10 - i}`));
  assert.deepEqual(nextCursor(page), { id: "p9", created_at: "2026-01-1" });
  assert.equal(nextCursor(page.slice(0, 4)), null);
});

test("merging pages removes duplicates", () => {
  const merged = flattenPages([
    [post("a", "3"), post("b", "2")],
    [post("b", "2"), post("c", "1")],
  ]);
  assert.deepEqual(
    merged.map((p) => p.id),
    ["a", "b", "c"],
  );
});

test("doctor answers come first, then newest", () => {
  const sorted = sortComments([
    { id: 1, created_at: "2026-01-03", is_doctor: false },
    { id: 2, created_at: "2026-01-01", is_doctor: true },
    { id: 3, created_at: "2026-01-04", is_doctor: false },
  ]);
  assert.deepEqual(
    sorted.map((c) => c.id),
    [2, 3, 1],
  );
});
