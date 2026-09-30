# 데일리 영양제 (가칭)

생활환경·증상·예산·복용 선호를 입력하면 영양제 조합, 복용 시간표, 구매 링크를 추천하는 개인 프로젝트입니다.
기획은 [PRD.md](PRD.md)에 있습니다.

> 의학적 진단을 대체하지 않으며, 전문가 검수를 거치지 않은 개인 프로젝트입니다.

## 명령어

```bash
npm run dev            # 개발 서버 (http://localhost:3000)
npm test               # 추천 엔진 테스트 (페르소나·안전 규칙·무작위 입력 2,000건)
npm run validate:data  # data/*.json 무결성 검사
npm run typecheck      # 타입 검사
npm run lint           # 린트
```

## 구조

```
app/            Next.js 화면 (아직 기본 템플릿)
lib/engine/     추천 엔진 — 순수 TypeScript 함수, 브라우저에서 실행
  index.ts        recommend(input) 진입점
  score.ts        1. 증상·생활환경 → 영양소 점수·등급, 레드플래그
  safety.ts       2. 약·질환·알레르기 금기, 상한(UL) 검사
  match.ts        3. 예산·제형·알약 수·범위 조건에서 제품 조합
  schedule.ts     5. 복용 시간표 (한 번에 / 나눠서 / 교대근무)
data/           영양소·증상·규칙·제품 데이터 (설명: data/README.md)
tests/engine/   엔진 테스트
scripts/        데이터 검사 스크립트
```

## 추천 엔진 사용 예

```ts
import { recommend } from "@/lib/engine";

const result = recommend({
  profile: { sex: "male", age: 29, pregnancy: "none", medications: [], conditions: [], allergies: [], diet: "omnivore" },
  lifestyle: { job: "screen_intensive", shift: "day", workEnv: ["indoor", "long_screen"], /* ... */ },
  symptoms: [{ id: "eye_strain", frequency: "daily", duration: "1m", priority: true }],
  emergencies: [],
  preferences: { durationMonths: 3, monthlyBudget: 30000, forms: [], pillSize: "any", maxPillsPerDay: 4, mode: "once", scope: "domestic" },
});

result.status;    // "ok" | "emergency" | "consult_only"
result.items;     // 추천 제품 (등급, 이유, 주의사항, 월 비용, 구매 링크)
result.schedule;  // 복용 시간표
result.unmet;     // 채우지 못한 영양소와 이유 (예산·알약 수·제품 없음·안전 상한)
result.redFlags;  // 진료 권유
```
