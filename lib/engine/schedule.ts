import type { EngineData } from "./data";
import { rdaOf, type DrugSeparation } from "./safety";
import type { Product, Schedule, ScheduleMode, Sex, Shift } from "./types";

/** 슬롯 간 시간 거리 계산용 기준 시각 (교대근무자는 '기상 후 경과 시간'으로 해석) */
const SLOT_HOUR: Record<string, number> = { wake: 7, breakfast: 8, lunch: 12.5, dinner: 19, bedtime: 23 };
const MEAL_SLOTS = ["breakfast", "lunch", "dinner"];
/** 약 복용 시점 가정 (갑상선약은 아침 공복이 표준) */
const DRUG_SLOT: Record<string, string> = { thyroid: "wake" };
const SOFT_CONFLICT_PENALTY = 2;
const SAME_SLOT_BONUS = 1;

interface Ctx {
  d: EngineData;
  sex: Sex;
  drugSeparations: DrugSeparation[];
}

function meaningful(ctx: Ctx, nutrientId: string, amount: number): boolean {
  const n = ctx.d.nutrients.get(nutrientId);
  const rda = n && rdaOf(n, ctx.sex);
  return rda ? amount >= rda * 0.5 : amount > 0;
}

/** 두 제품 사이의 분리 규칙: hard(같이 먹으면 안 됨) / soft(가능하면 분리) / null */
function conflict(ctx: Ctx, a: Product, b: Product): { level: "hard" | "soft"; hours: number; reason: string } | null {
  let found: { level: "hard" | "soft"; hours: number; reason: string } | null = null;
  for (const rule of ctx.d.interactions.nutrientPairs) {
    if (rule.action !== "separate") continue;
    const has = (p: Product, id: string) => (id === "*" ? p.contents.length > 0 : p.contents.some((c) => c.id === id && meaningful(ctx, c.id, c.amount)));
    const hit = (has(a, rule.a) && has(b, rule.b)) || (has(a, rule.b) && has(b, rule.a));
    if (!hit) continue;
    const level = rule.severity === "low" ? "soft" : "hard";
    if (!found || (level === "hard" && found.level === "soft")) found = { level, hours: rule.hours ?? 2, reason: rule.reason };
  }
  return found;
}

function distance(s1: string, s2: string): number {
  return Math.abs(SLOT_HOUR[s1] - SLOT_HOUR[s2]);
}

/** 제품의 슬롯 선호 점수. -Infinity = 금지 */
function slotScore(ctx: Ctx, p: Product, slot: string): number {
  let score = 0;
  for (const c of p.contents) {
    const rule = ctx.d.timing.nutrients[c.id];
    if (!rule) continue;
    if (rule.avoid?.includes(slot)) return -Infinity;
    const idx = rule.preferred.indexOf(slot);
    if (idx >= 0) score += 3 - Math.min(idx, 2);
  }
  for (const sep of ctx.drugSeparations) {
    const drugSlot = DRUG_SLOT[sep.drug];
    if (drugSlot && p.contents.some((c) => c.id === sep.nutrientId) && distance(slot, drugSlot) < sep.hours) return -Infinity;
  }
  return score;
}

function isIsolated(ctx: Ctx, p: Product): boolean {
  return p.contents.some((c) => ctx.d.timing.nutrients[c.id]?.isolate);
}

type Placement = Map<string, { p: Product; units: number }[]>;

function canPlace(ctx: Ctx, placement: Placement, p: Product, slot: string): { ok: boolean; penalty: number } {
  if (slotScore(ctx, p, slot) === -Infinity) return { ok: false, penalty: 0 };
  let penalty = 0;
  for (const [otherSlot, items] of placement) {
    for (const { p: q } of items) {
      if (q === p) continue;
      const c = conflict(ctx, p, q);
      if (!c) continue;
      if (distance(slot, otherSlot) >= c.hours) continue;
      if (c.level === "hard") return { ok: false, penalty: 0 };
      penalty += SOFT_CONFLICT_PENALTY;
    }
  }
  return { ok: true, penalty };
}

function place(placement: Placement, p: Product, slot: string, units: number) {
  const items = placement.get(slot) ?? [];
  items.push({ p, units });
  placement.set(slot, items);
}

function placeSplit(ctx: Ctx, placement: Placement, products: Product[], notes: string[]) {
  const slots = ctx.d.timing.slots.map((s) => s.id);
  const allowedCount = (p: Product) => slots.filter((s) => slotScore(ctx, p, s) > -Infinity).length;
  const ordered = [...products].sort((a, b) => allowedCount(a) - allowedCount(b));

  for (const p of ordered) {
    const calcium = p.contents.find((c) => c.id === "calcium");
    const splitAbove = ctx.d.timing.nutrients.calcium?.splitAbove;
    const shouldSplit = calcium && splitAbove && calcium.amount > splitAbove && p.servingUnits >= 2;

    const rank = (slot: string) => {
      const { ok, penalty } = canPlace(ctx, placement, p, slot);
      if (!ok) return -Infinity;
      return slotScore(ctx, p, slot) - penalty + (placement.has(slot) ? SAME_SLOT_BONUS : 0);
    };
    const ranked = slots.map((s) => ({ s, r: rank(s) })).filter((x) => x.r > -Infinity).sort((a, b) => b.r - a.r);

    if (ranked.length === 0) {
      const fallback = slots.map((s) => ({ s, r: slotScore(ctx, p, s) })).sort((a, b) => b.r - a.r)[0].s;
      place(placement, p, fallback, p.servingUnits);
      notes.push(`${p.name}: 다른 영양제와 간격을 두기 어려워요. 약사와 복용 시간을 상담해보세요.`);
      continue;
    }
    if (shouldSplit && ranked.length >= 2) {
      const first = Math.ceil(p.servingUnits / 2);
      place(placement, p, ranked[0].s, first);
      place(placement, p, ranked[1].s, p.servingUnits - first);
      notes.push(`${p.name}: 칼슘은 한 번에 500mg 이하일 때 흡수가 잘 돼서 두 번에 나눴어요.`);
    } else {
      place(placement, p, ranked[0].s, p.servingUnits);
    }
  }
}

export function buildSchedule(
  d: EngineData,
  products: Product[],
  mode: ScheduleMode,
  shift: Shift,
  sex: Sex,
  drugSeparations: DrugSeparation[],
): Schedule {
  const ctx: Ctx = { d, sex, drugSeparations };
  const notes: string[] = [];
  const placement: Placement = new Map();

  if (mode !== "split" && products.length > 0) {
    // 한 번에: 가장 많은 제품을 함께 먹을 수 있는 식사 슬롯을 고르고, 남는 것만 따로
    let best: { slot: string; placed: Product[]; score: number } | null = null;
    for (const slot of MEAL_SLOTS) {
      const trial: Placement = new Map();
      const placed: Product[] = [];
      for (const p of products) {
        if (isIsolated(ctx, p)) continue;
        const fit = canPlace(ctx, trial, p, slot);
        if (fit.ok && fit.penalty === 0) {
          place(trial, p, slot, p.servingUnits);
          placed.push(p);
        }
      }
      const score = placed.reduce((s, p) => s + slotScore(ctx, p, slot), 0) + (slot === d.timing.onceSlot ? 0.5 : 0);
      if (!best || placed.length > best.placed.length || (placed.length === best.placed.length && score > best.score)) {
        best = { slot, placed, score };
      }
    }
    const rest = products.filter((p) => !best!.placed.includes(p));
    if (mode === "once" || rest.length === 0) {
      best!.placed.forEach((p) => place(placement, p, best!.slot, p.servingUnits));
      if (rest.length > 0) {
        notes.push(`한 번에 드시도록 맞췄지만 ${rest.map((p) => p.name).join(", ")}은(는) 함께 먹으면 흡수를 방해하거나 먹는 시간이 따로 있어서 분리했어요.`);
        placeSplit(ctx, placement, rest, notes);
      }
    }
  }
  if (placement.size === 0 && products.length > 0) placeSplit(ctx, placement, products, notes);

  // 안내 문구
  const present = new Set(products.flatMap((p) => p.contents.map((c) => c.id)));
  for (const p of products) {
    if (p.type === "multi") continue;
    for (const c of p.contents) {
      const tip = d.timing.nutrients[c.id]?.tip;
      if (tip) notes.push(`${d.nutrients.get(c.id)?.nameKo}: ${tip}`);
    }
  }
  for (const f of d.interactions.foodRules) {
    if (products.some((p) => p.type !== "multi" && p.contents.some((c) => c.id === f.nutrient))) {
      notes.push(`${d.nutrients.get(f.nutrient)?.nameKo}은(는) ${f.food}와 ${f.hours}시간 이상 간격을 두세요. ${f.reason}`);
    }
  }
  for (const sep of drugSeparations) {
    if (!present.has(sep.nutrientId)) continue;
    const where = DRUG_SLOT[sep.drug] ? "(시간표에 반영했어요)" : "(약 먹는 시간 기준으로 조정하세요)";
    notes.push(`${sep.reason} → ${d.nutrients.get(sep.nutrientId)?.nameKo}은(는) 약과 ${sep.hours}시간 이상 간격 ${where}`);
  }

  const useShiftLabel = shift !== "day";
  const slots = d.timing.slots
    .filter((s) => placement.has(s.id))
    .map((s) => ({
      slotId: s.id,
      label: useShiftLabel ? s.shiftLabel : s.label,
      items: placement.get(s.id)!.map(({ p, units }) => ({ productId: p.id, name: p.name, units })),
    }));

  return { mode: slots.length <= 1 ? "once" : "split", slots, notes: [...new Set(notes)] };
}
