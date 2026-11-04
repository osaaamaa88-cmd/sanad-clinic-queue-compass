import { describe, expect, test } from "bun:test";
import {
  detectPersonalData,
  flattenPages,
  nextCursor,
  sortComments,
  type FeedPost,
} from "@/components/community/community-logic";

const post = (id: string, created_at: string) => ({ id, created_at }) as FeedPost;

describe("personal data before posting", () => {
  test("blocks a 14-digit national ID, also in Arabic digits", () => {
    expect(detectPersonalData("رقمي 29801011234567")).toContain("national_id");
    expect(detectPersonalData("٢٩٨٠١٠١١٢٣٤٥٦٧")).toContain("national_id");
  });
  test("blocks Egyptian mobile numbers", () => {
    expect(detectPersonalData("كلمني 01012345678")).toContain("phone");
    expect(detectPersonalData("+20 115 123 4567")).toContain("phone");
  });
  test("blocks emails and links", () => {
    expect(detectPersonalData("a@b.com")).toContain("email");
    expect(detectPersonalData("شوف https://x.co/abc")).toContain("link");
  });
  test("allows ordinary medical text with numbers", () => {
    expect(detectPersonalData("الضغط 140/90 والسكر 180 من 3 أيام")).toEqual([]);
  });
});

describe("feed paging", () => {
  test("full page yields cursor of last post, short page ends", () => {
    const page = Array.from({ length: 10 }, (_, i) => post(`p${i}`, `2026-01-${10 - i}`));
    expect(nextCursor(page)).toEqual({ id: "p9", created_at: "2026-01-1" });
    expect(nextCursor(page.slice(0, 4))).toBeNull();
  });
  test("merging pages removes duplicates", () => {
    const merged = flattenPages([[post("a", "3"), post("b", "2")], [post("b", "2"), post("c", "1")]]);
    expect(merged.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });
});

test("doctor answers come first, then newest", () => {
  const sorted = sortComments([
    { id: 1, created_at: "2026-01-03", is_doctor: false },
    { id: 2, created_at: "2026-01-01", is_doctor: true },
    { id: 3, created_at: "2026-01-04", is_doctor: false },
  ]);
  expect(sorted.map((c) => c.id)).toEqual([2, 3, 1]);
});
