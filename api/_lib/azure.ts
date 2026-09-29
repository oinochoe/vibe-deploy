import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { dispatch, parseBody, type RouteMap } from "./http";

/**
 * [Azure 어댑터] Azure Functions(v4 프로그래밍 모델) HTTP 요청을 (req, res) 핸들러 호출로 변환한다.
 * AWS 의 _lib/lambda.ts 와 같은 역할이며, 핸들러(api/*.ts)와 dispatch() 는 두 클라우드가 공유한다.
 *
 * Azure Static Web Apps 에서는 웹과 API 가 같은 도메인이다 (웹 /, API /api/*).
 * 그래서 CORS 설정이 필요 없고, 프론트는 VITE_API_URL 없이 기본값 "/api" 로 호출한다.
 */
export function createAzureHandler(routes: RouteMap) {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    // request.url 은 전체 주소(https://<앱>/api/hello?name=x). 경로만 떼어낸다 → "/api/hello"
    // resolveRouteName() 이 앞의 "api" 를 떼므로 AWS(/hello)와 같은 라우트 이름(hello)이 된다.
    const url = new URL(request.url);

    // 본문은 스트림이라 한 번만 읽을 수 있다. GET 등 본문이 없으면 빈 문자열이 온다.
    const rawBody = await request.text();

    const result = await dispatch(routes, {
      method: request.method,
      url: url.pathname,
      // URLSearchParams / Headers → 일반 객체. 같은 키가 여러 번 오면 마지막 값만 남는다 (Lambda 와 동일하게 단순화)
      query: Object.fromEntries(request.query),
      // Headers 는 이름을 소문자로 돌려준다 → Lambda Function URL 과 같은 형태
      headers: Object.fromEntries(request.headers),
      body: parseBody(rawBody || undefined, request.headers.get("content-type") ?? undefined),
    });

    // 500 등 핸들러 오류는 dispatch() 가 console.error 로 남기고, Azure 에서는 Application Insights 로 모인다
    if (result.statusCode >= 500) context.warn(`${request.method} ${url.pathname} → ${result.statusCode}`);

    return { status: result.statusCode, headers: result.headers, body: result.body };
  };
}
