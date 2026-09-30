"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CircleAlertIcon, InfoIcon, PhoneIcon, StethoscopeIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { SingleChoice } from "@/components/survey/choice";
import { useHydratedSurvey } from "@/components/survey/survey-wizard";
import { recommend, type Recommendation, type Tier } from "@/lib/engine";
import { nameOf, data } from "@/lib/engine/data";
import { toUserInput } from "@/lib/survey/schema";
import { useSurvey } from "@/lib/survey/store";
import { cn } from "@/lib/utils";
import { tierInfo, won } from "./format";
import { ProductCard } from "./product-card";
import { ScheduleCard } from "./schedule-card";

type Tab = "combo" | "schedule";
const tabs: { value: Tab; label: string }[] = [
  { value: "combo", label: "추천 조합" },
  { value: "schedule", label: "복용 시간표" },
];
const tierOrder: Tier[] = ["core", "recommended", "optional"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

function RedFlags({ result }: { result: Recommendation }) {
  if (result.redFlags.length === 0) return null;
  // 같은 증상의 여러 신호는 한 줄로 (진료과는 가장 급한 신호 기준)
  const bySymptom = new Map<string, { label: string; department: string; messages: string[] }>();
  for (const f of result.redFlags) {
    const g = bySymptom.get(f.symptomId) ?? { label: f.symptomLabel, department: f.department, messages: [] };
    g.messages.push(f.message);
    bySymptom.set(f.symptomId, g);
  }
  return (
    <Alert variant="destructive" className="border-destructive/40 p-4">
      <StethoscopeIcon aria-hidden />
      <AlertTitle className="font-bold">영양제보다 진료가 먼저 필요할 수 있어요</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 space-y-2 text-foreground">
          {[...bySymptom.entries()].map(([id, g]) => (
            <li key={id}>
              <strong>{g.label}</strong> → {g.department}
              {g.messages.map((m) => (
                <span key={m} className="block text-muted-foreground">
                  {m}
                </span>
              ))}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

const TIPS_PREVIEW = 5;

function TipList({ title, items }: { title: string; items: string[] }) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;
  const shown = expanded ? items : items.slice(0, TIPS_PREVIEW);
  return (
    <Section title={title}>
      <ul className="space-y-1.5 text-sm">
        {shown.map((t) => (
          <li key={t} className="flex gap-2">
            <span aria-hidden className="text-primary">
              ✓
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
      {items.length > TIPS_PREVIEW && (
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setExpanded(!expanded)}>
          {expanded ? "접기" : `${items.length - TIPS_PREVIEW}개 더 보기`}
        </Button>
      )}
    </Section>
  );
}

export function ResultView() {
  const router = useRouter();
  const hydrated = useHydratedSurvey();
  const draft = useSurvey();
  const [tab, setTab] = useState<Tab>("combo");

  const input = useMemo(() => (hydrated ? toUserInput(draft) : null), [hydrated, draft]);
  const result = useMemo(() => (input ? recommend(input, { skipTargets: draft.skippedTargets }) : null), [input, draft.skippedTargets]);

  const editSurvey = () => {
    draft.setStep(0);
    router.push("/survey");
  };
  const startOver = () => {
    if (!window.confirm("입력한 내용을 모두 지우고 처음부터 다시 할까요?")) return;
    draft.reset();
    router.push("/survey");
  };

  if (!hydrated) return <div className="h-96 animate-pulse rounded-xl bg-muted" aria-label="불러오는 중" />;

  if (!input || !result) {
    return (
      <div className="space-y-4">
        <p>설문이 아직 끝나지 않았어요.</p>
        <Link href="/survey" className={cn(buttonVariants(), "h-12 w-full text-base")}>
          설문 이어서 하기
        </Link>
      </div>
    );
  }

  const footer = (
    <div className="grid grid-cols-2 gap-2 pt-4">
      <Button variant="outline" className="h-12 text-base" onClick={editSurvey}>
        설문 수정하기
      </Button>
      <Button variant="ghost" className="h-12 text-base text-muted-foreground" onClick={startOver}>
        새로 시작
      </Button>
    </div>
  );

  if (result.status === "emergency") {
    return (
      <div className="space-y-6">
        <Alert variant="destructive" className="border-destructive p-4">
          <PhoneIcon aria-hidden />
          <AlertTitle className="text-base font-bold">지금은 영양제보다 진료가 먼저예요</AlertTitle>
          <AlertDescription className="text-foreground">
            <ul className="mt-2 space-y-2">
              {result.messages.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
        <div className="grid grid-cols-2 gap-2">
          <a href="tel:119" className={cn(buttonVariants({ variant: "destructive" }), "h-12 text-base")}>
            119 전화
          </a>
          <a href="tel:109" className={cn(buttonVariants({ variant: "outline" }), "h-12 text-base")}>
            109 상담전화
          </a>
        </div>
        {footer}
      </div>
    );
  }

  if (result.status === "consult_only") {
    return (
      <div className="space-y-6">
        <Alert className="p-4">
          <InfoIcon aria-hidden />
          <AlertTitle className="text-base font-bold">전문가 상담을 권해요</AlertTitle>
          <AlertDescription className="text-foreground">{result.messages[0]}</AlertDescription>
        </Alert>
        <RedFlags result={result} />
        <TipList title="생활 속에서 해볼 수 있는 것" items={result.tips} />
        {footer}
      </div>
    );
  }

  const { cost } = result;
  const budgetRatio = Math.min(cost.monthly / cost.budget, 1);
  const items = [...result.items].sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));
  const products = items.map((i) => i.product);
  const skipped = draft.skippedTargets.filter((id) => data.nutrients.has(id) || data.groups.has(id));

  return (
    <div className="space-y-8">
      <RedFlags result={result} />

      {result.messages.length > 0 && (
        <Alert className="p-4">
          <InfoIcon aria-hidden />
          <AlertDescription className="text-foreground">
            <ul className="space-y-1">
              {result.messages.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <section className="space-y-3 rounded-2xl bg-primary/5 p-4" aria-label="요약">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted-foreground">한 달 비용</p>
          <p className="text-2xl font-bold">{won(cost.monthly)}</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`예산 ${won(cost.budget)} 중 ${Math.round(budgetRatio * 100)}% 사용`}>
          <div className="h-full rounded-full bg-primary" style={{ width: `${budgetRatio * 100}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">
          예산 {won(cost.budget)} · {input.preferences.durationMonths}개월 총 {won(cost.total)} · 제품 {items.length}개 · 하루 알약 {result.pillsPerDay}개
        </p>
      </section>

      <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur">
        <SingleChoice options={tabs} value={tab} onChange={setTab} />
      </div>

      {tab === "combo" ? (
        <div className="space-y-8">
          {items.length === 0 ? (
            <p className="rounded-xl bg-muted p-4 text-sm">
              지금 입력으로는 추천할 영양제가 없어요. 아래 생활 팁부터 시작해보세요. 불편한 곳을 추가하거나 예산·형태 조건을 넓히면 추천이 나올 수 있어요.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                {tierOrder
                  .filter((t) => items.some((i) => i.tier === t))
                  .map((t) => `${tierInfo[t].label}: ${tierInfo[t].description}`)
                  .join(" · ")}
              </p>
              {items.map((item) => (
                <ProductCard
                  key={item.product.id}
                  item={item}
                  targets={result.targets}
                  durationMonths={input.preferences.durationMonths}
                  onRemove={() => draft.skipTargets(item.covers)}
                />
              ))}
            </div>
          )}

          {result.unmet.length > 0 && (
            <Section title="조건 때문에 빠진 영양소">
              <ul className="space-y-2">
                {result.unmet.map((u) => (
                  <li key={u.nutrientId} className="rounded-xl border p-3 text-sm">
                    <p className="font-medium">
                      {u.nameKo} <span className="font-normal text-muted-foreground">({tierInfo[u.tier].label})</span>
                    </p>
                    <p className="text-muted-foreground">{u.message}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {result.excluded.length > 0 && (
            <Section title="안전을 위해 뺀 영양소">
              <ul className="space-y-2">
                {result.excluded.map((e) => (
                  <li key={e.nutrientId + e.reason} className="flex gap-2 rounded-xl border p-3 text-sm">
                    <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                    <div>
                      <p className="font-medium">
                        {e.nameKo}
                        {e.action === "consult" && <span className="font-normal text-muted-foreground"> · 약사·의사와 상담 후 복용</span>}
                      </p>
                      <p className="text-muted-foreground">{e.reason}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {skipped.length > 0 && (
            <Section title="직접 뺀 영양소">
              <ul className="space-y-2">
                {skipped.map((id) => (
                  <li key={id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                    <span>{nameOf(data, id)}</span>
                    <Button variant="outline" size="sm" onClick={() => draft.restoreTargets([id])}>
                      되돌리기
                    </Button>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <TipList title="영양제와 함께 해보세요" items={[...result.notes, ...result.tips]} />
        </div>
      ) : (
        <ScheduleCard
          schedule={result.schedule}
          products={products}
          mode={input.preferences.mode}
          onModeChange={(mode) => draft.setPreferences({ mode })}
        />
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        이 결과는 의학적 진단을 대체하지 않으며, 전문가 검수를 거치지 않은 개인 프로젝트입니다. 함량·가격은 대표값이니 구매 전 제품 라벨을 확인하세요.
      </p>
      {footer}
    </div>
  );
}
