"use client";

import { MoonIcon, SunIcon, SunriseIcon, SunsetIcon, UtensilsIcon } from "lucide-react";
import type { Product, Schedule, ScheduleMode } from "@/lib/engine";
import { SingleChoice } from "@/components/survey/choice";
import { unitOf } from "./format";

const slotIcon: Record<string, typeof SunIcon> = {
  wake: SunriseIcon,
  breakfast: SunIcon,
  lunch: UtensilsIcon,
  dinner: SunsetIcon,
  bedtime: MoonIcon,
};

const modeChoices: { value: ScheduleMode; label: string }[] = [
  { value: "once", label: "한 번에" },
  { value: "split", label: "나눠서" },
  { value: "auto", label: "알아서" },
];

export function ScheduleCard({
  schedule,
  products,
  mode,
  onModeChange,
}: {
  schedule: Schedule;
  products: Product[];
  mode: ScheduleMode;
  onModeChange: (m: ScheduleMode) => void;
}) {
  const byId = new Map(products.map((p) => [p.id, p]));

  return (
    <div className="space-y-4">
      <SingleChoice options={modeChoices} value={mode} onChange={onModeChange} columns={3} />
      <p className="text-sm text-muted-foreground">
        {schedule.slots.length <= 1 ? "하루 한 번이면 돼요." : `하루 ${schedule.slots.length}번에 나눠 드세요.`}
      </p>

      <ol className="space-y-3">
        {schedule.slots.map((s) => {
          const Icon = slotIcon[s.slotId] ?? SunIcon;
          return (
            <li key={s.slotId} className="rounded-2xl border p-4">
              <p className="flex items-center gap-2 font-semibold">
                <Icon className="size-4 text-primary" aria-hidden />
                {s.label}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {s.items.map((i) => {
                  const p = byId.get(i.productId);
                  return (
                    <li key={i.productId} className="flex justify-between gap-2">
                      <span>{i.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {i.units}
                        {p ? unitOf(p.form) : "개"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>

      {schedule.notes.length > 0 && (
        <ul className="space-y-1.5 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
          {schedule.notes.map((n) => (
            <li key={n}>· {n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
