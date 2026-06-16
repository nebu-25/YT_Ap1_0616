"use client";

import { useQuotaUsed } from "@/lib/quota";

export default function QuotaBadge() {
  const used = useQuotaUsed();
  return (
    <span
      className="quota-badge"
      title="이번 세션 추정 할당량 사용량입니다. YouTube 무료 한도는 키당 하루 10,000유닛이며, CDN 캐시로 응답된 요청은 할당량을 쓰지 않습니다."
    >
      할당량 추정 ~{used.toLocaleString()} / 10,000
    </span>
  );
}
