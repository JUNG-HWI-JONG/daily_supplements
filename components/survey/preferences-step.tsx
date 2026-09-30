"use client";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { FieldErrors } from "@/lib/survey/schema";
import { budgetOptions, durationMonthOptions, formOptions, modeOptions, pillSizeOptions, scopeOptions } from "@/lib/survey/options";
import { useSurvey } from "@/lib/survey/store";
import type { Form } from "@/lib/engine";
import { MultiChoice, Question, SingleChoice } from "./choice";

export function PreferencesStep({ errors }: { errors: FieldErrors }) {
  const p = useSurvey((s) => s.preferences);
  const set = useSurvey((s) => s.setPreferences);
  const isPreset = budgetOptions.some((o) => o.value === p.monthlyBudget);

  return (
    <div className="space-y-8">
      <Question id="durationMonths" label="얼마나 드실 건가요?" hint="기간에 맞춰 몇 통을 사야 하는지 계산해드려요.">
        <SingleChoice options={durationMonthOptions} value={p.durationMonths} onChange={(durationMonths) => set({ durationMonths })} columns={4} />
      </Question>

      <Question id="monthlyBudget" label="한 달 예산" error={errors.monthlyBudget}>
        <SingleChoice options={budgetOptions} value={isPreset ? p.monthlyBudget : null} onChange={(monthlyBudget) => set({ monthlyBudget })} />
        <label className="flex items-center gap-2 pt-1 text-sm">
          <span className="text-muted-foreground">직접 입력</span>
          <Input
            type="number"
            inputMode="numeric"
            step={1000}
            min={5000}
            className="h-11 w-32 text-base"
            value={isPreset ? "" : p.monthlyBudget || ""}
            placeholder="예: 25000"
            aria-invalid={Boolean(errors.monthlyBudget)}
            onChange={(e) => set({ monthlyBudget: Number(e.target.value) })}
          />
          <span className="text-muted-foreground">원</span>
        </label>
      </Question>

      <Question id="scope" label="어디서 산 제품이 좋으세요?">
        <SingleChoice options={scopeOptions} value={p.scope} onChange={(scope) => set({ scope })} columns={3} />
      </Question>

      <Question id="pillSize" label="알약 삼키기">
        <SingleChoice options={pillSizeOptions} value={p.pillSize} onChange={(pillSize) => set({ pillSize })} columns={3} />
      </Question>

      {p.pillSize !== "no_pills" && (
        <Question id="maxPillsPerDay" label={`하루 최대 알약 수: ${p.maxPillsPerDay}개`} hint="분말·액상·구미·츄어블은 세지 않아요.">
          <Slider
            min={1}
            max={10}
            value={[p.maxPillsPerDay]}
            onValueChange={(v) => set({ maxPillsPerDay: Array.isArray(v) ? v[0] : v })}
            aria-label="하루 최대 알약 수"
            className="py-3"
          />
        </Question>
      )}

      <Question id="forms" label="선호하는 형태 (선택)" hint="고르지 않으면 모든 형태에서 찾아요.">
        <MultiChoice options={formOptions} value={p.forms} onChange={(forms) => set({ forms: forms as Form[] })} />
      </Question>

      <Question id="mode" label="먹는 방식">
        <SingleChoice options={modeOptions} value={p.mode} onChange={(mode) => set({ mode })} columns={3} />
      </Question>
    </div>
  );
}
