"use client";

import { ChevronDownIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { FieldErrors } from "@/lib/survey/schema";
import {
  alcoholOptions,
  caffeineOptions,
  eatingOutOptions,
  exerciseOptions,
  fishOptions,
  jobOptions,
  levelOptions,
  mealsOptions,
  shiftOptions,
  sleepHourOptions,
  smokingOptions,
  stressOptions,
  workEnvOptions,
} from "@/lib/survey/options";
import { useSurvey } from "@/lib/survey/store";
import { MultiChoice, Question, SingleChoice } from "./choice";

export function LifestyleStep({ errors }: { errors: FieldErrors }) {
  const l = useSurvey((s) => s.lifestyle);
  const set = useSurvey((s) => s.setLifestyle);

  return (
    <div className="space-y-8">
      <Question id="job" label="어떤 일을 하세요?" error={errors.job}>
        <SingleChoice options={jobOptions} value={l.job} onChange={(job) => set({ job })} />
      </Question>

      <Question id="shift" label="근무 형태" hint="교대 근무라면 먹는 시간을 기상·식사 기준으로 알려드려요." error={errors.shift}>
        <SingleChoice options={shiftOptions} value={l.shift} onChange={(shift) => set({ shift })} />
      </Question>

      <Question id="workEnv" label="일하는 환경 (해당하는 것 모두)">
        <MultiChoice options={workEnvOptions} value={l.workEnv} onChange={(workEnv) => set({ workEnv })} columns={1} />
      </Question>

      <Collapsible className="rounded-xl border">
        <CollapsibleTrigger className="group flex min-h-12 w-full items-center justify-between px-4 text-left text-sm font-semibold">
          <span>
            더 자세히 알려주기 <span className="font-normal text-muted-foreground">(선택 · 추천이 더 정확해져요)</span>
          </span>
          <ChevronDownIcon className="size-4 transition-transform group-data-[panel-open]:rotate-180" aria-hidden />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-8 border-t px-4 py-6">
          <Question id="sleepHours" label="하루 평균 수면 시간">
            <SingleChoice options={sleepHourOptions} value={l.sleepHours} onChange={(sleepHours) => set({ sleepHours })} columns={3} />
          </Question>
          <Question id="mealsPerDay" label="하루 식사 횟수">
            <SingleChoice options={mealsOptions} value={l.mealsPerDay} onChange={(mealsPerDay) => set({ mealsPerDay })} columns={3} />
          </Question>
          <Question id="eatingOut" label="외식·배달">
            <SingleChoice options={eatingOutOptions} value={l.eatingOut} onChange={(eatingOut) => set({ eatingOut })} columns={3} />
          </Question>
          <Question id="vegFruit" label="채소·과일">
            <SingleChoice options={levelOptions} value={l.vegFruit} onChange={(vegFruit) => set({ vegFruit })} columns={3} />
          </Question>
          <Question id="dairy" label="우유·유제품">
            <SingleChoice options={levelOptions} value={l.dairy} onChange={(dairy) => set({ dairy })} columns={3} />
          </Question>
          <Question id="fishPerWeek" label="생선">
            <SingleChoice options={fishOptions} value={l.fishPerWeek} onChange={(fishPerWeek) => set({ fishPerWeek })} columns={3} />
          </Question>
          <Question id="alcoholPerWeek" label="음주">
            <SingleChoice options={alcoholOptions} value={l.alcoholPerWeek} onChange={(alcoholPerWeek) => set({ alcoholPerWeek })} />
          </Question>
          <Question id="smoking" label="흡연">
            <SingleChoice options={smokingOptions} value={l.smoking} onChange={(smoking) => set({ smoking })} />
          </Question>
          <Question id="caffeineCups" label="커피·에너지음료 (하루)">
            <SingleChoice options={caffeineOptions} value={l.caffeineCups} onChange={(caffeineCups) => set({ caffeineCups })} columns={3} />
          </Question>
          <Question id="exercise" label="운동">
            <SingleChoice options={exerciseOptions} value={l.exercise} onChange={(exercise) => set({ exercise })} columns={3} />
          </Question>
          <Question id="stress" label="요즘 스트레스">
            <SingleChoice options={stressOptions} value={l.stress} onChange={(stress) => set({ stress })} columns={3} />
          </Question>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
