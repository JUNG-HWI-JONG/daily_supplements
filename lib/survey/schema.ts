import { z } from "zod";
import type { UserInput } from "@/lib/engine";
import type { SurveyDraft } from "./store";

const profileSchema = z.object({
  sex: z.enum(["male", "female"], { error: "성별을 선택해주세요" }),
  age: z.number({ error: "나이를 입력해주세요" }).int({ error: "나이는 숫자로 입력해주세요" }).min(1, { error: "나이를 확인해주세요" }).max(120, { error: "나이를 확인해주세요" }),
  pregnancy: z.enum(["none", "planning", "pregnant", "breastfeeding"]),
  diet: z.enum(["omnivore", "vegetarian", "vegan"]),
  medications: z.array(z.string(), { error: "복용 중인 약을 선택하거나 '없음'을 눌러주세요" }),
  conditions: z.array(z.string(), { error: "앓고 있는 질환을 선택하거나 '없음'을 눌러주세요" }),
  allergies: z.array(z.string()),
});

const lifestyleSchema = z.object({
  job: z.string({ error: "하는 일을 선택해주세요" }),
  shift: z.enum(["day", "night", "rotating", "irregular"], { error: "근무 형태를 선택해주세요" }),
  workEnv: z.array(z.string()),
  sleepHours: z.number(),
  sleepQuality: z.number(),
  mealsPerDay: z.number(),
  eatingOut: z.enum(["rare", "sometimes", "often"]),
  vegFruit: z.enum(["low", "mid", "high"]),
  dairy: z.enum(["low", "mid", "high"]),
  fishPerWeek: z.number(),
  alcoholPerWeek: z.number(),
  smoking: z.boolean(),
  caffeineCups: z.number(),
  exercise: z.enum(["none", "light", "intense"]),
  stress: z.number(),
});

const symptomsSchema = z.object({
  symptoms: z.array(
    z.object({
      id: z.string(),
      frequency: z.enum(["sometimes", "often", "daily"]),
      duration: z.enum(["lt1w", "1m", "3m"]),
      priority: z.boolean().optional(),
      redFlagAnswers: z.record(z.string(), z.boolean()).optional(),
    }),
  ),
  emergencies: z.array(z.string(), { error: "아래 증상 중 해당하는 게 있는지 알려주세요" }),
});

const preferencesSchema = z.object({
  durationMonths: z.number(),
  monthlyBudget: z.number({ error: "예산을 입력해주세요" }).min(5000, { error: "예산은 월 5,000원 이상으로 입력해주세요" }),
  forms: z.array(z.enum(["tablet", "capsule", "softgel", "powder", "liquid", "gummy", "chewable"])),
  pillSize: z.enum(["any", "small_only", "no_pills"]),
  maxPillsPerDay: z.number().int().min(1).max(10),
  mode: z.enum(["once", "split", "auto"]),
  scope: z.enum(["domestic", "overseas", "all"]),
});

export const STEPS = [
  { id: "profile", title: "기본 정보", description: "안전한 추천을 위해 꼭 필요한 정보예요." },
  { id: "lifestyle", title: "생활환경", description: "일하는 환경에 따라 부족해지기 쉬운 영양소가 달라요." },
  { id: "symptoms", title: "불편한 곳", description: "요즘 불편한 곳을 모두 골라주세요. 없으면 건너뛰어도 돼요." },
  { id: "preferences", title: "복용 선호", description: "예산과 먹기 편한 형태를 알려주세요." },
] as const;

export type FieldErrors = Record<string, string>;

function toErrors(error: z.ZodError, prefix = ""): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = prefix + issue.path.join(".");
    out[key] ??= issue.message;
  }
  return out;
}

/** 단계별 검증. 통과하면 빈 객체 */
export function validateStep(step: number, draft: SurveyDraft): FieldErrors {
  const result =
    step === 0 ? profileSchema.safeParse(draft.profile)
    : step === 1 ? lifestyleSchema.safeParse(draft.lifestyle)
    : step === 2 ? symptomsSchema.safeParse({ symptoms: draft.symptoms, emergencies: draft.emergencies })
    : preferencesSchema.safeParse(draft.preferences);
  return result.success ? {} : toErrors(result.error);
}

/** 설문 초안 → 엔진 입력. 미완성이면 null */
export function toUserInput(draft: SurveyDraft): UserInput | null {
  const profile = profileSchema.safeParse(draft.profile);
  const lifestyle = lifestyleSchema.safeParse(draft.lifestyle);
  const symptoms = symptomsSchema.safeParse({ symptoms: draft.symptoms, emergencies: draft.emergencies });
  const preferences = preferencesSchema.safeParse(draft.preferences);
  if (!profile.success || !lifestyle.success || !symptoms.success || !preferences.success) return null;
  return {
    profile: { ...profile.data, pregnancy: profile.data.sex === "female" ? profile.data.pregnancy : "none" },
    lifestyle: lifestyle.data,
    symptoms: symptoms.data.symptoms,
    emergencies: symptoms.data.emergencies,
    preferences: preferences.data,
  };
}
