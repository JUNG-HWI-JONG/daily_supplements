import { expect } from "vitest";
import { data } from "@/lib/engine/data";
import type { Recommendation, UserInput } from "@/lib/engine";
import { rejectReason } from "@/lib/engine/match";
import { buildSafety, violations } from "@/lib/engine/safety";
import { score } from "@/lib/engine/score";
import { toFacts } from "@/lib/engine/conditions";

const SLOT_HOUR: Record<string, number> = { wake: 7, breakfast: 8, lunch: 12.5, dinner: 19, bedtime: 23 };

/** 어떤 입력이든 반드시 지켜야 하는 안전·제약 조건 (PRD §10: 안전 위반 0건) */
export function expectInvariants(input: UserInput, r: Recommendation) {
  if (r.status !== "ok") {
    expect(r.items).toHaveLength(0);
    return;
  }
  const products = r.items.map((i) => i.product);
  const scored = score(data, input, toFacts(input));
  const safety = buildSafety(data, input, scored.excludeTags, scored.avoid);

  // 상한(UL)·금기 상한
  expect(violations(data, products, safety)).toEqual([]);
  for (const t of r.totals) if (t.limit != null) expect(t.amount).toBeLessThanOrEqual(t.limit);

  // 예산·알약 수
  expect(r.cost.monthly).toBeLessThanOrEqual(input.preferences.monthlyBudget);
  expect(r.pillsPerDay).toBeLessThanOrEqual(input.preferences.maxPillsPerDay);

  // 제품이 사용자 조건(범위·제형·알약 크기·알레르기·비건·성별·고함량)을 지키는지
  for (const p of products) expect(rejectReason(data, p, input.preferences, input.profile.sex, safety, scored.requireVegan)).toBeNull();

  // 금기·상담 대상 영양소는 추천 목표에 없어야 함
  const blocked = safety.exclusions.filter((e) => e.minAmount == null).map((e) => e.nutrientId);
  for (const t of r.targets) expect(blocked).not.toContain(t.id);

  // 시간표: 모든 제품이 정확한 개수만큼, 금지 슬롯이 아닌 곳에
  const placed = new Map<string, { slot: string; units: number }[]>();
  for (const s of r.schedule.slots) for (const it of s.items) placed.set(it.productId, [...(placed.get(it.productId) ?? []), { slot: s.slotId, units: it.units }]);
  for (const p of products) {
    const where = placed.get(p.id) ?? [];
    expect(where.reduce((s, w) => s + w.units, 0)).toBe(p.servingUnits);
    for (const w of where) {
      for (const c of p.contents) expect(data.timing.nutrients[c.id]?.avoid ?? []).not.toContain(w.slot);
    }
  }

  // 갑상선약(아침 공복) 복용 시 칼슘·철분·마그네슘은 4시간 이상 간격
  if (input.profile.medications.includes("thyroid")) {
    for (const p of products) {
      if (!p.contents.some((c) => ["calcium", "iron", "magnesium"].includes(c.id))) continue;
      for (const w of placed.get(p.id) ?? []) expect(Math.abs(SLOT_HOUR[w.slot] - SLOT_HOUR.wake)).toBeGreaterThanOrEqual(4);
    }
  }
}
