/**
 * [Azure 진입점] Azure Functions 가 시작할 때 읽는 파일 (package.json 의 "main" → 빌드 결과 dist/azure.js).
 * AWS 의 _router.ts 와 같은 역할이다.
 *
 * 함수 하나("router")가 /api/ 아래 모든 경로와 메서드를 받아 dispatch() 로 넘긴다.
 * 그래서 api/*.ts 에 라우트를 추가해도 이 파일이나 Azure 설정은 바뀌지 않는다 (Lambda 하나로 묶는 AWS 와 같은 방식).
 *
 * 빌드: npm run build:azure (라우트 생성 → esbuild 로 dist/azure.js 번들)
 */
import { app } from "@azure/functions";
import { routes } from "./_generated/routes";
import { createAzureHandler } from "./_lib/azure";

app.http("router", {
  // 모든 HTTP 메서드. 허용 여부는 각 핸들러가 405 로 판단한다.
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
  // 로그인·권한은 함수 키가 아니라 Static Web Apps 의 인증 설정(staticwebapp.config.json)에서 건다
  authLevel: "anonymous",
  // Azure Functions 는 모든 함수 앞에 "/api" 를 붙인다 → 실제 주소는 /api/{*path}
  route: "{*path}",
  handler: createAzureHandler(routes),
});
