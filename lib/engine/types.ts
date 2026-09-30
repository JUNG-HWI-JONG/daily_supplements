// ── 사용자 입력 ─────────────────────────────────────────────

export type Sex = "male" | "female";
export type Pregnancy = "none" | "planning" | "pregnant" | "breastfeeding";
export type Diet = "omnivore" | "vegetarian" | "vegan";
export type Shift = "day" | "night" | "rotating" | "irregular";
export type Level = "low" | "mid" | "high";
export type Frequency = "sometimes" | "often" | "daily";
export type Duration = "lt1w" | "1m" | "3m";
export type Scope = "domestic" | "overseas";
export type ScopePreference = Scope | "all";
export type Form = "tablet" | "capsule" | "softgel" | "powder" | "liquid" | "gummy" | "chewable";
export type PillSize = "small" | "medium" | "large";
export type ScheduleMode = "once" | "split" | "auto";

export interface Profile {
  sex: Sex;
  age: number;
  pregnancy: Pregnancy;
  medications: string[];
  conditions: string[];
  allergies: string[];
  diet: Diet;
}

export interface Lifestyle {
  job: string;
  shift: Shift;
  workEnv: string[];
  sleepHours: number;
  sleepQuality: number;
  mealsPerDay: number;
  eatingOut: "rare" | "sometimes" | "often";
  vegFruit: Level;
  dairy: Level;
  fishPerWeek: number;
  alcoholPerWeek: number;
  smoking: boolean;
  caffeineCups: number;
  exercise: "none" | "light" | "intense";
  stress: number;
}

export interface SymptomInput {
  id: string;
  frequency: Frequency;
  duration: Duration;
  /** 가장 개선하고 싶은 증상이면 true */
  priority?: boolean;
  /** redFlags 배열의 index → 질문에 "예"라고 답했는지 */
  redFlagAnswers?: Record<number, boolean>;
}

export interface Preferences {
  durationMonths: number;
  /** 월 예산 (원) */
  monthlyBudget: number;
  /** 비어 있으면 모든 제형 허용 */
  forms: Form[];
  pillSize: "any" | "small_only" | "no_pills";
  /** 하루 최대 알약 수 (알약이 아닌 분말·액상·구미·츄어블은 세지 않음) */
  maxPillsPerDay: number;
  mode: ScheduleMode;
  scope: ScopePreference;
  includeHighDose?: boolean;
}

export interface UserInput {
  profile: Profile;
  lifestyle: Lifestyle;
  symptoms: SymptomInput[];
  /** symptoms.json emergency[].id 중 해당하는 것 */
  emergencies: string[];
  preferences: Preferences;
}

// ── 데이터 (data/*.json) ─────────────────────────────────────

export type Evidence = "mfds" | "moderate" | "limited";

export interface Nutrient {
  id: string;
  nameKo: string;
  category: "vitamin" | "mineral" | "functional";
  unit: string;
  fatSoluble: boolean;
  kdri?: { type: string; male: number; female: number };
  ul?: number | null;
  ulByForm?: Record<string, number>;
  maxPerDose?: number;
  mfdsRange?: [number, number];
  safetyCap?: number | null;
  beginner: string;
  cautions: string[];
}

export interface NutrientGroup {
  id: string;
  nameKo: string;
  members: string[];
  beginner: string;
}

export interface Condition {
  field: string;
  op: "eq" | "neq" | "in" | "includes" | "gte" | "lte" | "lt";
  value: unknown;
}
export interface When {
  all?: Condition[];
  any?: Condition[];
}

export type RedFlagAction = "emergency" | "urgent" | "consult";
export interface RedFlag {
  trigger: { type: "question"; text: string } | { type: "duration"; min: Duration } | { type: "always" };
  action: RedFlagAction;
  department: string;
  message: string;
}

export interface Symptom {
  id: string;
  category: string;
  label: string;
  nutrients: { id: string; weight: number; evidence: Evidence; note?: string }[];
  lifestyle: string[];
  redFlags: RedFlag[];
  /** 이 증상이 있으면 목표에서 빼고 총량을 maxAmount 이하로 제한할 영양소 */
  avoid?: Avoid[];
  noSupplementNote?: string;
  note?: string;
}

export interface Avoid {
  id: string;
  maxAmount: number;
  reason: string;
}

export interface EnvRule {
  id: string;
  when: When;
  boosts: { id: string; weight: number; evidence: Evidence }[];
  reason?: string;
  tips?: string[];
  preferMultivitamin?: boolean;
  requireVegan?: boolean;
  excludes?: { tag: string; reason: string }[];
}

export type RuleAction = "exclude" | "consult" | "separate" | "caution" | "together";

export interface ContentItem {
  id: string;
  amount: number;
  form?: string;
}

export interface Product {
  id: string;
  name: string;
  type: "single" | "combo" | "multi";
  form: Form;
  pillSize: PillSize | null;
  servingUnits: number;
  packageUnits: number;
  contents: ContentItem[];
  scope: Scope;
  priceKRW: number;
  searchKeyword: string;
  tags: string[];
  mfdsCertified: boolean;
  sex?: Sex;
  note?: string;
}

// ── 결과 ───────────────────────────────────────────────────

export type Tier = "core" | "recommended" | "optional";

export interface Target {
  id: string;
  nameKo: string;
  score: number;
  evidence: Evidence;
  tier: Tier;
  reasons: string[];
}

export interface Exclusion {
  nutrientId: string;
  action: "exclude" | "consult";
  /** 이 양 이상일 때만 제외 (없으면 항상) */
  minAmount?: number;
  reason: string;
}

export interface Unmet {
  nutrientId: string;
  nameKo: string;
  tier: Tier;
  reason: "no_product" | "budget" | "pill_limit" | "safety_limit";
  message: string;
}

export interface RecommendedItem {
  product: Product;
  tier: Tier;
  /** 이 제품이 채우는 목표 영양소 */
  covers: string[];
  reasons: string[];
  cautions: string[];
  monthlyCost: number;
  /** 선택 기간 동안 필요한 통 수 */
  packages: number;
  links: { vendorId: string; name: string; url: string }[];
}

export interface NutrientTotal {
  nutrientId: string;
  nameKo: string;
  amount: number;
  unit: string;
  limit: number | null;
}

export interface ScheduleSlot {
  slotId: string;
  label: string;
  items: { productId: string; name: string; units: number }[];
}

export interface Schedule {
  mode: "once" | "split";
  slots: ScheduleSlot[];
  notes: string[];
}

export interface TriggeredRedFlag {
  symptomId: string;
  symptomLabel: string;
  action: RedFlagAction;
  department: string;
  message: string;
}

export interface Recommendation {
  status: "ok" | "emergency" | "consult_only";
  messages: string[];
  redFlags: TriggeredRedFlag[];
  targets: Target[];
  items: RecommendedItem[];
  excluded: (Exclusion & { nameKo: string })[];
  unmet: Unmet[];
  totals: NutrientTotal[];
  schedule: Schedule;
  cost: { monthly: number; total: number; daily: number; budget: number };
  pillsPerDay: number;
  tips: string[];
  notes: string[];
}
