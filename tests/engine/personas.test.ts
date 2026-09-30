import { describe, expect, test } from "vitest";
import { recommend } from "@/lib/engine";
import { personas } from "./fixtures";
import { expectInvariants } from "./invariants";

const ids = (r: ReturnType<typeof recommend>) => r.items.map((i) => i.product.id);
const covered = (r: ReturnType<typeof recommend>) => new Set(r.items.flatMap((i) => i.covers));

describe("페르소나 (PRD §3)", () => {
  test("민수: 모니터 장시간 개발자 — 눈 영양소 핵심, 마그네슘은 근거 제한으로 최대 '권장', 손목은 진료 안내", () => {
    const r = recommend(personas.minsu);
    expectInvariants(personas.minsu, r);
    expect(r.status).toBe("ok");

    const c = covered(r);
    expect(c.has("lutein") || c.has("astaxanthin")).toBe(true);
    expect(c.has("vitamin_d")).toBe(true);

    const mg = r.targets.find((t) => t.id === "magnesium")!;
    expect(mg.evidence).toBe("limited");
    expect(mg.tier).toBe("recommended");

    expect(r.redFlags.map((f) => f.symptomId)).toContain("wrist_pain");
    expect(r.notes.some((n) => n.includes("손목 통증"))).toBe(true);

    // '한 번에' 모드 — 충돌이 없으면 슬롯 1개
    expect(r.schedule.slots).toHaveLength(1);
  });

  test("지영: 교대근무 간호사 — 유산균 핵심, 설사 때문에 마그네슘 제외, 교대근무 라벨, 작은 알약만", () => {
    const r = recommend(personas.jiyoung);
    expectInvariants(personas.jiyoung, r);

    const c = covered(r);
    expect(c.has("probiotics")).toBe(true);
    expect(c.has("vitamin_d")).toBe(true);
    expect(r.targets.map((t) => t.id)).not.toContain("magnesium");
    expect(r.excluded.map((e) => e.nutrientId)).toContain("magnesium");

    for (const i of r.items) expect([null, "small"]).toContain(i.product.pillSize);
    expect(r.schedule.slots.every((s) => !s.label.includes("아침") && !s.label.includes("점심"))).toBe(true);
    expect(r.notes.some((n) => n.includes("부종"))).toBe(true);
  });

  test("현우: 혈압약 복용 영업직 — 홍삼은 상담 대상으로 제외, 분말·액상만", () => {
    const r = recommend(personas.hyunwoo);
    expectInvariants(personas.hyunwoo, r);

    expect(r.excluded.find((e) => e.nutrientId === "red_ginseng")?.action).toBe("consult");
    for (const i of r.items) expect(["powder", "liquid"]).toContain(i.product.form);
    expect(covered(r).has("vitamin_b_complex")).toBe(true);
  });

  test("수아: 대학생 — 월 2만원 이하, 구미·츄어블만, 채소 부족으로 종합비타민 선호", () => {
    const r = recommend(personas.sua);
    expectInvariants(personas.sua, r);

    expect(r.cost.monthly).toBeLessThanOrEqual(20000);
    for (const i of r.items) expect(["gummy", "chewable"]).toContain(i.product.form);
    expect(r.items.some((i) => i.product.type === "multi")).toBe(true);
    expect(ids(r).length).toBeGreaterThan(0);
  });
});
