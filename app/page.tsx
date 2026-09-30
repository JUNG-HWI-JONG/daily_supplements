import Link from "next/link";
import { ClockIcon, ShieldCheckIcon, SmartphoneIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const points = [
  { icon: ClockIcon, title: "3분이면 끝", body: "직업·근무환경·불편한 곳만 고르면 돼요. 영양제 지식은 필요 없어요." },
  { icon: ShieldCheckIcon, title: "안전 먼저", body: "먹고 있는 약, 하루 최대 섭취량, 같이 먹으면 안 되는 조합을 확인해요." },
  { icon: SmartphoneIcon, title: "내 기기에만 저장", body: "가입이 없고, 입력한 건강 정보는 서버로 보내지 않아요." },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-12">
      <p className="text-sm font-medium text-primary">데일리 영양제</p>
      <h1 className="mt-2 text-3xl leading-tight font-bold">
        나한테 맞는 영양제,
        <br />
        언제 뭘 먹을지까지
      </h1>
      <p className="mt-4 text-muted-foreground">생활환경과 불편한 곳을 알려주면 영양제 조합, 복용 시간표, 구매 링크를 정리해드려요.</p>

      <ul className="mt-10 space-y-5">
        {points.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3">
            <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ul>

      <Link href="/survey" className={cn(buttonVariants(), "mt-12 h-12 text-base")}>
        시작하기
      </Link>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        이 서비스는 의학적 진단을 대체하지 않으며, 전문가 검수를 거치지 않은 개인 프로젝트입니다. 질환이 있거나 약을 먹고 있다면 약사·의사와 상담하세요.
      </p>
    </main>
  );
}
