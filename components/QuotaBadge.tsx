"use client";

import { useQuotaUsed } from "@/lib/quota";

export default function QuotaBadge() {
  const used = useQuotaUsed();
  return (
    <span
      className="quota-badge"
      title={
        "이 브라우저 세션에서 추정한 사용량입니다. 페이지를 새로고침하면 0으로 초기화됩니다. " +
        "YouTube 무료 한도는 키당 하루 10,000유닛(태평양 시간 자정 기준 리셋)입니다. " +
        "CDN 캐시로 응답된 요청은 할당량을 쓰지 않으며, 같은 키를 다른 기기·앱에서도 쓰면 실제 소비량은 이 값보다 클 수 있습니다."
      }
    >
      이번 세션 추정 ~{used.toLocaleString()} / 10,000
    </span>
  );
}
