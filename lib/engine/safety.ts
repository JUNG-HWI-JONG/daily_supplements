import { matches, type Facts } from "./conditions";
import { nameOf, type EngineData } from "./data";
import type { Avoid, ContentItem, Exclusion, Nutrient, NutrientTotal, Product, Sex, UserInput } from "./types";

export interface GlobalCheck {
  consultOnly: string | null;
  banners: string[];
}

export function globalCheck(d: EngineData, facts: Facts): GlobalCheck {
  let consultOnly: string | null = null;
  const banners: string[] = [];
  for (const r of d.interactions.globalRules) {
    if (!matches(r.when, facts)) continue;
    if (r.mode === "consult_only") consultOnly ??= r.message;
    else banners.push(r.message);
  }
  return { consultOnly, banners };
}

export interface Caution {
  nutrientId: string;
  minAmount?: number;
  text: string;
}

export interface DrugSeparation {
  drug: string;
  nutrientId: string;
  hours: number;
  reason: string;
}

export interface SafetyProfile {
  exclusions: Exclusion[];
  /** 영양소별 허용 최대 총량 (금기·상담 규칙에서 유도). 0이면 전혀 불가 */
  caps: Map<string, { cap: number; reason: string }>;
  excludedTags: Map<string, string>;
  cautions: Caution[];
  drugSeparations: DrugSeparation[];
}

/** 성별 기준 권장(충분)섭취량 — 상담 대상 영양소도 이 수준까지는 허용 */
export function rdaOf(n: Nutrient, sex: Sex): number | null {
  return n.kdri ? n.kdri[sex] : null;
}

export function buildSafety(
  d: EngineData,
  input: UserInput,
  extraExcludedTags: { tag: string; reason: string }[],
  avoid: Avoid[],
): SafetyProfile {
  const { medications, conditions, allergies, sex } = input.profile;
  const exclusions: Exclusion[] = [];
  const caps = new Map<string, { cap: number; reason: string }>();
  const excludedTags = new Map<string, string>();
  const cautions: Caution[] = [];
  const drugSeparations: DrugSeparation[] = [];

  const setCap = (nutrientId: string, cap: number, reason: string) => {
    const prev = caps.get(nutrientId);
    if (!prev || cap < prev.cap) caps.set(nutrientId, { cap, reason });
  };

  const applyRule = (rule: { nutrient: string; action: string; minAmount?: number; reason: string }, prefix: string) => {
    const reason = `${prefix}: ${rule.reason}`;
    if (rule.action === "exclude" || rule.action === "consult") {
      exclusions.push({ nutrientId: rule.nutrient, action: rule.action, minAmount: rule.minAmount, reason });
      if (rule.minAmount != null) {
        setCap(rule.nutrient, rule.minAmount - 1e-9, reason);
      } else if (rule.action === "consult") {
        // 상담 대상이라도 기본 영양 수준(권장섭취량)까지는 종합비타민 등으로 허용
        const n = d.nutrients.get(rule.nutrient);
        setCap(rule.nutrient, (n && rdaOf(n, sex)) ?? 0, reason);
      } else {
        setCap(rule.nutrient, 0, reason);
      }
    } else if (rule.action === "caution") {
      cautions.push({ nutrientId: rule.nutrient, minAmount: rule.minAmount, text: reason });
    }
  };

  for (const r of d.interactions.drugRules) {
    if (!medications.includes(r.drug)) continue;
    const label = d.interactions.medicationLabels.get(r.drug) ?? r.drug;
    if (r.action === "separate") drugSeparations.push({ drug: r.drug, nutrientId: r.nutrient, hours: r.hours ?? 2, reason: `${label}: ${r.reason}` });
    else applyRule(r, label);
  }
  for (const r of d.interactions.conditionRules) {
    if (!conditions.includes(r.condition)) continue;
    applyRule(r, d.interactions.conditionLabels.get(r.condition) ?? r.condition);
  }
  for (const r of d.interactions.allergyRules) {
    if (!allergies.includes(r.allergy)) continue;
    if (r.productTag) excludedTags.set(r.productTag, r.reason ?? "알레르기");
    if (r.nutrient) applyRule({ nutrient: r.nutrient, action: r.action, reason: r.reason ?? "알레르기" }, "알레르기");
  }
  for (const t of extraExcludedTags) excludedTags.set(t.tag, t.reason);
  for (const a of avoid) {
    exclusions.push({ nutrientId: a.id, action: "exclude", reason: a.reason });
    setCap(a.id, a.maxAmount, a.reason);
  }

  return { exclusions, caps, excludedTags, cautions, drugSeparations };
}

/** 영양소 1일 상한 (UL → 형태별 UL → 보수적 상한 순) */
export function limitOf(n: Nutrient, form?: string): number | null {
  if (form && n.ulByForm?.[form] != null) return n.ulByForm[form];
  return n.ul ?? n.safetyCap ?? null;
}

type LimitKey = string; // nutrientId 또는 nutrientId:form

/** 제품 조합의 성분별 총량 */
export function sumContents(products: Product[]): Map<LimitKey, { item: ContentItem; amount: number }> {
  const sums = new Map<LimitKey, { item: ContentItem; amount: number }>();
  for (const p of products) {
    for (const c of p.contents) {
      const k = c.form ? `${c.id}:${c.form}` : c.id;
      const prev = sums.get(k);
      sums.set(k, { item: c, amount: (prev?.amount ?? 0) + c.amount });
    }
  }
  return sums;
}

/** 조합이 상한·금기 상한을 모두 지키는지. 위반 사유 목록을 반환 (빈 배열 = 안전) */
export function violations(d: EngineData, products: Product[], safety: SafetyProfile): string[] {
  const out: string[] = [];
  const byNutrient = new Map<string, number>();
  for (const [k, { item, amount }] of sumContents(products)) {
    const n = d.nutrients.get(item.id);
    if (!n) continue;
    byNutrient.set(item.id, (byNutrient.get(item.id) ?? 0) + amount);
    const limit = limitOf(n, item.form);
    if (limit != null && amount > limit + 1e-9) out.push(`${n.nameKo} ${amount}${n.unit} > 상한 ${limit} (${k})`);
  }
  for (const [id, { cap }] of safety.caps) {
    const amount = byNutrient.get(id) ?? 0;
    if (amount > cap + 1e-9) out.push(`${nameOf(d, id)} ${amount} > 금기 상한 ${cap}`);
  }
  return out;
}

export function totals(d: EngineData, products: Product[]): NutrientTotal[] {
  const out: NutrientTotal[] = [];
  for (const [, { item, amount }] of sumContents(products)) {
    const n = d.nutrients.get(item.id);
    if (!n) continue;
    const label = item.form && n.ulByForm?.[item.form] != null ? `${n.nameKo} (${item.form})` : n.nameKo;
    out.push({ nutrientId: item.id, nameKo: label, amount: Math.round(amount * 100) / 100, unit: n.unit, limit: limitOf(n, item.form) });
  }
  return out;
}

export function cautionsFor(d: EngineData, product: Product, safety: SafetyProfile): string[] {
  const out: string[] = [];
  for (const c of safety.cautions) {
    const content = product.contents.find((x) => x.id === c.nutrientId);
    if (content && (c.minAmount == null || content.amount >= c.minAmount)) out.push(c.text);
  }
  for (const c of product.contents) {
    const n = d.nutrients.get(c.id);
    // 단일·복합 제품의 주성분 주의사항만 (종합비타민의 미량 성분까지 나열하면 소음)
    if (n && product.type !== "multi") out.push(...n.cautions);
  }
  return [...new Set(out)];
}
