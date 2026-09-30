"use client";

import { ChevronDownIcon, ExternalLinkIcon, TriangleAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { data } from "@/lib/engine/data";
import type { RecommendedItem, Target } from "@/lib/engine";
import { cn } from "@/lib/utils";
import { formLabel, tierInfo, unitOf, won } from "./format";

const tierBadge = {
  core: "default",
  recommended: "secondary",
  optional: "outline",
} as const;

export function ProductCard({
  item,
  targets,
  durationMonths,
  onRemove,
}: {
  item: RecommendedItem;
  targets: Target[];
  durationMonths: number;
  onRemove: () => void;
}) {
  const p = item.product;
  const covered = item.covers.map((id) => targets.find((t) => t.id === id)).filter((t): t is Target => Boolean(t));

  return (
    <article className="space-y-4 rounded-2xl border p-4">
      <header className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={tierBadge[item.tier]}>{tierInfo[item.tier].label}</Badge>
          <Badge variant="outline">{p.scope === "domestic" ? "국내" : "해외직구"}</Badge>
          {p.mfdsCertified && <Badge variant="outline">건강기능식품</Badge>}
        </div>
        <h3 className="text-lg leading-snug font-bold">{p.name}</h3>
        <p className="text-sm text-muted-foreground">
          {formLabel(p.form)} · 하루 {p.servingUnits}
          {unitOf(p.form)} · 한 통 {p.packageUnits}
          {unitOf(p.form)}
        </p>
      </header>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">이런 이유로 추천했어요</h4>
        <ul className="space-y-1 text-sm">
          {item.reasons.map((r) => (
            <li key={r} className="flex gap-2">
              <span aria-hidden className="text-primary">
                •
              </span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">들어있는 주요 성분</h4>
        <ul className="space-y-2">
          {covered.map((t) => (
            <li key={t.id} className="rounded-lg bg-muted/60 p-3 text-sm">
              <p className="font-medium">
                {t.nameKo}
                {t.evidence === "limited" && (
                  <Badge variant="outline" className="ml-2 align-middle font-normal text-muted-foreground">
                    근거 제한적
                  </Badge>
                )}
              </p>
              <p className="text-muted-foreground">{data.nutrients.get(t.id)?.beginner ?? data.groups.get(t.id)?.beginner}</p>
            </li>
          ))}
        </ul>
        {p.note && <p className="text-xs text-muted-foreground">참고: {p.note}</p>}
      </section>

      {item.cautions.length > 0 && (
        <Collapsible className="rounded-lg border border-amber-500/30 bg-amber-500/5">
          <CollapsibleTrigger className="group flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-medium">
            <TriangleAlertIcon className="size-4 text-amber-600" aria-hidden />
            <span className="flex-1">주의사항 {item.cautions.length}개</span>
            <ChevronDownIcon className="size-4 transition-transform group-data-[panel-open]:rotate-180" aria-hidden />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="space-y-1 px-3 pb-3 text-sm text-muted-foreground">
              {item.cautions.map((c) => (
                <li key={c}>· {c}</li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}

      <section className="flex items-end justify-between gap-2 border-t pt-3">
        <div>
          <p className="text-lg font-bold">월 {won(item.monthlyCost)}</p>
          <p className="text-xs text-muted-foreground">
            {durationMonths}개월이면 {item.packages}통 · {won(item.packages * p.priceKRW)}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onRemove}>
          빼기
        </Button>
      </section>

      <section className="space-y-2">
        <p className="text-xs text-muted-foreground">대표 제품 유형이에요. 판매처에서 비슷한 제품을 찾아 라벨의 함량을 확인하세요.</p>
        <div className={cn("grid gap-2", item.links.length > 2 ? "grid-cols-3" : "grid-cols-2")}>
          {item.links.map((l) => (
            <a
              key={l.vendorId}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center justify-center gap-1 rounded-lg border text-sm font-medium hover:bg-muted"
            >
              {l.name}
              <ExternalLinkIcon className="size-3.5 text-muted-foreground" aria-hidden />
              <span className="sr-only">(새 창)</span>
            </a>
          ))}
        </div>
      </section>
    </article>
  );
}
