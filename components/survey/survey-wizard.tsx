"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { STEPS, validateStep, type FieldErrors } from "@/lib/survey/schema";
import { useSurvey } from "@/lib/survey/store";
import { LifestyleStep } from "./lifestyle-step";
import { PreferencesStep } from "./preferences-step";
import { ProfileStep } from "./profile-step";
import { SymptomsStep } from "./symptoms-step";

export function useHydratedSurvey() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    Promise.resolve(useSurvey.persist.rehydrate()).then(() => setHydrated(true));
  }, []);
  return hydrated;
}

export function SurveyWizard() {
  const router = useRouter();
  const hydrated = useHydratedSurvey();
  const step = useSurvey((s) => s.step);
  const setStep = useSurvey((s) => s.setStep);
  const [errors, setErrors] = useState<FieldErrors>({});
  const headingRef = useRef<HTMLHeadingElement>(null);

  const current = STEPS[Math.min(step, STEPS.length - 1)];
  const isLast = step >= STEPS.length - 1;

  const go = (next: number) => {
    setErrors({});
    setStep(next);
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const onNext = () => {
    const found = validateStep(step, useSurvey.getState());
    if (Object.keys(found).length > 0) {
      setErrors(found);
      const first = Object.keys(found)[0].split(".")[0];
      document.getElementById(`q-${first}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (isLast) router.push("/result");
    else go(step + 1);
  };

  if (!hydrated) {
    return <div className="mx-auto h-96 w-full max-w-xl animate-pulse rounded-xl bg-muted" aria-label="불러오는 중" />;
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      <header className="sticky top-0 z-10 space-y-3 bg-background/95 pt-4 pb-3 backdrop-blur">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {step + 1} / {STEPS.length}
          </span>
          <span>작성 내용은 이 기기에만 저장돼요</span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} aria-label="설문 진행률" />
      </header>

      <section className="flex-1 space-y-2 py-6" aria-labelledby="step-title">
        <h1 id="step-title" ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">
          {current.title}
        </h1>
        <p className="pb-4 text-sm text-muted-foreground">{current.description}</p>
        {step === 0 && <ProfileStep errors={errors} />}
        {step === 1 && <LifestyleStep errors={errors} />}
        {step === 2 && <SymptomsStep errors={errors} />}
        {step === 3 && <PreferencesStep errors={errors} />}
      </section>

      <footer className="sticky bottom-0 flex gap-2 border-t bg-background/95 py-3 backdrop-blur">
        {step > 0 && (
          <Button variant="outline" className="h-12 flex-1 text-base" onClick={() => go(step - 1)}>
            이전
          </Button>
        )}
        <Button className="h-12 flex-[2] text-base" onClick={onNext}>
          {isLast ? "추천 받기" : "다음"}
        </Button>
      </footer>
    </div>
  );
}
