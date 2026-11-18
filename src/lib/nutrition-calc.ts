export type Profile = {
  sex: "m" | "f";
  age: number;
  height: number;
  weight: number;
  activity: number;
  goal: "lose" | "keep" | "gain";
};

/** Daily calorie target (Mifflin-St Jeor + activity, adjusted by goal). */
export function calcTarget(p: Profile) {
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === "m" ? 5 : -161);
  const tdee = bmr * p.activity;
  return Math.round(p.goal === "lose" ? tdee - 500 : p.goal === "gain" ? tdee + 300 : tdee);
}
