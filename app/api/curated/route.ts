import { NextRequest, NextResponse } from "next/server";
import {
  dataResponse,
  errorResponse,
  getRequestApiKey,
  missingKeyResponse,
} from "@/lib/route-helpers";
import { fetchCurated, isCuratedTopic, type QuotaCost } from "@/lib/youtube";

export async function GET(req: NextRequest) {
  const apiKey = getRequestApiKey(req);
  if (!apiKey) return missingKeyResponse();

  const sp = req.nextUrl.searchParams;
  const regionCode = sp.get("regionCode") || "KR";
  const topicParam = sp.get("topic") || "it";
  const max = Math.min(50, Math.max(1, Number(sp.get("max")) || 30));

  if (!isCuratedTopic(topicParam)) {
    return NextResponse.json(
      { error: "알 수 없는 토픽입니다.", reason: "badRequest" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const cost: QuotaCost = { units: 0 };
  try {
    const result = await fetchCurated(regionCode, topicParam, max, apiKey, cost);
    return dataResponse(result, { cost: cost.units, sMaxAge: 600, swr: 1800 });
  } catch (e) {
    return errorResponse(e);
  }
}
