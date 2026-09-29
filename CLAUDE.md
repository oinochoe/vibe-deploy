# vibe-deploy — AI 코딩 규칙

Vite(React + TS) 프론트엔드와 AWS Lambda 백엔드가 공존하는 모노레포 PoC.
**아래 구조와 규칙을 반드시 지킨다. 새 폴더/빌드 도구/배포 방식을 임의로 추가하지 않는다.**

## 디렉터리 구조

```
src/                  프론트엔드 (Vite + React + TS) → GitHub Pages
  lib/api.ts          백엔드 호출 유일한 진입점 (apiFetch)
api/                  백엔드 (Lambda, 자체 package.json)
  <route>.ts          API 라우트 1개 = 파일 1개. 파일명(kebab-case) = URL 경로
  _router.ts          [AWS] Lambda 엔트리포인트 (수정 불필요)
  _azure.ts           [Azure] Functions 엔트리포인트 (수정 불필요)
  _lib/               (req, res) 추상화 + 클라우드별 어댑터 (lambda.ts, azure.ts)
  _dev/server.ts      로컬 dev 서버 (Lambda 와 같은 dispatch 사용)
  _generated/         자동 생성 (gitignore, 직접 수정 금지)
scripts/gen-api-routes.mjs   api/*.ts → api/_generated/routes.ts 생성
template.yml          [AWS] SAM: 단일 Lambda + Function URL
host.json (api/)      [Azure] Functions 호스트 설정
staticwebapp.config.json  [Azure] Static Web Apps 설정
samconfig.toml        sam build/deploy 기본값
.gitlab-ci.yml               (사내 GitLab, main 커밋) SAM 배포 → VITE_API_URL 주입 → Vite 빌드 → GitLab Pages
scripts/ci/                  파이프라인이 실행하는 배포 스크립트 (deploy-api.sh, build-web.sh)
.github/workflows/deploy.yml  (GitHub PoC, main push) 위와 같은 흐름 → GitHub Pages
.github/workflows/ci.yml      (GitHub PoC, PR) 타입체크 + Vite 빌드 + sam validate/build — 배포 없음
```

## 백엔드 규칙 (api/)

- 라우트는 `api/<name>.ts` 에 **default export** 로 Next.js API Routes 스타일 핸들러를 작성한다.
  ```ts
  import type { ApiRequest, ApiResponse } from "./_lib/http";
  export default async function handler(req: ApiRequest, res: ApiResponse) {
    if (req.method !== "GET") { res.setHeader("Allow", "GET").status(405).json({ error: "Method Not Allowed" }); return; }
    res.status(200).json({ ok: true });
  }
  ```
- 파일명은 kebab-case (`user-profile.ts` → `/user-profile`). `_` 로 시작하는 파일/폴더는 라우트가 아니다.
- 라우트 등록은 자동이다. `_router.ts` 나 `_generated/` 를 손으로 고치지 않는다.
- 모든 라우트는 **하나의 Lambda(또는 Azure Function 하나)** 로 번들된다(esbuild). 라우트마다 template.yml 이나 Azure 함수를 추가하지 않는다.
- 핸들러는 클라우드와 무관하게 작성한다. `@azure/functions`, `aws-lambda` 는 `_lib/azure.ts`, `_lib/lambda.ts` 어댑터에서만 import 한다.
- 핸들러에서 `Access-Control-*` 헤더를 설정하지 않는다. CORS 는 Function URL(template.yml)이 처리한다.
- 런타임 의존성이 필요하면 `api/package.json` 의 `dependencies` 에 추가한다(esbuild 가 번들). 프론트 package.json 에 넣지 않는다.
- `esbuild` 는 `sam build` 가 `--omit=dev` 로 설치하므로 반드시 `dependencies` 에 있어야 한다.
- Node 내장 모듈은 `node:` 접두사로 import. 비밀값은 코드에 두지 않는다.

## 프론트엔드 규칙 (src/)

- 백엔드 호출은 `src/lib/api.ts` 의 `apiFetch()` 만 사용한다. URL 을 하드코딩하지 않는다.
- API 주소는 `import.meta.env.VITE_API_URL` 로만 주입된다. CI 가 `.env.production` 을 생성하므로 이 파일을 커밋하지 않는다.
- 에셋 경로는 상대경로/`import` 를 사용한다 (Pages 는 `/<repo>/` 하위에서 서빙됨, `base` 는 CI 가 `VITE_BASE` 로 설정).

## 로컬 개발

```bash
npm ci && npm ci --prefix api
npm run dev:api   # http://localhost:3001
npm run dev       # http://localhost:5173 (/api → 3001 프록시)
npm run typecheck # 프론트 + api 타입체크 (커밋 전 필수)
```

## 배포

- 기본 브랜치(main)에 커밋되면 파이프라인이 MR/PR 없이 바로 배포한다. 수동 `sam deploy` 는 하지 않는다.
- 파이프라인 검사(타입체크 · 빌드 · 배포 확인)에 실패하면 배포되지 않고 이전 버전이 유지된다. 실패 로그를 읽고 코드를 고쳐 다시 커밋한다.
- `.gitlab-ci.yml`, `scripts/ci/`, `template.yml`, `api/_router.ts`, `api/_lib/` 는 플랫폼 파일이다. 기능 구현 중에 수정하지 않는다.
- AWS 인증은 OIDC(`AWS_ROLE_ARN`) 또는 러너의 IAM Role. Access Key 를 코드나 변수에 넣지 않는다.

## 작성 언어

- PR 제목·본문, 커밋 메시지, PR/이슈 코멘트, 리뷰 답글은 항상 **한국어**로 작성한다. (코드 식별자, 명령어, 파일 경로는 원문 그대로)

## 보안: 사내 정보 공개 금지

- 이 저장소는 공개(GitHub)다. 사내 호스트명·도메인, 서버·러너 이름, 사내 프로젝트 경로, AWS 계정 ID, 내부 URL 을 파일·커밋 메시지·PR·코멘트에 적지 않는다.
- 예시가 필요하면 `gitlab.example.com`, `pages.example.com`, `<계정ID>`, `<그룹>` 같은 자리표시자를 쓴다.
