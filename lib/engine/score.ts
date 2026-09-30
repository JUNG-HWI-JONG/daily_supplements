import { matches, type Facts } from "./conditions";
import { evidenceRank, nameOf, type EngineData } from "./data";
import type { Avoid, Duration, Evidence, Frequency, Target, Tier, TriggeredRedFlag, UserInput } from "./types";

const frequencyWeight: Record<Frequency, number> = { sometimes: 1, often: 1.5, daily: 2 };
const PRIORITY_BONUS = 1.5;
const durationRank: Record<Duration, number> = { lt1w: 0, "1m": 1, "3m": 2 };

export const tierRank: Record<Tier, number> = { optional: 1, recommended: 2, core: 3 };

/** 점수 → 등급. 근거가 제한적(limited)이면 최대 '권장' */
export function tierFor(score: number, evidence: Evidence): Tier {
  const byScore: Tier = score >= 4 ? "core" : score >= 2 ? "recommended" : "optional";
  if (evidence === "limited" && byScore === "core") return "recommended";
  return byScore;
}

export interface ScoreResult {
  targets: Target[];
  redFlags: TriggeredRedFlag[];
  tips: string[];
  notes: string[];
  preferMultivitamin: boolean;
  requireVegan: boolean;
  excludeTags: { tag: string; reason: string }[];
  avoid: Avoid[];
}

export function score(d: EngineData, input: UserInput, facts: Facts): ScoreResult {
  const acc = new Map<string, { score: number; evidence: Evidence; reasons: string[] }>();
  const add = (id: string, points: number, evidence: Evidence, reason: string) => {
    const t = acc.get(id) ?? { score: 0, evidence: "limited" as Evidence, reasons: [] };
    t.score += points;
    if (evidenceRank[evidence] > evidenceRank[t.evidence]) t.evidence = evidence;
    if (!t.reasons.includes(reason)) t.reasons.push(reason);
    acc.set(id, t);
  };

  const redFlags: TriggeredRedFlag[] = [];
  const tips: string[] = [];
  const notes: string[] = [];
  const avoid: Avoid[] = [];

  for (const s of input.symptoms) {
    const symptom = d.symptoms.get(s.id);
    if (!symptom) continue;
    const mult = frequencyWeight[s.frequency] * (s.priority ? PRIORITY_BONUS : 1);
    for (const n of symptom.nutrients) add(n.id, n.weight * mult, n.evidence, symptom.label);

    symptom.redFlags.forEach((rf, idx) => {
      const t = rf.trigger;
      const hit =
        t.type === "always" ||
        (t.type === "duration" && durationRank[s.duration] >= durationRank[t.min]) ||
        (t.type === "question" && s.redFlagAnswers?.[idx] === true);
      if (hit) {
        redFlags.push({ symptomId: symptom.id, symptomLabel: symptom.label, action: rf.action, department: rf.department, message: rf.message });
      }
    });

    for (const a of symptom.avoid ?? []) avoid.push({ ...a, reason: `${symptom.label}: ${a.reason}` });
    tips.push(...symptom.lifestyle);
    if (symptom.noSupplementNote) notes.push(`${symptom.label}: ${symptom.noSupplementNote}`);
    if (symptom.note) notes.push(`${symptom.label}: ${symptom.note}`);
  }

  let preferMultivitamin = false;
  let requireVegan = input.profile.diet === "vegan";
  const excludeTags: ScoreResult["excludeTags"] = [];

  for (const rule of d.envRules) {
    if (!matches(rule.when, facts)) continue;
    for (const b of rule.boosts) add(b.id, b.weight, b.evidence, rule.reason ?? "생활환경");
    if (rule.tips) tips.push(...rule.tips);
    if (rule.preferMultivitamin) preferMultivitamin = true;
    if (rule.requireVegan) requireVegan = true;
    if (rule.excludes) excludeTags.push(...rule.excludes);
  }

  const targets: Target[] = [...acc.entries()]
    .map(([id, t]) => ({
      id,
      nameKo: nameOf(d, id),
      score: Math.round(t.score * 10) / 10,
      evidence: t.evidence,
      tier: tierFor(t.score, t.evidence),
      reasons: t.reasons,
    }))
    .sort((a, b) => tierRank[b.tier] - tierRank[a.tier] || b.score - a.score);

  // 응급 → 긴급 → 상담 순
  const order = { emergency: 0, urgent: 1, consult: 2 };
  redFlags.sort((a, b) => order[a.action] - order[b.action]);

  return { targets, redFlags, tips: [...new Set(tips)], notes, preferMultivitamin, requireVegan, excludeTags, avoid };
}
