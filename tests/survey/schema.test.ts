import { describe, expect, test } from "vitest";
import { recommend } from "@/lib/engine";
import { data } from "@/lib/engine/data";
import { matches, toFacts } from "@/lib/engine/conditions";
import { toUserInput, validateStep } from "@/lib/survey/schema";
import { initialDraft, type SurveyDraft } from "@/lib/survey/store";

const filled: SurveyDraft = {
  ...initialDraft,
  profile: { ...initialDraft.profile, sex: "female", age: 30, medications: [], conditions: [] },
  lifestyle: { ...initialDraft.lifestyle, job: "office", shift: "day" },
  emergencies: [],
};

describe("설문 검증", () => {
  test("빈 설문은 1단계에서 성별·나이·약·질환을 요구", () => {
    expect(Object.keys(validateStep(0, initialDraft)).sort()).toEqual(["age", "conditions", "medications", "sex"]);
  });

  test("2단계는 직업·근무형태, 3단계는 응급 증상 체크 여부를 요구", () => {
    expect(Object.keys(validateStep(1, initialDraft)).sort()).toEqual(["job", "shift"]);
    expect(Object.keys(validateStep(2, initialDraft))).toEqual(["emergencies"]);
  });

  test("예산이 너무 적으면 오류", () => {
    expect(validateStep(3, { ...filled, preferences: { ...filled.preferences, monthlyBudget: 1000 } })).toHaveProperty("monthlyBudget");
  });

  test("미완성 설문은 엔진 입력으로 바뀌지 않음", () => {
    expect(toUserInput(initialDraft)).toBeNull();
  });

  test("남성은 임신 항목이 남아 있어도 '해당 없음'으로 처리", () => {
    const input = toUserInput({ ...filled, profile: { ...filled.profile, sex: "male", pregnancy: "pregnant" } });
    expect(input?.profile.pregnancy).toBe("none");
  });
});

describe("선택 질문 기본값", () => {
  test("선택 질문을 건너뛰면 어떤 생활환경 규칙도 발동하지 않음", () => {
    const input = toUserInput(filled)!;
    const fired = data.envRules.filter((r) => matches(r.when, toFacts(input))).map((r) => r.id);
    expect(fired).toEqual([]);
  });

  test("최소 입력만으로도 엔진이 정상 동작", () => {
    const r = recommend(toUserInput(filled)!);
    expect(r.status).toBe("ok");
    expect(r.items).toEqual([]);
  });
});
