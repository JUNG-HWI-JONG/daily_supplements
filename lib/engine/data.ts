import nutrientsJson from "../../data/nutrients.json";
import symptomsJson from "../../data/symptoms.json";
import envJson from "../../data/environment-rules.json";
import interactionsJson from "../../data/interactions.json";
import timingJson from "../../data/timing-rules.json";
import productsJson from "../../data/products.json";
import vendorsJson from "../../data/vendors.json";
import type {
  EnvRule,
  Evidence,
  Nutrient,
  NutrientGroup,
  Product,
  RuleAction,
  Scope,
  Symptom,
  When,
} from "./types";

export interface EngineData {
  nutrients: Map<string, Nutrient>;
  groups: Map<string, NutrientGroup>;
  symptoms: Map<string, Symptom>;
  emergencies: { id: string; text: string; message: string }[];
  envRules: EnvRule[];
  interactions: {
    globalRules: { when: When; mode: "consult_only" | "banner"; message: string }[];
    nutrientPairs: { a: string; b: string; action: RuleAction; hours?: number; severity?: string; reason: string }[];
    foodRules: { nutrient: string; food: string; hours: number; reason: string }[];
    drugRules: { drug: string; nutrient: string; action: RuleAction; hours?: number; minAmount?: number; reason: string }[];
    conditionRules: { condition: string; nutrient: string; action: RuleAction; minAmount?: number; reason: string }[];
    allergyRules: { allergy: string; nutrient?: string; productTag?: string; action: RuleAction; reason?: string }[];
    medicationLabels: Map<string, string>;
    conditionLabels: Map<string, string>;
  };
  timing: {
    slots: { id: string; label: string; shiftLabel: string; withMeal: boolean; order: number }[];
    onceSlot: string;
    nutrients: Record<string, { withFood?: boolean; preferred: string[]; avoid?: string[]; isolate?: boolean; splitAbove?: number; followProduct?: boolean; tip?: string }>;
  };
  products: Product[];
  vendors: { id: string; name: string; scopes: Scope[]; searchUrl: string }[];
  overseasNotice: string[];
}

export const evidenceRank: Record<Evidence, number> = { limited: 1, moderate: 2, mfds: 3 };

export function loadData(): EngineData {
  const i = interactionsJson as unknown as EngineData["interactions"] & {
    inputOptions: { medications: { id: string; label: string }[]; conditions: { id: string; label: string }[] };
  };
  return {
    nutrients: new Map((nutrientsJson.nutrients as unknown as Nutrient[]).map((n) => [n.id, n])),
    groups: new Map((nutrientsJson.groups as NutrientGroup[]).map((g) => [g.id, g])),
    symptoms: new Map((symptomsJson.symptoms as unknown as Symptom[]).map((s) => [s.id, s])),
    emergencies: symptomsJson.emergency,
    envRules: envJson.rules as unknown as EnvRule[],
    interactions: {
      globalRules: i.globalRules,
      nutrientPairs: i.nutrientPairs,
      foodRules: i.foodRules,
      drugRules: i.drugRules,
      conditionRules: i.conditionRules,
      allergyRules: i.allergyRules,
      medicationLabels: new Map(i.inputOptions.medications.map((m) => [m.id, m.label])),
      conditionLabels: new Map(i.inputOptions.conditions.map((c) => [c.id, c.label])),
    },
    timing: {
      slots: timingJson.slots,
      onceSlot: timingJson.defaults.onceMode.slot,
      nutrients: timingJson.nutrients as EngineData["timing"]["nutrients"],
    },
    products: productsJson.products as unknown as Product[],
    vendors: vendorsJson.vendors as EngineData["vendors"],
    overseasNotice: vendorsJson.overseasNotice,
  };
}

export const data = loadData();

/** 영양소·그룹 이름 */
export function nameOf(d: EngineData, id: string): string {
  return d.nutrients.get(id)?.nameKo ?? d.groups.get(id)?.nameKo ?? id;
}
