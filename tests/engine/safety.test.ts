import { describe, expect, test } from "vitest";
import { recommend } from "@/lib/engine";
import { makeInput } from "./fixtures";
import { expectInvariants } from "./invariants";

const run = (input: ReturnType<typeof makeInput>) => {
  const r = recommend(input);
  expectInvariants(input, r);
  return r;
};
const contains = (r: ReturnType<typeof recommend>, nutrient: string) => r.items.some((i) => i.product.contents.some((c) => c.id === nutrient));

describe("응급·전역 규칙", () => {
  test("응급 증상을 체크하면 추천하지 않고 119 안내", () => {
    const r = run(makeInput({ emergencies: ["chest_pain"], symptoms: [{ id: "chronic_fatigue", frequency: "daily", duration: "1m" }] }));
    expect(r.status).toBe("emergency");
    expect(r.messages[0]).toContain("119");
  });

  test("증상 레드플래그가 응급이면 추천 중단 (한쪽 손 저림)", () => {
    const r = run(makeInput({ symptoms: [{ id: "numb_hands", frequency: "daily", duration: "lt1w", redFlagAnswers: { 0: true } }] }));
    expect(r.status).toBe("emergency");
  });

  test("임신 중이면 상담 안내만", () => {
    const r = run(makeInput({ profile: { sex: "female", pregnancy: "pregnant" }, symptoms: [{ id: "constipation", frequency: "often", duration: "1m" }] }));
    expect(r.status).toBe("consult_only");
  });

  test("미성년자는 상담 안내만", () => {
    expect(run(makeInput({ profile: { age: 17 } })).status).toBe("consult_only");
  });

  test("기간 조건 레드플래그: 3개월 이상 손목 통증 → 진료 권유", () => {
    const r = run(makeInput({ symptoms: [{ id: "wrist_pain", frequency: "often", duration: "3m" }] }));
    expect(r.redFlags[0]).toMatchObject({ symptomId: "wrist_pain", action: "consult" });
  });
});

describe("약·질환·알레르기", () => {
  test("항응고제 + 안구건조 → 오메가3 상담 대상, 제품에서도 빠짐", () => {
    const r = run(makeInput({ profile: { medications: ["anticoagulant"] }, symptoms: [{ id: "dry_eye", frequency: "daily", duration: "1m" }] }));
    expect(r.excluded.find((e) => e.nutrientId === "omega3")?.action).toBe("consult");
    expect(contains(r, "omega3")).toBe(false);
  });

  test("신장질환 + 근육경련 → 마그네슘은 종합비타민 미량까지 포함해 전혀 없음", () => {
    const r = run(makeInput({ profile: { conditions: ["kidney_disease"] }, symptoms: [{ id: "muscle_cramp", frequency: "daily", duration: "1m" }], preferences: { scope: "all" } }));
    expect(contains(r, "magnesium")).toBe(false);
  });

  test("갑각류 알레르기 + 관절 → 글루코사민 대신 MSM", () => {
    const r = run(makeInput({ profile: { allergies: ["shellfish"] }, symptoms: [{ id: "joint_stiffness", frequency: "daily", duration: "1m" }] }));
    expect(contains(r, "glucosamine")).toBe(false);
    expect(contains(r, "msm")).toBe(true);
  });

  test("갑상선약 + 유제품 부족 → 칼슘은 아침 공복 약과 4시간 이상 떨어진 시간", () => {
    const input = makeInput({ profile: { medications: ["thyroid"] }, lifestyle: { dairy: "low" }, preferences: { mode: "split" } });
    const r = run(input);
    expect(contains(r, "calcium")).toBe(true);
    expect(r.schedule.notes.some((n) => n.includes("갑상선약"))).toBe(true);
  });

  test("비건 → 비건 제품만, 비타민B12 포함", () => {
    const r = run(makeInput({ profile: { diet: "vegan" }, preferences: { scope: "all" } }));
    for (const i of r.items) expect(i.product.tags).toContain("vegan");
    expect(r.items.some((i) => i.covers.includes("vitamin_b12"))).toBe(true);
  });

  test("신장결석 + 감기 → 비타민C 총량 500mg 미만", () => {
    const r = run(makeInput({ profile: { conditions: ["kidney_stone"] }, symptoms: [{ id: "frequent_colds", frequency: "often", duration: "1m" }], lifestyle: { smoking: true } }));
    const vc = r.totals.find((t) => t.nutrientId === "vitamin_c");
    expect(vc?.amount ?? 0).toBeLessThan(500);
  });
});

describe("선호 조건", () => {
  test("알약 불가 → 알약 제품 없음", () => {
    const r = run(makeInput({ symptoms: [{ id: "eye_strain", frequency: "daily", duration: "1m" }], preferences: { pillSize: "no_pills", scope: "all" } }));
    for (const i of r.items) expect(i.product.pillSize).toBeNull();
  });

  test("해외직구만 → 해외 제품만, 해외직구 안내 문구", () => {
    const r = run(makeInput({ symptoms: [{ id: "dry_eye", frequency: "daily", duration: "1m" }], preferences: { scope: "overseas" } }));
    expect(r.items.length).toBeGreaterThan(0);
    for (const i of r.items) expect(i.product.scope).toBe("overseas");
    expect(r.messages.some((m) => m.includes("해외직구"))).toBe(true);
    expect(r.items[0].links.map((l) => l.vendorId)).toContain("iherb");
  });

  test("해외직구만 + 피로 → 홍삼은 해외 제품이 없어서 미충족 안내", () => {
    const r = run(makeInput({ symptoms: [{ id: "chronic_fatigue", frequency: "daily", duration: "1m", priority: true }], preferences: { scope: "overseas" } }));
    expect(r.unmet.find((u) => u.nutrientId === "red_ginseng")?.reason).toBe("no_product");
  });

  test("예산이 매우 적으면 예산 초과분을 미충족으로 표시", () => {
    const r = run(makeInput({
      symptoms: [
        { id: "dry_eye", frequency: "daily", duration: "1m" },
        { id: "frequent_diarrhea", frequency: "daily", duration: "1m" },
        { id: "joint_stiffness", frequency: "daily", duration: "1m" },
      ],
      preferences: { monthlyBudget: 5000 },
    }));
    expect(r.unmet.some((u) => u.reason === "budget")).toBe(true);
  });

  test("구매 링크는 검색어가 인코딩된 판매처 URL", () => {
    const r = run(makeInput({ symptoms: [{ id: "dry_eye", frequency: "daily", duration: "1m" }] }));
    const link = r.items[0].links.find((l) => l.vendorId === "coupang")!;
    expect(link.url).toMatch(/^https:\/\/www\.coupang\.com\/np\/search\?q=/);
    expect(decodeURIComponent(link.url.split("q=")[1])).toBe(r.items[0].product.searchKeyword);
  });

  test("기간에 맞는 통 수와 총비용", () => {
    const r = run(makeInput({ symptoms: [{ id: "dry_eye", frequency: "daily", duration: "1m" }], preferences: { durationMonths: 6 } }));
    for (const i of r.items) {
      expect(i.packages * i.product.packageUnits).toBeGreaterThanOrEqual(180 * i.product.servingUnits);
    }
    expect(r.cost.total).toBe(r.items.reduce((s, i) => s + i.packages * i.product.priceKRW, 0));
  });
});
