import type { LambdaFunctionURLEvent, LambdaFunctionURLResult } from "aws-lambda";
import { dispatch, parseBody, type RouteMap } from "./http";

/**
 * Lambda Function URL (payload v2) 이벤트를 (req, res) 핸들러 호출로 변환한다.
 * CORS 헤더는 여기서 붙이지 않는다 — Function URL 의 Cors 설정(template.yml)이 응답에 자동으로 추가한다.
 */
export function createLambdaHandler(routes: RouteMap) {
  return async (event: LambdaFunctionURLEvent): Promise<LambdaFunctionURLResult> => {
    // Function URL 은 바이너리/일부 content-type 의 본문을 base64 로 인코딩해 전달한다
    const rawBody =
      event.body && event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf8")
        : event.body;

    const result = await dispatch(routes, {
      method: event.requestContext.http.method,
      url: event.rawPath, // 쿼리스트링 제외 경로 (예: /hello)
      query: event.queryStringParameters ?? {}, // 쿼리가 없으면 undefined 로 오므로 빈 객체로 보정
      headers: event.headers ?? {}, // Function URL 은 헤더 이름을 소문자로 전달한다
      body: parseBody(rawBody, event.headers?.["content-type"]),
    });

    // { statusCode, headers, body } 형태를 그대로 반환하면 Function URL 이 HTTP 응답으로 변환한다
    return result;
  };
}
