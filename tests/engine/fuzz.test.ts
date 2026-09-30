import { expect, test } from "vitest";
import { recommend, type Form, type UserInput } from "@/lib/engine";
import { data } from "@/lib/engine/data";
import { makeInput } from "./fixtures";
import { expectInvariants } from "./invariants";

/** 재현 가능한 의사난수 (mulberry32) */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const symptomIds = [...data.symptoms.keys()];
const forms: Form[] = ["tablet", "capsule", "softgel", "powder", "liquid", "gummy", "chewable"];

function randomInput(r: () => number): UserInput {
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const some = <T,>(xs: readonly T[], p: number) => xs.filter(() => r() < p);
  return makeInput({
    profile: {
      sex: pick(["male", "female"] as const),
      age: 19 + Math.floor(r() * 60),
      medications: some(["anticoagulant", "thyroid", "antihypertensive", "diabetes", "antibiotic"], 0.12),
      conditions: some(["kidney_disease", "liver_disease", "hypertension", "diabetes", "kidney_stone", "gi_obstruction"], 0.1),
      allergies: some(["shellfish", "fish", "soy", "dairy", "asteraceae", "gelatin_pork"], 0.1),
      diet: pick(["omnivore", "omnivore", "omnivore", "vegetarian", "vegan"] as const),
    },
    lifestyle: {
      shift: pick(["day", "day", "night", "rotating", "irregular"] as const),
      workEnv: some(["indoor", "outdoor", "long_screen", "long_standing", "long_sitting"], 0.4),
      sleepHours: 4 + Math.floor(r() * 5),
      mealsPerDay: 1 + Math.floor(r() * 3),
      eatingOut: pick(["rare", "sometimes", "often"] as const),
      vegFruit: pick(["low", "mid", "high"] as const),
      dairy: pick(["low", "mid", "high"] as const),
      fishPerWeek: Math.floor(r() * 3),
      alcoholPerWeek: Math.floor(r() * 5),
      smoking: r() < 0.2,
      caffeineCups: Math.floor(r() * 5),
      exercise: pick(["none", "light", "intense"] as const),
      stress: 1 + Math.floor(r() * 5),
    },
    symptoms: some(symptomIds, 0.12).map((id) => ({
      id,
      frequency: pick(["sometimes", "often", "daily"] as const),
      duration: pick(["lt1w", "1m", "3m"] as const),
      priority: r() < 0.3,
    })),
    preferences: {
      durationMonths: pick([1, 3, 6, 12]),
      monthlyBudget: pick([10000, 30000, 50000, 100000]),
      forms: r() < 0.6 ? [] : some(forms, 0.5),
      pillSize: pick(["any", "any", "small_only", "no_pills"] as const),
      maxPillsPerDay: 1 + Math.floor(r() * 8),
      mode: pick(["once", "split", "auto"] as const),
      scope: pick(["domestic", "overseas", "all"] as const),
      includeHighDose: r() < 0.2,
    },
  });
}

test("무작위 입력 2,000건에서 안전·제약 위반 0건", () => {
  const r = rng(20260930);
  let ok = 0;
  for (let i = 0; i < 2000; i++) {
    const input = randomInput(r);
    const result = recommend(input);
    try {
      expectInvariants(input, result);
    } catch (e) {
      console.error(JSON.stringify(input));
      throw e;
    }
    if (result.status === "ok" && result.items.length > 0) ok++;
  }
  // 입력이 대부분 추천으로 이어지는지 (전부 비어 있으면 엔진이 너무 보수적)
  expect(ok).toBeGreaterThan(1000);
});
