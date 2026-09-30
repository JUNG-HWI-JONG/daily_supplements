"use client";

import { cn } from "@/lib/utils";
import type { Option } from "@/lib/survey/options";

const chip =
  "min-h-11 rounded-xl border px-3 py-2 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 border-border bg-background hover:bg-muted aria-checked:border-primary aria-checked:bg-primary/10 aria-checked:font-medium aria-checked:text-primary aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:font-medium aria-pressed:text-primary";

function ChipLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <>
      <span className="block">{label}</span>
      {hint && <span className="block text-xs font-normal text-muted-foreground">{hint}</span>}
    </>
  );
}

export function Question({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <fieldset id={`q-${id}`} className="scroll-mt-28 space-y-2" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="text-sm font-semibold">{label}</legend>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function SingleChoice<T extends string | number | boolean>({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div role="radiogroup" className={cn("grid gap-2", columns === 2 ? "grid-cols-2" : columns === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={value === o.value} className={chip} onClick={() => onChange(o.value)}>
          <ChipLabel label={o.label} hint={o.hint} />
        </button>
      ))}
    </div>
  );
}

/**
 * 다중 선택. noneLabel이 있으면 '없음' 칩을 함께 보여주고, value가 null이면 아직 답하지 않은 상태.
 */
export function MultiChoice({
  options,
  value,
  onChange,
  noneLabel,
  columns = 2,
}: {
  options: Option<string>[];
  value: string[] | null;
  onChange: (v: string[]) => void;
  noneLabel?: string;
  columns?: 1 | 2;
}) {
  const selected = value ?? [];
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <div className={cn("grid gap-2", columns === 1 ? "grid-cols-1" : "grid-cols-2")}>
      {noneLabel && (
        <button type="button" aria-pressed={value !== null && value.length === 0} className={chip} onClick={() => onChange([])}>
          <ChipLabel label={noneLabel} />
        </button>
      )}
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={selected.includes(o.value)} className={chip} onClick={() => toggle(o.value)}>
          <ChipLabel label={o.label} hint={o.hint} />
        </button>
      ))}
    </div>
  );
}
