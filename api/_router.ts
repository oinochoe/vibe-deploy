/**
 * Lambda 엔트리포인트 (template.yml 의 Handler: _router.handler).
 * 라우트 목록은 scripts/gen-api-routes.mjs 가 api/*.ts 를 스캔해 자동 생성한다.
 *
 * sam build 시 esbuild 가 이 파일을 시작점으로 import 를 따라가며
 * _generated/routes.ts → 모든 api/*.ts 핸들러 → _lib/* 를 하나의 _router.js 로 번들한다.
 * 그래서 _generated/routes.ts 는 sam build 전에 반드시 생성되어 있어야 한다 (CI 의 typecheck 단계).
 */
import { routes } from "./_generated/routes";
import { createLambdaHandler } from "./_lib/lambda";

export const handler = createLambdaHandler(routes);
