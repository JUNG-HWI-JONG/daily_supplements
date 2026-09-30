import type { Lifestyle, Preferences, Profile, UserInput } from "@/lib/engine";

type DeepPartialInput = {
  profile?: Partial<Profile>;
  lifestyle?: Partial<Lifestyle>;
  preferences?: Partial<Preferences>;
  symptoms?: UserInput["symptoms"];
  emergencies?: string[];
};

export function makeInput(over: DeepPartialInput = {}): UserInput {
  return {
    profile: { sex: "male", age: 30, pregnancy: "none", medications: [], conditions: [], allergies: [], diet: "omnivore", ...over.profile },
    lifestyle: {
      job: "office", shift: "day", workEnv: [], sleepHours: 7, sleepQuality: 3, mealsPerDay: 3, eatingOut: "sometimes",
      vegFruit: "mid", dairy: "mid", fishPerWeek: 1, alcoholPerWeek: 0, smoking: false, caffeineCups: 1, exercise: "light", stress: 2,
      ...over.lifestyle,
    },
    symptoms: over.symptoms ?? [],
    emergencies: over.emergencies ?? [],
    preferences: {
      durationMonths: 3, monthlyBudget: 30000, forms: [], pillSize: "any", maxPillsPerDay: 6, mode: "auto", scope: "domestic",
      ...over.preferences,
    },
  };
}

/** PRD §3 페르소나 */
export const personas = {
  minsu: makeInput({
    profile: { sex: "male", age: 29 },
    lifestyle: { job: "screen_intensive", workEnv: ["indoor", "long_screen", "long_sitting"], caffeineCups: 3, stress: 4, fishPerWeek: 1 },
    symptoms: [
      { id: "eye_twitch", frequency: "often", duration: "1m", priority: true },
      { id: "eye_strain", frequency: "daily", duration: "3m", priority: true },
      { id: "wrist_pain", frequency: "often", duration: "3m" },
    ],
    preferences: { monthlyBudget: 30000, maxPillsPerDay: 4, mode: "once", scope: "domestic" },
  }),
  jiyoung: makeInput({
    profile: { sex: "female", age: 34 },
    lifestyle: { job: "medical", shift: "rotating", workEnv: ["indoor", "long_standing"], sleepHours: 5, sleepQuality: 2, stress: 4 },
    symptoms: [
      { id: "frequent_diarrhea", frequency: "often", duration: "1m", priority: true },
      { id: "insomnia_onset", frequency: "often", duration: "1m" },
      { id: "swelling", frequency: "daily", duration: "3m" },
    ],
    preferences: { monthlyBudget: 30000, pillSize: "small_only", maxPillsPerDay: 3, mode: "split", scope: "all" },
  }),
  hyunwoo: makeInput({
    profile: { sex: "male", age: 41, medications: ["antihypertensive"], conditions: ["hypertension"] },
    lifestyle: { job: "driver", workEnv: ["outdoor"], alcoholPerWeek: 3, eatingOut: "often", mealsPerDay: 2 },
    symptoms: [
      { id: "chronic_fatigue", frequency: "daily", duration: "1m", priority: true },
      { id: "bloating", frequency: "often", duration: "1m" },
    ],
    preferences: { monthlyBudget: 50000, forms: ["powder", "liquid"], mode: "auto", scope: "domestic" },
  }),
  sua: makeInput({
    profile: { sex: "female", age: 23 },
    lifestyle: { job: "student", caffeineCups: 4, vegFruit: "low", mealsPerDay: 2 },
    symptoms: [
      { id: "skin_trouble", frequency: "often", duration: "1m", priority: true },
      { id: "poor_focus", frequency: "often", duration: "1m" },
    ],
    preferences: { monthlyBudget: 20000, forms: ["gummy", "chewable"], mode: "once", scope: "all" },
  }),
};
