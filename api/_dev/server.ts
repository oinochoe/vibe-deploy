/**
 * 로컬 개발용 API 서버 (npm run dev:api → http://localhost:3001).
 * Lambda 와 동일한 dispatch 로직을 사용하므로, 여기서 동작하면 배포 후에도 같은 응답을 낸다.
 * 이 파일은 _router.ts 에서 import 되지 않으므로 Lambda 번들에는 포함되지 않는다.
 */
import { createServer } from "node:http";
import { routes } from "../_generated/routes";
import { dispatch, parseBody } from "../_lib/http";

const PORT = Number(process.env.PORT ?? 3001);

createServer(async (req, res) => {
  // 프로덕션에서는 Function URL 이 CORS 를 처리하므로, 로컬에서만 그 역할을 흉내 낸다.
  // (vite proxy 를 거치면 같은 origin 이라 필요 없지만, VITE_API_URL 로 직접 호출할 때를 위해 둔다)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  // CORS preflight 는 핸들러까지 보내지 않고 바로 응답
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }

  // 요청 본문을 끝까지 읽어 문자열로 모은다 (Lambda 이벤트의 event.body 에 해당)
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  // node:http 는 중복 헤더를 배열로 주므로, Lambda 이벤트처럼 쉼표로 합친 문자열로 맞춘다
  const headers = Object.fromEntries(
    Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : v]),
  );

  const result = await dispatch(routes, {
    method: req.method ?? "GET",
    url: url.pathname,
    query: Object.fromEntries(url.searchParams),
    headers,
    body: parseBody(Buffer.concat(chunks).toString("utf8"), headers["content-type"]),
  });

  res.writeHead(result.statusCode, result.headers).end(result.body);
}).listen(PORT, () => {
  console.log(`API dev server: http://localhost:${PORT} (routes: ${Object.keys(routes).join(", ")})`);
});
