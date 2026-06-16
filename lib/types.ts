export interface Category {
  id: string;
  title: string;
}

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  categoryId: string;
  publishedAt: string;
  thumbnail: string;
  tags: string[];
  // statistics
  views: number;
  likes: number;
  comments: number;
  // derived metrics
  durationSec: number;
  engagementRate: number; // (likes + comments) / views
  velocity: number; // views per hour since publish
  videoUrl: string;
  channelUrl: string;
}

export interface CommentItem {
  id: string;
  author: string;
  authorImage: string;
  text: string;
  likes: number;
  publishedAt: string;
  replyCount: number;
}

export interface CommentsResponse {
  disabled?: boolean;
  items: CommentItem[];
}

/** 클라이언트로 전달되는 정규화된 에러 형태 */
export interface ApiError {
  error: string;
  reason?: string;
}

export type SortKey =
  | "views"
  | "likes"
  | "comments"
  | "engagement"
  | "velocity"
  | "newest";

export type LengthBucket = "all" | "mid" | "long";
