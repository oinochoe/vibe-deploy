/**
 * Next.js API Routes 스타일의 (req, res) 추상화.
 * 핸들러는 이 타입만 알면 되고, Lambda / 로컬 dev 서버 차이는 어댑터가 흡수한다.
 */

export interface ApiRequest {
  method: string;
  /** 라우트 이후 경로 포함 원본 경로 (예: /hello) */
  url: string;
  query: Record<string, string | undefined>;
  headers: Record<string, string | undefined>;
  /** JSON 이면 파싱된 객체, 아니면 원문 문자열, 없으면 undefined */
  body: unknown;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  setHeader(name: string, value: string): ApiResponse;
  json(data: unknown): void;
  send(data: string): void;
  end(): void;
}

export type ApiHandler = (req: ApiRequest, res: ApiResponse) => void | Promise<void>;

export interface ApiResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export type RouteMap = Record<string, ApiHandler>;

function createResponse(): { res: ApiResponse; result: ApiResult } {
  const result: ApiResult = { statusCode: 200, headers: {}, body: "" };
  const res: ApiResponse = {
    status(code) {
      result.statusCode = code;
      return res;
    },
    setHeader(name, value) {
      result.headers[name.toLowerCase()] = value;
      return res;
    },
    json(data) {
      result.headers["content-type"] ??= "application/json; charset=utf-8";
      result.body = JSON.stringify(data);
    },
    send(data) {
      result.headers["content-type"] ??= "text/plain; charset=utf-8";
      result.body = data;
    },
    end() {},
  };
  return { res, result };
}

export function parseBody(raw: string | undefined, contentType: string | undefined): unknown {
  if (!raw) return undefined;
  if (contentType?.includes("application/json")) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

/** `/hello` 또는 `/api/hello` → `hello` */
export function resolveRouteName(path: string): string {
  const segments = path.split("/").filter(Boolean);
  if (segments[0] === "api") segments.shift();
  return segments[0] ?? "";
}

/** 경로에 맞는 핸들러를 찾아 실행하고 직렬화 가능한 결과를 돌려준다. */
export async function dispatch(routes: RouteMap, req: ApiRequest): Promise<ApiResult> {
  const { res, result } = createResponse();
  const handler = routes[resolveRouteName(req.url)];

  if (!handler) {
    res.status(404).json({ error: `No API route for ${req.url}` });
    return result;
  }

  try {
    await handler(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
  return result;
}
