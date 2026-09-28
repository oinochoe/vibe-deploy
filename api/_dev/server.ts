/** 로컬 개발용 API 서버. Lambda 와 동일한 dispatch 로직을 사용한다. */
import { createServer } from "node:http";
import { routes } from "../_generated/routes";
import { dispatch, parseBody } from "../_lib/http";

const PORT = Number(process.env.PORT ?? 3001);

createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
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
