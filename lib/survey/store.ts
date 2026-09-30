"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { Diet, Lifestyle, Pregnancy, Preferences, Sex, Shift, SymptomInput } from "@/lib/engine";

/** 설문 작성 중 상태. null = 아직 답하지 않음 (필수 질문) */
export interface SurveyDraft {
  step: number;
  profile: {
    sex: Sex | null;
    age: number | null;
    pregnancy: Pregnancy;
    diet: Diet;
    medications: string[] | null;
    conditions: string[] | null;
    allergies: string[];
  };
  lifestyle: Omit<Lifestyle, "job" | "shift"> & { job: string | null; shift: Shift | null };
  symptoms: SymptomInput[];
  emergencies: string[] | null;
  preferences: Preferences;
}

/** 선택 질문의 기본값은 어떤 규칙도 발동시키지 않는 '보통' 값 */
export const initialDraft: SurveyDraft = {
  step: 0,
  profile: { sex: null, age: null, pregnancy: "none", diet: "omnivore", medications: null, conditions: null, allergies: [] },
  lifestyle: {
    job: null, shift: null, workEnv: [],
    sleepHours: 7, sleepQuality: 3, mealsPerDay: 3, eatingOut: "sometimes", vegFruit: "mid", dairy: "mid",
    fishPerWeek: 1, alcoholPerWeek: 0, smoking: false, caffeineCups: 1, exercise: "light", stress: 3,
  },
  symptoms: [],
  emergencies: null,
  preferences: { durationMonths: 3, monthlyBudget: 30000, forms: [], pillSize: "any", maxPillsPerDay: 4, mode: "auto", scope: "domestic" },
};

interface SurveyActions {
  setStep: (step: number) => void;
  setProfile: (patch: Partial<SurveyDraft["profile"]>) => void;
  setLifestyle: (patch: Partial<SurveyDraft["lifestyle"]>) => void;
  setPreferences: (patch: Partial<Preferences>) => void;
  toggleSymptom: (id: string) => void;
  updateSymptom: (id: string, patch: Partial<SymptomInput>) => void;
  setEmergencies: (ids: string[] | null) => void;
  reset: () => void;
}

/** 사생활 보호 모드 등에서 localStorage 접근이 막혀도 설문은 동작해야 함 */
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  },
};

export const useSurvey = create<SurveyDraft & SurveyActions>()(
  persist(
    (set) => ({
      ...initialDraft,
      setStep: (step) => set({ step }),
      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      setLifestyle: (patch) => set((s) => ({ lifestyle: { ...s.lifestyle, ...patch } })),
      setPreferences: (patch) => set((s) => ({ preferences: { ...s.preferences, ...patch } })),
      toggleSymptom: (id) =>
        set((s) => ({
          symptoms: s.symptoms.some((x) => x.id === id)
            ? s.symptoms.filter((x) => x.id !== id)
            : [...s.symptoms, { id, frequency: "often", duration: "1m" }],
        })),
      updateSymptom: (id, patch) => set((s) => ({ symptoms: s.symptoms.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      setEmergencies: (emergencies) => set({ emergencies }),
      reset: () => set(initialDraft),
    }),
    {
      name: "survey-draft-v1",
      storage: createJSONStorage(() => safeStorage),
      skipHydration: true,
      partialize: ({ step, profile, lifestyle, symptoms, emergencies, preferences }) => ({ step, profile, lifestyle, symptoms, emergencies, preferences }),
    },
  ),
);
