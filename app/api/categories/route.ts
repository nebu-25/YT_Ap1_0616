import { NextRequest, NextResponse } from "next/server";
import {
  errorResponse,
  getRequestApiKey,
  missingKeyResponse,
} from "@/lib/route-helpers";
import { fetchCategories } from "@/lib/youtube";

export async function GET(req: NextRequest) {
  const apiKey = getRequestApiKey(req);
  if (!apiKey) return missingKeyResponse();

  const regionCode = req.nextUrl.searchParams.get("regionCode") || "KR";
  try {
    const categories = await fetchCategories(regionCode, apiKey);
    return NextResponse.json({ categories });
  } catch (e) {
    return errorResponse(e);
  }
}
