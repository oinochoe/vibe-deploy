import type { LambdaFunctionURLEvent, LambdaFunctionURLResult } from "aws-lambda";
import { dispatch, parseBody, type RouteMap } from "./http";

/** Lambda Function URL (payload v2) 이벤트를 (req, res) 핸들러 호출로 변환한다. */
export function createLambdaHandler(routes: RouteMap) {
  return async (event: LambdaFunctionURLEvent): Promise<LambdaFunctionURLResult> => {
    const rawBody =
      event.body && event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf8")
        : event.body;

    const result = await dispatch(routes, {
      method: event.requestContext.http.method,
      url: event.rawPath,
      query: event.queryStringParameters ?? {},
      headers: event.headers ?? {},
      body: parseBody(rawBody, event.headers?.["content-type"]),
    });

    return result;
  };
}
