"use client";

import { Input } from "@/components/ui/input";
import type { FieldErrors } from "@/lib/survey/schema";
import { allergyOptions, conditionOptions, dietOptions, medicationOptions, pregnancyOptions, sexOptions } from "@/lib/survey/options";
import { useSurvey } from "@/lib/survey/store";
import { MultiChoice, Question, SingleChoice } from "./choice";

export function ProfileStep({ errors }: { errors: FieldErrors }) {
  const profile = useSurvey((s) => s.profile);
  const setProfile = useSurvey((s) => s.setProfile);

  return (
    <div className="space-y-8">
      <Question id="sex" label="성별" error={errors.sex}>
        <SingleChoice options={sexOptions} value={profile.sex} onChange={(sex) => setProfile({ sex })} />
      </Question>

      <Question id="age" label="나이" hint="나이에 따라 필요한 양이 달라요." error={errors.age}>
        <div className="flex items-center gap-2">
          <Input
            id="age"
            type="number"
            inputMode="numeric"
            min={1}
            max={120}
            className="h-11 w-28 text-base"
            value={profile.age ?? ""}
            aria-invalid={Boolean(errors.age)}
            onChange={(e) => setProfile({ age: e.target.value === "" ? null : Number(e.target.value) })}
          />
          <span className="text-sm text-muted-foreground">세</span>
        </div>
      </Question>

      {profile.sex === "female" && (
        <Question id="pregnancy" label="임신·수유">
          <SingleChoice options={pregnancyOptions} value={profile.pregnancy} onChange={(pregnancy) => setProfile({ pregnancy })} />
        </Question>
      )}

      <Question id="medications" label="지금 먹고 있는 약이 있나요?" hint="영양제와 함께 먹으면 안 되는 약이 있어요. 모두 골라주세요." error={errors.medications}>
        <MultiChoice options={medicationOptions} value={profile.medications} onChange={(medications) => setProfile({ medications })} noneLabel="없음" columns={1} />
      </Question>

      <Question id="conditions" label="앓고 있는 질환이 있나요?" error={errors.conditions}>
        <MultiChoice options={conditionOptions} value={profile.conditions} onChange={(conditions) => setProfile({ conditions })} noneLabel="없음" />
      </Question>

      <Question id="allergies" label="알레르기가 있나요? (선택)" hint="없으면 넘어가세요.">
        <MultiChoice options={allergyOptions} value={profile.allergies} onChange={(allergies) => setProfile({ allergies })} />
      </Question>

      <Question id="diet" label="식단">
        <SingleChoice options={dietOptions} value={profile.diet} onChange={(diet) => setProfile({ diet })} columns={3} />
      </Question>
    </div>
  );
}
