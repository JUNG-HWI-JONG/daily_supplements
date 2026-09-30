import { toFacts } from "./conditions";
import { data as defaultData, nameOf, type EngineData } from "./data";
import { match, monthlyCost, packagesFor, pillsOf } from "./match";
import { buildSafety, cautionsFor, globalCheck, totals } from "./safety";
import { buildSchedule } from "./schedule";
import { score } from "./score";
import type { Product, Recommendation, RecommendedItem, UserInput } from "./types";

export type * from "./types";

function linksFor(d: EngineData, p: Product): RecommendedItem["links"] {
  return d.vendors
    .filter((v) => v.scopes.includes(p.scope))
    .map((v) => ({ vendorId: v.id, name: v.name, url: v.searchUrl.replace("{query}", encodeURIComponent(p.searchKeyword)) }));
}

function empty(input: UserInput, status: Recommendation["status"], messages: string[], partial: Partial<Recommendation> = {}): Recommendation {
  return {
    status,
    messages,
    redFlags: [],
    targets: [],
    items: [],
    excluded: [],
    unmet: [],
    totals: [],
    schedule: { mode: "once", slots: [], notes: [] },
    cost: { monthly: 0, total: 0, daily: 0, budget: input.preferences.monthlyBudget },
    pillsPerDay: 0,
    tips: [],
    notes: [],
    ...partial,
  };
}

/**
 * 추천 엔진 진입점 (PRD §6). 순수 함수 — 브라우저·서버 어디서든 실행 가능.
 * 1 점수화 → 2 안전 필터 → 3 제품 매칭 → 4 상한 검증(매칭 중 수행) → 5 시간표
 */
export interface RecommendOptions {
  /** 사용자가 결과 화면에서 뺀 영양소 — 목표에서 제외하고 다시 조합 */
  skipTargets?: string[];
}

export function recommend(input: UserInput, opts: RecommendOptions = {}, d: EngineData = defaultData): Recommendation {
  const facts = toFacts(input);

  // 0. 응급 증상
  const emergencies = d.emergencies.filter((e) => input.emergencies.includes(e.id));
  if (emergencies.length > 0) {
    return empty(input, "emergency", emergencies.map((e) => `${e.text}: ${e.message}`));
  }

  // 1. 점수화 (증상 + 생활환경)
  const scored = score(d, input, facts);
  const emergencyFlags = scored.redFlags.filter((f) => f.action === "emergency");
  if (emergencyFlags.length > 0) {
    return empty(input, "emergency", emergencyFlags.map((f) => `${f.symptomLabel}: ${f.message}`), { redFlags: scored.redFlags });
  }

  // 2. 전역 규칙 (임신·수유, 미성년 등)
  const global = globalCheck(d, facts);
  if (global.consultOnly) {
    return empty(input, "consult_only", [global.consultOnly], { redFlags: scored.redFlags, tips: scored.tips, notes: scored.notes });
  }

  // 2. 안전 필터: 금기·상담 대상은 목표에서 제외 (양 기준 규칙은 상한으로만 적용)
  const safety = buildSafety(d, input, scored.excludeTags, scored.avoid);
  const blocked = new Set(safety.exclusions.filter((e) => e.minAmount == null).map((e) => e.nutrientId));
  const isBlocked = (id: string) => blocked.has(id) || (d.groups.get(id)?.members.every((m) => blocked.has(m)) ?? false);
  const skipped = new Set(opts.skipTargets ?? []);
  const targets = scored.targets.filter((t) => !isBlocked(t.id) && !skipped.has(t.id));

  // 3~4. 제품 매칭 (예산·알약 수·상한 검증 포함)
  const { selected, unmet } = match(d, targets, input.preferences, input.profile.sex, safety, {
    requireVegan: scored.requireVegan,
    preferMultivitamin: scored.preferMultivitamin,
  });
  const products = selected.map((s) => s.product);

  const byId = new Map(targets.map((t) => [t.id, t]));
  const items: RecommendedItem[] = selected.map((s) => ({
    product: s.product,
    tier: s.tier,
    covers: s.covers,
    reasons: [...new Set(s.covers.flatMap((id) => byId.get(id)!.reasons))],
    cautions: cautionsFor(d, s.product, safety),
    monthlyCost: monthlyCost(s.product),
    packages: packagesFor(s.product, input.preferences.durationMonths),
    links: linksFor(d, s.product),
  }));

  // 5. 시간표
  const schedule = buildSchedule(d, products, input.preferences.mode, input.lifestyle.shift, input.profile.sex, safety.drugSeparations);

  const monthly = items.reduce((s, i) => s + i.monthlyCost, 0);
  const total = items.reduce((s, i) => s + i.packages * i.product.priceKRW, 0);

  const messages = [...global.banners];
  if (products.some((p) => p.scope === "overseas")) messages.push(...d.overseasNotice);

  const excluded = safety.exclusions
    .filter((e) => scored.targets.some((t) => t.id === e.nutrientId))
    .map((e) => ({ ...e, nameKo: nameOf(d, e.nutrientId) }));

  return {
    status: "ok",
    messages,
    redFlags: scored.redFlags,
    targets,
    items,
    excluded,
    unmet,
    totals: totals(d, products),
    schedule,
    cost: { monthly, total, daily: Math.round(monthly / 30), budget: input.preferences.monthlyBudget },
    pillsPerDay: products.reduce((s, p) => s + pillsOf(p), 0),
    tips: scored.tips,
    notes: scored.notes,
  };
}
