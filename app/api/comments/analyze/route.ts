import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import {
  getRequestApiKey,
  getRequestAiKey,
  errorResponse,
  missingKeyResponse,
} from "@/lib/route-helpers";
import { getCached, setCached } from "@/lib/cache";
import { fetchComments, type QuotaCost } from "@/lib/youtube";
import type { AiAnalysis } from "@/lib/types";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * 댓글 표본(최대 100건)을 사용자 Gemini 키로 요약 + 감정 + 핵심 주제 분석.
 * - YouTube 키(x-youtube-api-key): 댓글 수집용 (BYO)
 * - Gemini 키(x-ai-api-key): AI 분석용 (BYO, 선택). 없으면 401 missingAiKey.
 * 결과는 ai:{videoId}:{order} 키로 1시간 캐시(키와 무관 = 공개 댓글 분석이라 공유 OK).
 */
export async function GET(req: NextRequest) {
  const ytKey = getRequestApiKey(req);
  if (!ytKey) return missingKeyResponse();

  const aiKey = getRequestAiKey(req);
  if (!aiKey) {
    return NextResponse.json(
      {
        error: "AI 키가 필요합니다. 우측 상단에서 Gemini 키를 입력하세요.",
        reason: "missingAiKey",
      },
      { status: 401, headers: NO_STORE }
    );
  }

  const sp = req.nextUrl.searchParams;
  const videoId = sp.get("videoId");
  const order = sp.get("order") === "time" ? "time" : "relevance";
  if (!videoId) {
    return NextResponse.json(
      { error: "videoId가 필요합니다.", reason: "badRequest" },
      { status: 400, headers: NO_STORE }
    );
  }

  const cacheKey = `ai:${videoId}:${order}`;
  const hit = getCached<AiAnalysis>(cacheKey);
  if (hit) {
    return NextResponse.json(hit, {
      headers: { ...NO_STORE, "X-Yt-Quota-Cost": "0" },
    });
  }

  try {
    const cost: QuotaCost = { units: 0 };
    const { disabled, items } = await fetchComments(
      videoId,
      order,
      100,
      ytKey,
      cost
    );
    if (disabled || items.length === 0) {
      return NextResponse.json(
        { disabled: true },
        { headers: { ...NO_STORE, "X-Yt-Quota-Cost": String(cost.units) } }
      );
    }

    const analysis = await analyze(
      aiKey,
      items.map((c) => c.text)
    );
    setCached(cacheKey, analysis, 60 * 60 * 1000); // 1시간
    return NextResponse.json(analysis, {
      headers: { ...NO_STORE, "X-Yt-Quota-Cost": String(cost.units) },
    });
  } catch (e) {
    return errorResponse(e);
  }
}

async function analyze(
  apiKey: string,
  comments: string[]
): Promise<AiAnalysis> {
  const ai = new GoogleGenAI({ apiKey });
  const sample = comments.slice(0, 100);
  const prompt =
    `다음은 한 유튜브 영상의 댓글 ${sample.length}건이다. 한국어로 분석하라.\n` +
    `- summary: 전체 반응을 3~4문장으로 요약\n` +
    `- sentiment: positive/negative/neutral 비율(정수, 합 100)\n` +
    `- themes: 자주 등장하는 핵심 주제 최대 5개(짧은 명사구)\n\n` +
    sample.map((c, i) => `${i + 1}. ${c}`).join("\n");

  const res = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          sentiment: {
            type: Type.OBJECT,
            properties: {
              positive: { type: Type.NUMBER },
              negative: { type: Type.NUMBER },
              neutral: { type: Type.NUMBER },
            },
            required: ["positive", "negative", "neutral"],
          },
          themes: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["summary", "sentiment", "themes"],
      },
    },
  });

  return JSON.parse(res.text ?? "{}") as AiAnalysis;
}
