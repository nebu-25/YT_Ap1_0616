import { NextRequest, NextResponse } from "next/server";
import {
  errorResponse,
  getRequestApiKey,
  missingKeyResponse,
} from "@/lib/route-helpers";
import { fetchComments } from "@/lib/youtube";

export async function GET(req: NextRequest) {
  const apiKey = getRequestApiKey(req);
  if (!apiKey) return missingKeyResponse();

  const sp = req.nextUrl.searchParams;
  const videoId = sp.get("videoId");
  const order = sp.get("order") === "time" ? "time" : "relevance";
  const max = Math.min(100, Math.max(1, Number(sp.get("max")) || 30));

  if (!videoId) {
    return NextResponse.json(
      { error: "videoId가 필요합니다.", reason: "badRequest" },
      { status: 400 }
    );
  }

  try {
    const result = await fetchComments(videoId, order, max, apiKey);
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
