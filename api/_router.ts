/**
 * Lambda 엔트리포인트 (template.yml 의 Handler: _router.handler).
 * 라우트 목록은 scripts/gen-api-routes.mjs 가 api/*.ts 를 스캔해 자동 생성한다.
 */
import { routes } from "./_generated/routes";
import { createLambdaHandler } from "./_lib/lambda";

export const handler = createLambdaHandler(routes);
