import type { Condition, UserInput, When } from "./types";

export type Facts = Record<string, unknown>;

/** 조건식에서 참조하는 field → 값 (profile + lifestyle 평탄화) */
export function toFacts(input: UserInput): Facts {
  return { ...input.lifestyle, ...input.profile };
}

function test(c: Condition, facts: Facts): boolean {
  const v = facts[c.field];
  switch (c.op) {
    case "eq":
      return v === c.value;
    case "neq":
      return v !== c.value;
    case "in":
      return Array.isArray(c.value) && c.value.includes(v);
    case "includes":
      return Array.isArray(v) && v.includes(c.value);
    case "gte":
      return typeof v === "number" && v >= (c.value as number);
    case "lte":
      return typeof v === "number" && v <= (c.value as number);
    case "lt":
      return typeof v === "number" && v < (c.value as number);
  }
}

export function matches(when: When, facts: Facts): boolean {
  if (when.all && !when.all.every((c) => test(c, facts))) return false;
  if (when.any && !when.any.some((c) => test(c, facts))) return false;
  return Boolean(when.all?.length || when.any?.length);
}
