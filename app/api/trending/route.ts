import { NextRequest, NextResponse } from "next/server";
import {
  errorResponse,
  getRequestApiKey,
  missingKeyResponse,
} from "@/lib/route-helpers";
import { fetchTrending } from "@/lib/youtube";

export async function GET(req: NextRequest) {
  const apiKey = getRequestApiKey(req);
  if (!apiKey) return missingKeyResponse();

  const sp = req.nextUrl.searchParams;
  const regionCode = sp.get("regionCode") || "KR";
  const categoryId = sp.get("categoryId") || undefined;
  const max = Math.min(100, Math.max(1, Number(sp.get("max")) || 50));

  try {
    const result = await fetchTrending(regionCode, categoryId, max, apiKey);
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
