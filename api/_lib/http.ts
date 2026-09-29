/**
 * Next.js API Routes 스타일의 (req, res) 추상화.
 * 핸들러는 이 타입만 알면 되고, Lambda / 로컬 dev 서버 차이는 어댑터가 흡수한다.
 *
 * 요청 흐름:
 *   [Lambda]  Function URL 이벤트 → _lib/lambda.ts ─┐
 *   [로컬]    node:http 요청      → _dev/server.ts ─┴→ dispatch() → api/<route>.ts 핸들러
 *                                                     ↓
 *                                                 ApiResult { statusCode, headers, body }
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

/** 라우트 이름(파일명) → 핸들러. api/_generated/routes.ts 가 이 타입으로 생성된다. */
export type RouteMap = Record<string, ApiHandler>;

/**
 * 핸들러에 넘길 res 객체와, 그 호출 결과가 쌓이는 result 를 함께 만든다.
 * res 는 실제 소켓에 쓰지 않고 result 만 채운다 → Lambda 는 result 를 그대로 반환하고,
 * dev 서버는 result 를 node:http 응답으로 옮겨 쓴다.
 */
function createResponse(): { res: ApiResponse; result: ApiResult } {
  const result: ApiResult = { statusCode: 200, headers: {}, body: "" };
  const res: ApiResponse = {
    status(code) {
      result.statusCode = code;
      return res;
    },
    setHeader(name, value) {
      // 헤더 이름은 소문자로 정규화 (Function URL 응답·HTTP/2 모두 소문자 기준)
      result.headers[name.toLowerCase()] = value;
      return res;
    },
    json(data) {
      // ??= : 핸들러가 content-type 을 먼저 지정했다면 덮어쓰지 않는다
      result.headers["content-type"] ??= "application/json; charset=utf-8";
      result.body = JSON.stringify(data);
    },
    send(data) {
      result.headers["content-type"] ??= "text/plain; charset=utf-8";
      result.body = data;
    },
    // Next.js 호환용. 응답은 핸들러가 끝난 뒤 result 로 한꺼번에 나가므로 할 일이 없다.
    end() {},
  };
  return { res, result };
}

/** content-type 이 JSON 이면 파싱하고, 그 외(또는 깨진 JSON)는 원문 문자열 그대로 돌려준다. */
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

/**
 * `/hello` 또는 `/api/hello` → `hello`
 * - Function URL 은 `/hello` 로, 로컬 vite proxy 는 `/api/hello` 로 들어오므로 둘 다 허용한다.
 * - 첫 세그먼트만 라우트로 본다 (`/hello/x` 도 hello 핸들러로 간다. 하위 경로는 req.url 로 직접 해석).
 */
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
    // 스택트레이스는 로그(CloudWatch)에만 남기고, 클라이언트에는 내부 정보를 노출하지 않는다
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
  return result;
}
