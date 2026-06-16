import { NextRequest, NextResponse } from "next/server";
import { YouTubeError } from "./youtube";

/** 사용자가 입력한 API 키를 요청 헤더에서 추출. */
export function getRequestApiKey(req: NextRequest): string {
  return req.headers.get("x-youtube-api-key")?.trim() || "";
}

const NO_STORE = { "Cache-Control": "no-store" };

/** 키 누락 시 401 응답 (라우트에서 공통 사용) */
export function missingKeyResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "YouTube API 키가 필요합니다. 우측 상단에서 키를 입력하세요.",
      reason: "missingKey",
    },
    { status: 401, headers: NO_STORE }
  );
}

/**
 * 성공 데이터 응답. Vercel CDN이 응답을 공유 캐싱하도록 s-maxage를 부여해
 * 사용자 간 할당량을 절약한다. cost(이번 호출이 실제 소비한 유닛)는 헤더로 전달.
 *
 * 주의: public 캐싱은 URL 기준으로만 동작하므로, 캐시 적중 시에는 키 검증 없이
 * 결과가 서빙될 수 있다(의도된 트레이드오프). 캐싱 대상은 공개 트렌드/영상/댓글
 * 데이터뿐이며 응답 본문에 API 키·개인정보는 포함하지 않는다. 자세한 내용은
 * README의 "캐싱 동작과 한계" 참고.
 */
export function dataResponse(
  data: unknown,
  opts: { cost: number; sMaxAge: number; swr: number }
): NextResponse {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": `public, s-maxage=${opts.sMaxAge}, stale-while-revalidate=${opts.swr}`,
      "X-Yt-Quota-Cost": String(opts.cost),
    },
  });
}

/** YouTubeError를 reason별 사용자 메시지 + 적절한 상태코드로 변환 */
export function errorResponse(e: unknown): NextResponse {
  if (e instanceof YouTubeError) {
    const KEY_INVALID_MSG =
      "API 키가 올바르지 않습니다. 우측 상단에서 키를 다시 확인하세요.";
    const messages: Record<string, string> = {
      quotaExceeded:
        "오늘의 YouTube API 할당량을 초과했습니다. 잠시 후 다시 시도하세요.",
      dailyLimitExceeded:
        "오늘의 YouTube API 할당량을 초과했습니다. 잠시 후 다시 시도하세요.",
      keyInvalid: KEY_INVALID_MSG,
      missingKey: e.message,
      badRequest: "잘못된 요청입니다. 입력값을 확인하세요.",
    };

    // 유효하지 않은 키는 보통 badRequest + "API key not valid" 메시지로 온다.
    const isKeyInvalid =
      e.reason === "keyInvalid" ||
      /API key not valid|API_KEY_INVALID/i.test(e.message);

    const message = isKeyInvalid
      ? KEY_INVALID_MSG
      : messages[e.reason] || e.message;
    const reason = isKeyInvalid ? "keyInvalid" : e.reason;
    const status = e.reason === "missingKey" ? 500 : e.status || 400;
    return NextResponse.json(
      { error: message, reason },
      { status, headers: NO_STORE }
    );
  }
  return NextResponse.json(
    { error: "예기치 못한 오류가 발생했습니다.", reason: "unknown" },
    { status: 500, headers: NO_STORE }
  );
}
