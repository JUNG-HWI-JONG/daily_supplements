import interactions from "@/data/interactions.json";
import symptomsData from "@/data/symptoms.json";
import type { Diet, Duration, Form, Frequency, Level, Pregnancy, ScheduleMode, ScopePreference, Sex, Shift, Symptom } from "@/lib/engine";

export interface Option<T extends string | number | boolean> {
  value: T;
  label: string;
  hint?: string;
}

export const sexOptions: Option<Sex>[] = [
  { value: "female", label: "여성" },
  { value: "male", label: "남성" },
];

export const pregnancyOptions: Option<Pregnancy>[] = [
  { value: "none", label: "해당 없음" },
  { value: "planning", label: "임신 준비 중" },
  { value: "pregnant", label: "임신 중" },
  { value: "breastfeeding", label: "수유 중" },
];

export const dietOptions: Option<Diet>[] = [
  { value: "omnivore", label: "골고루 먹어요" },
  { value: "vegetarian", label: "채식 위주" },
  { value: "vegan", label: "비건 (동물성 전혀 X)" },
];

export const medicationOptions: Option<string>[] = interactions.inputOptions.medications.map((m) => ({ value: m.id, label: m.label }));
export const conditionOptions: Option<string>[] = interactions.inputOptions.conditions.map((c) => ({ value: c.id, label: c.label }));
export const allergyOptions: Option<string>[] = interactions.inputOptions.allergies.map((a) => ({ value: a.id, label: a.label }));

export const jobOptions: Option<string>[] = [
  { value: "office", label: "사무직" },
  { value: "screen_intensive", label: "개발·디자인 (화면 집중)" },
  { value: "service", label: "서비스·판매직" },
  { value: "physical", label: "현장·육체노동" },
  { value: "driver", label: "운전·외근" },
  { value: "medical", label: "의료직" },
  { value: "student", label: "학생" },
  { value: "homemaker", label: "주부" },
  { value: "freelancer", label: "프리랜서" },
];

export const shiftOptions: Option<Shift>[] = [
  { value: "day", label: "주간 근무" },
  { value: "night", label: "야간 고정" },
  { value: "rotating", label: "교대 근무", hint: "2교대·3교대" },
  { value: "irregular", label: "불규칙" },
];

export const workEnvOptions: Option<string>[] = [
  { value: "indoor", label: "실내에서 주로 일해요", hint: "햇빛을 잘 못 봐요" },
  { value: "outdoor", label: "실외에서 주로 일해요" },
  { value: "long_screen", label: "화면을 오래 봐요", hint: "하루 6시간 이상" },
  { value: "long_sitting", label: "오래 앉아 있어요" },
  { value: "long_standing", label: "오래 서 있어요" },
];

export const sleepHourOptions: Option<number>[] = [4, 5, 6, 7, 8, 9].map((h) => ({ value: h, label: h === 4 ? "4시간 이하" : h === 9 ? "9시간 이상" : `${h}시간` }));
export const mealsOptions: Option<number>[] = [
  { value: 1, label: "1끼" },
  { value: 2, label: "2끼" },
  { value: 3, label: "3끼" },
];
export const eatingOutOptions: Option<"rare" | "sometimes" | "often">[] = [
  { value: "rare", label: "거의 안 해요" },
  { value: "sometimes", label: "가끔" },
  { value: "often", label: "거의 매일" },
];
export const levelOptions: Option<Level>[] = [
  { value: "low", label: "거의 안 먹어요" },
  { value: "mid", label: "보통" },
  { value: "high", label: "자주 먹어요" },
];
export const fishOptions: Option<number>[] = [
  { value: 0, label: "거의 안 먹어요" },
  { value: 1, label: "주 1회" },
  { value: 2, label: "주 2회 이상" },
];
export const alcoholOptions: Option<number>[] = [
  { value: 0, label: "안 마셔요" },
  { value: 1, label: "주 1회" },
  { value: 2, label: "주 2~3회" },
  { value: 4, label: "주 4회 이상" },
];
export const smokingOptions: Option<boolean>[] = [
  { value: false, label: "안 피워요" },
  { value: true, label: "피워요" },
];
export const caffeineOptions: Option<number>[] = [0, 1, 2, 3, 4].map((n) => ({ value: n, label: n === 0 ? "안 마셔요" : n === 4 ? "4잔 이상" : `${n}잔` }));
export const exerciseOptions: Option<"none" | "light" | "intense">[] = [
  { value: "none", label: "거의 안 해요" },
  { value: "light", label: "가볍게 (걷기 등)" },
  { value: "intense", label: "땀 흘리는 운동" },
];
export const stressOptions: Option<number>[] = [
  { value: 1, label: "매우 낮음" },
  { value: 2, label: "낮음" },
  { value: 3, label: "보통" },
  { value: 4, label: "높음" },
  { value: 5, label: "매우 높음" },
];

export const frequencyOptions: Option<Frequency>[] = [
  { value: "sometimes", label: "가끔" },
  { value: "often", label: "자주" },
  { value: "daily", label: "거의 매일" },
];
export const durationOptions: Option<Duration>[] = [
  { value: "lt1w", label: "1주 이내" },
  { value: "1m", label: "1~3개월" },
  { value: "3m", label: "3개월 이상" },
];

export const symptomCategories = symptomsData.categories;
export const symptomList = symptomsData.symptoms as unknown as Symptom[];
export const emergencyOptions = symptomsData.emergency;

export const durationMonthOptions: Option<number>[] = [
  { value: 1, label: "1개월" },
  { value: 3, label: "3개월" },
  { value: 6, label: "6개월" },
  { value: 12, label: "꾸준히 (1년)" },
];
export const budgetOptions: Option<number>[] = [
  { value: 10000, label: "월 1만원 이하" },
  { value: 30000, label: "월 3만원 이하" },
  { value: 50000, label: "월 5만원 이하" },
  { value: 100000, label: "월 10만원 이하" },
];
export const formOptions: Option<Form>[] = [
  { value: "tablet", label: "정제 (알약)" },
  { value: "capsule", label: "캡슐" },
  { value: "softgel", label: "연질캡슐 (말랑한 캡슐)" },
  { value: "powder", label: "분말·스틱" },
  { value: "liquid", label: "액상·드롭" },
  { value: "gummy", label: "구미 (젤리)" },
  { value: "chewable", label: "씹어 먹는 정 (츄어블)" },
];
export const pillSizeOptions: Option<"any" | "small_only" | "no_pills">[] = [
  { value: "any", label: "크기 상관없어요" },
  { value: "small_only", label: "작은 알약만" },
  { value: "no_pills", label: "알약은 못 삼켜요", hint: "분말·액상·구미·츄어블만" },
];
export const modeOptions: Option<ScheduleMode>[] = [
  { value: "auto", label: "앱이 알아서", hint: "가능하면 한 번에, 필요하면 나눠서" },
  { value: "once", label: "하루 한 번에 몰아서" },
  { value: "split", label: "시간대별로 나눠서" },
];
export const scopeOptions: Option<ScopePreference>[] = [
  { value: "domestic", label: "국내 제품만", hint: "식약처 인증 건강기능식품" },
  { value: "overseas", label: "해외직구만", hint: "아이허브 등, 배송 3~10일" },
  { value: "all", label: "모두" },
];
