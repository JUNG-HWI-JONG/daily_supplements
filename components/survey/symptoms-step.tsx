"use client";

import { StarIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FieldErrors } from "@/lib/survey/schema";
import { durationOptions, emergencyOptions, frequencyOptions, symptomCategories, symptomList } from "@/lib/survey/options";
import { useSurvey } from "@/lib/survey/store";
import { MultiChoice, Question, SingleChoice } from "./choice";

const MAX_PRIORITY = 3;
const yesNo = [
  { value: true, label: "예" },
  { value: false, label: "아니오" },
];

export function SymptomsStep({ errors }: { errors: FieldErrors }) {
  const sex = useSurvey((s) => s.profile.sex);
  const selected = useSurvey((s) => s.symptoms);
  const emergencies = useSurvey((s) => s.emergencies);
  const { toggleSymptom, updateSymptom, setEmergencies } = useSurvey.getState();

  const categories = symptomCategories.filter((c) => !("showIf" in c) || c.showIf?.value === sex);
  const priorityCount = selected.filter((s) => s.priority).length;

  return (
    <div className="space-y-8">
      {categories.map((c) => {
        const options = symptomList.filter((s) => s.category === c.id).map((s) => ({ value: s.id, label: s.label }));
        return (
          <Question key={c.id} id={`cat-${c.id}`} label={c.label}>
            <MultiChoice
              options={options}
              value={selected.map((s) => s.id).filter((id) => options.some((o) => o.value === id))}
              onChange={(ids) => {
                const current = selected.map((s) => s.id).filter((id) => options.some((o) => o.value === id));
                [...ids.filter((id) => !current.includes(id)), ...current.filter((id) => !ids.includes(id))].forEach(toggleSymptom);
              }}
            />
          </Question>
        );
      })}

      {selected.length > 0 && (
        <section className="space-y-4" aria-labelledby="symptom-detail">
          <h3 id="symptom-detail" className="text-base font-semibold">
            고른 증상에 대해 조금만 더 알려주세요
          </h3>
          {selected.map((s) => {
            const def = symptomList.find((x) => x.id === s.id);
            if (!def) return null;
            const canPrioritize = s.priority || priorityCount < MAX_PRIORITY;
            return (
              <div key={s.id} className="space-y-5 rounded-xl border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{def.label}</p>
                  <Button variant="ghost" size="icon-sm" aria-label={`${def.label} 빼기`} onClick={() => toggleSymptom(s.id)}>
                    <XIcon />
                  </Button>
                </div>
                <Question id={`${s.id}-freq`} label="얼마나 자주?">
                  <SingleChoice options={frequencyOptions} value={s.frequency} onChange={(frequency) => updateSymptom(s.id, { frequency })} columns={3} />
                </Question>
                <Question id={`${s.id}-dur`} label="언제부터?">
                  <SingleChoice options={durationOptions} value={s.duration} onChange={(duration) => updateSymptom(s.id, { duration })} columns={3} />
                </Question>
                {def.redFlags.map((rf, idx) =>
                  rf.trigger.type === "question" ? (
                    <Question key={idx} id={`${s.id}-rf-${idx}`} label={rf.trigger.text}>
                      <SingleChoice
                        options={yesNo}
                        value={s.redFlagAnswers?.[idx] ?? null}
                        onChange={(v) => updateSymptom(s.id, { redFlagAnswers: { ...s.redFlagAnswers, [idx]: v } })}
                      />
                    </Question>
                  ) : null,
                )}
                <button
                  type="button"
                  aria-pressed={Boolean(s.priority)}
                  disabled={!canPrioritize}
                  onClick={() => updateSymptom(s.id, { priority: !s.priority })}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground disabled:opacity-50",
                    s.priority && "font-medium text-primary",
                  )}
                >
                  <StarIcon className={cn("size-4", s.priority && "fill-current")} aria-hidden />
                  가장 개선하고 싶어요 {!canPrioritize && `(최대 ${MAX_PRIORITY}개)`}
                </button>
              </div>
            );
          })}
        </section>
      )}

      <Question
        id="emergencies"
        label="혹시 지금 아래 증상이 있나요?"
        hint="해당하면 영양제보다 진료가 먼저예요."
        error={errors.emergencies}
      >
        <MultiChoice
          options={emergencyOptions.map((e) => ({ value: e.id, label: e.text }))}
          value={emergencies}
          onChange={setEmergencies}
          noneLabel="해당 없음"
          columns={1}
        />
      </Question>
    </div>
  );
}
