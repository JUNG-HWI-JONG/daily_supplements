import type { Metadata } from "next";
import { SurveyWizard } from "@/components/survey/survey-wizard";

export const metadata: Metadata = { title: "설문" };

export default function SurveyPage() {
  return (
    <main className="flex flex-1 flex-col px-4">
      <SurveyWizard />
    </main>
  );
}
