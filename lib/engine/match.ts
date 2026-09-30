import type { EngineData } from "./data";
import { rdaOf, violations, type SafetyProfile } from "./safety";
import { tierRank } from "./score";
import type { Preferences, Product, Sex, Target, Tier, Unmet } from "./types";

const DAYS_PER_MONTH = 30;
/** 종합·B군 제품이 '비타민B군'을 채웠다고 볼 최소 구성원 수 */
const GROUP_MIN_MEMBERS = 4;
/** 비타민·미네랄은 권장량의 이 비율 이상이어야 '채웠다'고 봄 (나머지는 식사로 섭취한다고 가정) */
const MIN_RDA_RATIO = 0.35;

export function monthlyCost(p: Product): number {
  return Math.round((p.priceKRW / (p.packageUnits / p.servingUnits)) * DAYS_PER_MONTH);
}

export function packagesFor(p: Product, months: number): number {
  return Math.ceil((months * DAYS_PER_MONTH * p.servingUnits) / p.packageUnits);
}

export function pillsOf(p: Product): number {
  return p.pillSize ? p.servingUnits : 0;
}

/** 제품이 목표 영양소(또는 그룹)를 의미 있는 양으로 채우는지 */
export function covers(d: EngineData, p: Product, targetId: string, sex: Sex): boolean {
  const group = d.groups.get(targetId);
  if (group) {
    const hits = group.members.filter((m) => {
      const n = d.nutrients.get(m);
      const c = p.contents.find((x) => x.id === m);
      const rda = n && rdaOf(n, sex);
      return c && rda && c.amount >= rda;
    });
    return hits.length >= GROUP_MIN_MEMBERS;
  }
  const n = d.nutrients.get(targetId);
  const c = p.contents.find((x) => x.id === targetId);
  if (!n || !c) return false;
  if (n.mfdsRange) return c.amount >= n.mfdsRange[0];
  const rda = rdaOf(n, sex);
  return rda ? c.amount >= rda * MIN_RDA_RATIO : c.amount > 0;
}

/** 사용자 선호·안전 조건으로 후보 제품 거르기. 통과하면 null, 아니면 사유 */
export function rejectReason(
  d: EngineData,
  p: Product,
  prefs: Preferences,
  sex: Sex,
  safety: SafetyProfile,
  requireVegan: boolean,
): string | null {
  if (prefs.scope !== "all" && p.scope !== prefs.scope) return "scope";
  if (prefs.forms.length > 0 && !prefs.forms.includes(p.form)) return "form";
  if (prefs.pillSize === "no_pills" && p.pillSize) return "pill";
  if (prefs.pillSize === "small_only" && p.pillSize && p.pillSize !== "small") return "pill";
  if (p.sex && p.sex !== sex) return "sex";
  if (p.tags.includes("high_dose") && !prefs.includeHighDose) return "high_dose";
  if (requireVegan && !p.tags.includes("vegan")) return "vegan";
  if (p.tags.some((t) => safety.excludedTags.has(t))) return "allergy";
  if (pillsOf(p) > prefs.maxPillsPerDay) return "pill_limit";
  if (violations(d, [p], safety).length > 0) return "safety";
  return null;
}

export interface MatchResult {
  selected: { product: Product; covers: string[]; tier: Tier }[];
  unmet: Unmet[];
}

const tierOrder: Tier[] = ["core", "recommended", "optional"];

export function match(
  d: EngineData,
  targets: Target[],
  prefs: Preferences,
  sex: Sex,
  safety: SafetyProfile,
  opts: { requireVegan: boolean; preferMultivitamin: boolean },
): MatchResult {
  const all = d.products.filter((p) => rejectReason(d, p, prefs, sex, safety, false) !== "scope");
  const candidates = all.filter((p) => rejectReason(d, p, prefs, sex, safety, opts.requireVegan) === null);
  const byTarget = new Map(targets.map((t) => [t.id, t]));

  const chosen: Product[] = [];
  const covered = new Set<string>();
  const coverOf = (p: Product) => targets.filter((t) => covers(d, p, t.id, sex)).map((t) => t.id);

  const spend = () => chosen.reduce((s, p) => s + monthlyCost(p), 0);
  const pills = () => chosen.reduce((s, p) => s + pillsOf(p), 0);
  const fits = (p: Product) =>
    spend() + monthlyCost(p) <= prefs.monthlyBudget &&
    pills() + pillsOf(p) <= prefs.maxPillsPerDay &&
    violations(d, [...chosen, p], safety).length === 0;

  // 등급 순서대로(핵심 → 권장 → 선택) 가성비 좋은 제품부터 채운다
  for (const phase of tierOrder) {
    for (;;) {
      let best: { p: Product; eff: number } | null = null;
      for (const p of candidates) {
        if (chosen.includes(p)) continue;
        const newly = coverOf(p).filter((id) => !covered.has(id));
        const phaseValue = newly
          .map((id) => byTarget.get(id)!)
          .filter((t) => t.tier === phase)
          .reduce((s, t) => s + t.score, 0);
        if (phaseValue === 0 || !fits(p)) continue;
        const bonusValue = newly.reduce((s, id) => s + byTarget.get(id)!.score * 0.3, 0);
        let value = phaseValue + bonusValue;
        if (opts.preferMultivitamin && p.type === "multi") value *= 1.3;
        const eff = value / (1 + monthlyCost(p) / 10000 + pillsOf(p) * 0.3);
        if (!best || eff > best.eff) best = { p, eff };
      }
      if (!best) break;
      chosen.push(best.p);
      coverOf(best.p).forEach((id) => covered.add(id));
    }
  }

  // 다른 제품이 이미 채우는 목표만 가진 제품은 제거 (예: 루테인 + 루테인오메가3)
  for (let i = chosen.length - 1; i >= 0; i--) {
    const others = chosen.filter((_, j) => j !== i);
    const otherCover = new Set(others.flatMap(coverOf));
    if (coverOf(chosen[i]).every((id) => otherCover.has(id))) chosen.splice(i, 1);
  }

  const finalCover = new Set(chosen.flatMap(coverOf));
  const selected = chosen.map((p) => {
    const ids = coverOf(p);
    const tier = ids.map((id) => byTarget.get(id)!.tier).sort((a, b) => tierRank[b] - tierRank[a])[0] ?? "optional";
    return { product: p, covers: ids, tier };
  });

  const unmet: Unmet[] = targets
    .filter((t) => !finalCover.has(t.id))
    .map((t) => {
      const able = all.filter((p) => covers(d, p, t.id, sex));
      const passing = able.filter((p) => rejectReason(d, p, prefs, sex, safety, opts.requireVegan) === null);
      let reason: Unmet["reason"];
      let message: string;
      if (able.length === 0 || passing.length === 0) {
        const bySafety = able.some((p) => rejectReason(d, p, prefs, sex, safety, opts.requireVegan) === "safety");
        reason = bySafety ? "safety_limit" : "no_product";
        message = bySafety
          ? "안전 기준(상한·복용 중인 약·질환) 때문에 추천할 수 있는 제품이 없어요."
          : prefs.scope === "overseas"
            ? "선택한 조건(해외직구·제형·알약 크기 등)에 맞는 제품이 없어요. 국내 제품까지 범위를 넓혀보세요."
            : "선택한 조건(제형·알약 크기·알레르기 등)에 맞는 제품이 없어요.";
      } else if (passing.every((p) => pills() + pillsOf(p) > prefs.maxPillsPerDay)) {
        reason = "pill_limit";
        message = "하루 최대 알약 수를 넘어서 뺐어요. 알약 수를 늘리거나 분말·구미 제형을 허용해보세요.";
      } else if (passing.every((p) => violations(d, [...chosen, p], safety).length > 0)) {
        reason = "safety_limit";
        message = "다른 제품과 합치면 상한을 넘어서 뺐어요.";
      } else {
        reason = "budget";
        message = "예산을 넘어서 뺐어요. 예산을 늘리면 추가할 수 있어요.";
      }
      return { nutrientId: t.id, nameKo: t.nameKo, tier: t.tier, reason, message };
    });

  return { selected, unmet };
}
