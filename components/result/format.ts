import type { Form, Tier } from "@/lib/engine";

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export const tierInfo: Record<Tier, { label: string; description: string }> = {
  core: { label: "핵심", description: "가장 먼저 챙기면 좋아요" },
  recommended: { label: "권장", description: "여유가 되면 함께 드세요" },
  optional: { label: "선택", description: "예산이 남으면 고려해보세요" },
};

const formInfo: Record<Form, { label: string; unit: string }> = {
  tablet: { label: "정제", unit: "정" },
  capsule: { label: "캡슐", unit: "캡슐" },
  softgel: { label: "연질캡슐", unit: "캡슐" },
  powder: { label: "분말·스틱", unit: "포" },
  liquid: { label: "액상", unit: "회분" },
  gummy: { label: "구미", unit: "개" },
  chewable: { label: "츄어블", unit: "정" },
};

export const formLabel = (f: Form) => formInfo[f].label;
export const unitOf = (f: Form) => formInfo[f].unit;
