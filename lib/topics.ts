/**
 * 큐레이션 주제(개발·IT·AI 버티컬)의 키·라벨·사이드바 메타.
 * 서버 의존성이 없어 클라이언트에서도 안전하게 import할 수 있다.
 * (실제 검색어는 lib/youtube.ts의 CURATED_QUERIES가 같은 키로 관리)
 */
export const CURATED_TOPICS = [
  "ai",
  "lang",
  "frontend",
  "backend",
  "swdev",
  "data",
  "cloud",
  "semicon",
  "security",
] as const;

export type CuratedTopic = (typeof CURATED_TOPICS)[number];

export function isCuratedTopic(v: string): v is CuratedTopic {
  return (CURATED_TOPICS as readonly string[]).includes(v);
}

export interface TopicMeta {
  key: CuratedTopic;
  icon: string;
  label: string;
  sub: string;
}

/** 사이드바 표시 순서·라벨 */
export const TOPIC_META: TopicMeta[] = [
  { key: "ai", icon: "🤖", label: "AI/LLM", sub: "인공지능·모델" },
  { key: "lang", icon: "⌨️", label: "컴퓨터 언어", sub: "언어·문법" },
  { key: "frontend", icon: "🎨", label: "웹/프론트엔드", sub: "React·UI" },
  { key: "backend", icon: "🛠️", label: "웹/백엔드", sub: "API·서버" },
  { key: "swdev", icon: "🏗️", label: "소프트웨어 개발", sub: "설계·커리어" },
  { key: "data", icon: "🗄️", label: "데이터", sub: "DB·분석" },
  { key: "cloud", icon: "☁️", label: "클라우드/DevOps", sub: "인프라·CI/CD" },
  { key: "semicon", icon: "🔌", label: "반도체/디바이스", sub: "칩·GPU" },
  { key: "security", icon: "🔒", label: "보안", sub: "해킹·취약점" },
];
