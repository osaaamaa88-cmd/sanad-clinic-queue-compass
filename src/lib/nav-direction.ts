export type NavDir = "tab" | "push" | "pop";

const TABS = ["/patient", "/patient/search", "/community", "/patient/emergency", "/patient/login"];

const clean = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
const depth = (p: string) => clean(p).split("/").filter(Boolean).length;

/** Decides the page transition style: tab switch, going deeper (push) or going back (pop). */
export function navDirection(from: string, to: string, isBack: boolean): NavDir {
  const a = clean(from);
  const b = clean(to);
  if (TABS.includes(a) && TABS.includes(b)) return "tab";
  if (isBack) return "pop";
  if (depth(b) < depth(a)) return "pop";
  if (depth(b) > depth(a)) return "push";
  return TABS.includes(b) ? "tab" : "push";
}
