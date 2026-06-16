# YouTube 트렌드 분석 툴

지역·카테고리별 급상승 동영상(TOP 100), 교육 분야 TOP 30을 **분석 지표**(engagement rate · velocity)와 **집계**(채널 랭킹 · 키워드 빈도 · 길이/시간대 분포)로 보여주고, 영상별 댓글을 조회하는 Next.js 앱입니다.

## 주요 기능

- 🌍 **국가 선택** — 지역(regionCode)별 급상승 트렌드
- 🔥 **급상승 TOP 100** — 카테고리별 필터 (50개×2페이지 페이징)
- 🎓 **교육 TOP 30** — 교육 카테고리(ID 27) 프리셋
- 📊 **분석 지표** — engagement rate(`(좋아요+댓글)/조회수`), velocity(`조회수/업로드후경과시간`)
- 🔠 **정렬·필터** — 조회수/좋아요/댓글/engagement/velocity/최신, 최소 조회수·검색·길이 필터
- 📈 **집계 시각화** — 채널 랭킹, 키워드·태그 빈도, 길이/업로드 시간대 분포
- 💬 **댓글 조회** — 영상별 댓글 온디맨드 로드 (관련성/최신순)
- ⬇️ **CSV 내보내기** — 현재 목록을 분석용 CSV로 다운로드
- 🔗 카드에서 YouTube 영상·채널 바로가기
- ⚡ 인메모리 캐싱으로 API 할당량(일 10,000유닛) 절약

## 시작하기

### 1. YouTube Data API 키 발급

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **API 및 서비스 → 라이브러리** → "YouTube Data API v3" 사용 설정
3. **사용자 인증 정보 → 사용자 인증 정보 만들기 → API 키**

### 2. 설치 및 실행

```bash
npm install
npm run dev
# http://localhost:3000
```

### 3. 키 입력

앱 화면 **우측 상단**에 발급받은 API 키를 입력하면 됩니다.

- 각 사용자가 **자신의 키(= 자신의 무료 할당량)** 로 조회하므로, 서비스 운영자에게
  비용이 누적되지 않습니다.
- 키는 **브라우저 localStorage에만** 저장되고, 요청 시 헤더(`x-youtube-api-key`)로 서버에
  전달되어 YouTube 호출에만 쓰입니다. 서버에 영구 저장하지 않으며, **환경 변수 키는
  사용하지 않습니다**(키가 없으면 401 응답).

## API 라우트 (서버 전용)

| 라우트 | 설명 |
| --- | --- |
| `GET /api/categories?regionCode=KR` | 지역별 영상 카테고리 목록 |
| `GET /api/trending?regionCode=KR&categoryId=27&max=100` | 급상승 영상 (지표 계산 포함) |
| `GET /api/comments?videoId=...&order=relevance&max=30` | 영상 댓글 |

## 할당량 참고

- `videos.list`·`videoCategories.list`·`commentThreads.list` = 호출당 **1유닛**
- TOP 100 = 50×2 페이징 = 2유닛 / 동일 조건 재요청은 캐시(10분) 적중으로 0유닛
- `search.list`(100유닛)는 사용하지 않습니다.
