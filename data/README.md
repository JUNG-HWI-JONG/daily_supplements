# data/ — 추천 엔진 데이터

추천 엔진이 읽는 정적 데이터입니다. 빌드할 때 앱에 함께 묶이므로(번들) 서버나 DB가 필요 없습니다.
수정한 뒤에는 반드시 검사를 돌리세요.

```bash
node scripts/validate-data.mjs
```

## 파일 구성

| 파일 | 내용 | 엔진 단계 (PRD §6) |
|---|---|---|
| `nutrients.json` | 영양소 28종 + 그룹(비타민B군). 섭취기준, 상한(UL), 식약처 기능성, 초보자 설명 | 전 단계 |
| `symptoms.json` | 증상 29개 → 영양소 가중치·근거수준, 생활 팁, 레드플래그, 응급 증상 | 1. 점수화 / 안전 체크 |
| `environment-rules.json` | 생활환경 → 영양소 가중치 가산, 생활 팁 | 1. 점수화 |
| `interactions.json` | 약·질환·알레르기 금기, 영양소 간 상호작용, 입력 선택지 | 2. 안전 필터 / 4. 검증 / 5. 시간표 |
| `timing-rules.json` | 복용 슬롯, 영양소별 복용 시간 규칙 | 5. 시간표 |
| `products.json` | 대표 제품 유형 72개 (국내 41 / 해외 31) | 3. 제품 매칭 |
| `vendors.json` | 판매처 검색 URL 템플릿, 해외직구 안내 | 구매 링크 |

## 핵심 규칙

### 근거수준 → 추천 등급 상한
| evidence | 뜻 | 최대 등급 |
|---|---|---|
| `mfds` | 식약처 인정 기능성과 증상이 직접 연결 | 핵심 |
| `moderate` | 결핍 위험·기능성과 간접 연결 | 핵심 |
| `limited` | 흔히 시도되지만 근거 제한적 | 권장 (UI에 "근거 제한적" 배지) |

### 안전 판정 우선순위
1. `symptoms.emergency` 또는 레드플래그 `action: emergency` → 추천 중단, 119/109 안내
2. `interactions.globalRules` 중 `consult_only` (임신·수유, 미성년) → 추천하지 않고 안내만
3. `exclude` / `consult` → 해당 영양소 제외 (consult는 "상담 후 복용" 문구)
4. 조합 전체 함량 합산 → `ul`(없으면 `safetyCap`) 초과 시 제품 교체 또는 제외
   - 나이아신은 `ulByForm`으로 형태별 상한 적용
   - 마그네슘 UL(350mg)은 보충제만 합산
5. `high_dose` 태그 제품은 기본 후보에서 제외

### 조건식 (`when`)
```json
{ "all": [ { "field": "alcoholPerWeek", "op": "gte", "value": 2 } ] }
{ "any": [ { "field": "workEnv", "op": "includes", "value": "indoor" } ] }
```
`op`: `eq` `neq` `in` `includes` `gte` `lte` `lt`

## 사용자 입력 필드 (조건식 `field`)

| field | 타입 | 값 |
|---|---|---|
| `sex` | string | `male` `female` |
| `age` | number | |
| `pregnancy` | string | `none` `planning` `pregnant` `breastfeeding` |
| `medications` | string[] | `interactions.inputOptions.medications[].id` |
| `conditions` | string[] | `interactions.inputOptions.conditions[].id` |
| `allergies` | string[] | `interactions.inputOptions.allergies[].id` |
| `diet` | string | `omnivore` `vegetarian` `vegan` |
| `job` | string | `office` `screen_intensive` `service` `physical` `driver` `medical` `student` `homemaker` `freelancer` |
| `shift` | string | `day` `night` `rotating` `irregular` |
| `workEnv` | string[] | `indoor` `outdoor` `long_screen` `long_standing` `long_sitting` `noise_dust` `aircon` |
| `sleepHours` | number | |
| `sleepQuality` | number | 1–5 |
| `mealsPerDay` | number | |
| `eatingOut` | string | `rare` `sometimes` `often` |
| `vegFruit` / `dairy` | string | `low` `mid` `high` |
| `fishPerWeek` | number | |
| `alcoholPerWeek` | number | |
| `smoking` | boolean | |
| `caffeineCups` | number | |
| `exercise` | string | `none` `light` `intense` |
| `stress` | number | 1–5 |
| `symptoms` | `{ id, frequency, duration, priority }[]` | duration: `lt1w` `1m` `3m` |
| `preferences` | object | 기간, 예산, 제형, 알약 크기, 최대 개수, 복용 방식, **제품 범위(`domestic` `overseas` `all`)** |

## 데이터 상태 · 출처

- **모든 수치는 초안입니다.** 전문가 검수 없이 작성했고, 아래 원문과 대조가 필요합니다. (PRD §6 보수적 원칙)
  - 보건복지부·한국영양학회, *한국인 영양소 섭취기준* (2020년판 기준으로 작성. 2025 개정판 반영 여부 확인 필요)
  - 식품의약품안전처, *건강기능식품의 기준 및 규격* (고시형 원료 기능성·1일 섭취량)
  - NIH Office of Dietary Supplements, Fact Sheets (상호작용·주의사항)
- `products.json`은 **특정 브랜드가 아닌 대표 제품 유형**입니다. 함량·가격은 대표값이고, 구매 링크는 `searchKeyword`로 판매처 검색 결과를 엽니다.
- 알려진 공백: 해외직구 범위에는 홍삼 제품이 없음 → 엔진은 "국내 제품으로 대체 가능" 안내
