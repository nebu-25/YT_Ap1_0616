import { NextRequest } from "next/server";
import {
  dataResponse,
  errorResponse,
  getRequestApiKey,
  missingKeyResponse,
} from "@/lib/route-helpers";
import { fetchCategories, type QuotaCost } from "@/lib/youtube";

export async function GET(req: NextRequest) {
  const apiKey = getRequestApiKey(req);
  if (!apiKey) return missingKeyResponse();

  const regionCode = req.nextUrl.searchParams.get("regionCode") || "KR";
  const cost: QuotaCost = { units: 0 };
  try {
    const categories = await fetchCategories(regionCode, apiKey, cost);
    // 카테고리는 거의 변하지 않으므로 CDN에서 길게 캐싱
    return dataResponse(
      { categories },
      { cost: cost.units, sMaxAge: 86400, swr: 604800 }
    );
  } catch (e) {
    return errorResponse(e);
  }
}
