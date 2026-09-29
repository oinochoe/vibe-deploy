import type { ApiRequest, ApiResponse } from "./_lib/http";

/**
 * GET /hello?name=xxx → { message, timestamp }
 * 파일명(hello.ts)이 곧 경로(/hello)다. default export 만 하면 라우트 등록은 자동.
 */
export default function hello(req: ApiRequest, res: ApiResponse) {
  // 허용하지 않는 메서드는 405 + Allow 헤더 (HTTP 스펙상 Allow 가 필수)
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET").status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const name = req.query.name ?? "world";
  res.status(200).json({
    message: `Hello, ${name}!`,
    timestamp: new Date().toISOString(),
  });
}
