// data/*.json 무결성 검사: node scripts/validate-data.mjs
import { readFileSync } from "node:fs";

const load = (name) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), "utf8"));

const nutrients = load("nutrients");
const symptoms = load("symptoms");
const env = load("environment-rules");
const interactions = load("interactions");
const timing = load("timing-rules");
const products = load("products");
load("vendors");

const errors = [];
const warnings = [];

const nutrientById = new Map(nutrients.nutrients.map((n) => [n.id, n]));
const groupById = new Map(nutrients.groups.map((g) => [g.id, g]));
const isKnown = (id) => nutrientById.has(id) || groupById.has(id);
const check = (id, where) => { if (!isKnown(id)) errors.push(`${where}: 알 수 없는 영양소 '${id}'`); };

for (const g of nutrients.groups) g.members.forEach((m) => check(m, `group ${g.id}`));

const symptomIds = new Set();
for (const s of symptoms.symptoms) {
  if (symptomIds.has(s.id)) errors.push(`중복 증상 id '${s.id}'`);
  symptomIds.add(s.id);
  if (!symptoms.categories.some((c) => c.id === s.category)) errors.push(`symptom ${s.id}: 알 수 없는 카테고리 '${s.category}'`);
  s.nutrients.forEach((n) => {
    check(n.id, `symptom ${s.id}`);
    if (!symptoms.evidenceLevels[n.evidence]) errors.push(`symptom ${s.id}: 알 수 없는 근거수준 '${n.evidence}'`);
  });
  (s.avoid ?? []).forEach((a) => check(a.id, `symptom ${s.id} avoid`));
  if (s.nutrients.length === 0 && !s.noSupplementNote) warnings.push(`symptom ${s.id}: 추천 영양소가 없는데 noSupplementNote 없음`);
}

for (const r of env.rules) {
  r.boosts.forEach((b) => check(b.id, `env ${r.id}`));
  if (r.boosts.length > 0 && !r.reason) errors.push(`env ${r.id}: 가중치가 있는데 reason(추천 이유 문구) 없음`);
}

for (const p of interactions.nutrientPairs) { check(p.a, "nutrientPairs"); if (p.b !== "*") check(p.b, "nutrientPairs"); }
for (const r of interactions.drugRules) {
  check(r.nutrient, `drugRules ${r.drug}`);
  if (!interactions.inputOptions.medications.some((m) => m.id === r.drug)) errors.push(`drugRules: 알 수 없는 약 '${r.drug}'`);
}
for (const r of interactions.conditionRules) {
  check(r.nutrient, `conditionRules ${r.condition}`);
  if (!interactions.inputOptions.conditions.some((c) => c.id === r.condition)) errors.push(`conditionRules: 알 수 없는 질환 '${r.condition}'`);
}
for (const r of interactions.allergyRules) if (r.nutrient) check(r.nutrient, `allergyRules ${r.allergy}`);

for (const id of Object.keys(timing.nutrients)) check(id, "timing");
for (const n of nutrients.nutrients) if (!timing.nutrients[n.id]) errors.push(`timing: '${n.id}' 복용 시간 규칙 없음`);

// 제품 검사
const productIds = new Set();
const covered = { domestic: new Set(), overseas: new Set() };
for (const p of products.products) {
  if (productIds.has(p.id)) errors.push(`중복 제품 id '${p.id}'`);
  productIds.add(p.id);
  for (const c of p.contents) {
    check(c.id, `product ${p.id}`);
    const n = nutrientById.get(c.id);
    if (!n) continue;
    const cap = c.form && n.ulByForm ? n.ulByForm[c.form] : n.ul ?? n.safetyCap;
    if (cap != null && c.amount > cap) errors.push(`product ${p.id}: ${c.id} ${c.amount}${n.unit} > 상한 ${cap}`);
    if (!p.tags.includes("high_dose")) covered[p.scope].add(c.id);
  }
}

// 추천 대상 영양소마다 범위별로 기본(비고용량) 제품이 있는지
const wanted = new Set([
  ...symptoms.symptoms.flatMap((s) => s.nutrients.map((n) => n.id)),
  ...env.rules.flatMap((r) => r.boosts.map((b) => b.id)),
]);
for (const id of wanted) {
  const members = groupById.get(id)?.members ?? [id];
  for (const scope of ["domestic", "overseas"]) {
    if (!members.some((m) => covered[scope].has(m))) warnings.push(`${scope}: '${id}' 제품 없음`);
  }
}

console.log(`영양소 ${nutrientById.size} · 그룹 ${groupById.size} · 증상 ${symptomIds.size} · 환경규칙 ${env.rules.length} · 제품 ${productIds.size} (국내 ${products.products.filter((p) => p.scope === "domestic").length} / 해외 ${products.products.filter((p) => p.scope === "overseas").length})`);
warnings.forEach((w) => console.log(`경고: ${w}`));
errors.forEach((e) => console.log(`오류: ${e}`));
if (errors.length) process.exit(1);
console.log("OK");
