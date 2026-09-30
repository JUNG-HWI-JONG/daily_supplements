"use client";

import Link from "next/link";
import { useMemo } from "react";
import { buttonVariants } from "@/components/ui/button";
import { useHydratedSurvey } from "@/components/survey/survey-wizard";
import { recommend } from "@/lib/engine";
import { toUserInput } from "@/lib/survey/schema";
import { useSurvey } from "@/lib/survey/store";

const tierLabel = { core: "핵심", recommended: "권장", optional: "선택" } as const;
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/** 임시 결과 화면 — 다음 단계(추천 결과·시간표 화면)에서 교체 */
export function ResultPreview() {
  const hydrated = useHydratedSurvey();
  const draft = useSurvey();
  const input = useMemo(() => (hydrated ? toUserInput(draft) : null), [hydrated, draft]);
  const result = useMemo(() => (input ? recommend(input) : null), [input]);

  if (!hydrated) return <div className="h-96 animate-pulse rounded-xl bg-muted" aria-label="불러오는 중" />;
  if (!result) {
    return (
      <div className="space-y-4">
        <p>설문이 아직 끝나지 않았어요.</p>
        <Link href="/survey" className={buttonVariants()}>
          설문 이어서 하기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {result.messages.map((m) => (
        <p key={m} className="rounded-lg bg-muted p-3 text-sm">
          {m}
        </p>
      ))}
      {result.redFlags.map((f, i) => (
        <p key={i} className="rounded-lg border border-destructive/40 p-3 text-sm">
          <strong>{f.symptomLabel}</strong> · {f.department}: {f.message}
        </p>
      ))}
      {result.status === "ok" && (
        <>
          <p className="text-sm text-muted-foreground">
            월 {won(result.cost.monthly)} / 예산 {won(result.cost.budget)} · 하루 알약 {result.pillsPerDay}개
          </p>
          <ul className="space-y-2">
            {result.items.map((i) => (
              <li key={i.product.id} className="rounded-lg border p-3">
                <p className="font-semibold">
                  [{tierLabel[i.tier]}] {i.product.name}
                </p>
                <p className="text-sm text-muted-foreground">{i.reasons.join(", ")}</p>
              </li>
            ))}
          </ul>
          <ul className="space-y-1 text-sm">
            {result.schedule.slots.map((s) => (
              <li key={s.slotId}>
                <strong>{s.label}</strong>: {s.items.map((i) => `${i.name} ${i.units}개`).join(", ")}
              </li>
            ))}
          </ul>
        </>
      )}
      <Link href="/survey" className={buttonVariants({ variant: "outline" })}>
        설문 수정하기
      </Link>
    </div>
  );
}
