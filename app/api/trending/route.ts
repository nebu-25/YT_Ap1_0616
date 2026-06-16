import { NextRequest } from "next/server";
import {
  dataResponse,
  errorResponse,
  getRequestApiKey,
  missingKeyResponse,
} from "@/lib/route-helpers";
import { fetchTrending, type QuotaCost } from "@/lib/youtube";

export async function GET(req: NextRequest) {
  const apiKey = getRequestApiKey(req);
  if (!apiKey) return missingKeyResponse();

  const sp = req.nextUrl.searchParams;
  const regionCode = sp.get("regionCode") || "KR";
  const categoryId = sp.get("categoryId") || undefined;
  const max = Math.min(100, Math.max(1, Number(sp.get("max")) || 50));

  const cost: QuotaCost = { units: 0 };
  try {
    const result = await fetchTrending(regionCode, categoryId, max, apiKey, cost);
    return dataResponse(result, { cost: cost.units, sMaxAge: 600, swr: 1800 });
  } catch (e) {
    return errorResponse(e);
  }
}
