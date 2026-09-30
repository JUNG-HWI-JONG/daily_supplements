import type { Metadata } from "next";
import { ResultView } from "@/components/result/result-view";

export const metadata: Metadata = { title: "추천 결과" };

export default function ResultPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">추천 결과</h1>
      <ResultView />
    </main>
  );
}
