# vibe-deploy — AI 코딩 규칙

Vite(React + TS) 프론트엔드와 AWS Lambda 백엔드가 공존하는 모노레포 PoC.
**아래 구조와 규칙을 반드시 지킨다. 새 폴더/빌드 도구/배포 방식을 임의로 추가하지 않는다.**

## 디렉터리 구조

```
src/                  프론트엔드 (Vite + React + TS) → GitHub Pages
  lib/api.ts          백엔드 호출 유일한 진입점 (apiFetch)
api/                  백엔드 (Lambda, 자체 package.json)
  <route>.ts          API 라우트 1개 = 파일 1개. 파일명(kebab-case) = URL 경로
  _router.ts          Lambda 엔트리포인트 (수정 불필요)
  _lib/               (req, res) 추상화 / Lambda 어댑터
  _dev/server.ts      로컬 dev 서버 (Lambda 와 같은 dispatch 사용)
  _generated/         자동 생성 (gitignore, 직접 수정 금지)
scripts/gen-api-routes.mjs   api/*.ts → api/_generated/routes.ts 생성
template.yml          AWS SAM: 단일 Lambda + Function URL
samconfig.toml        sam build/deploy 기본값
.github/workflows/deploy.yml  (main push) SAM 배포 → VITE_API_URL 주입 → Vite 빌드 → Pages
.github/workflows/ci.yml      (PR) 타입체크 + Vite 빌드 + sam validate/build — 배포 없음
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
- 모든 라우트는 **하나의 Lambda** 로 번들된다(esbuild). 라우트마다 template.yml 에 함수를 추가하지 않는다.
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

- `main` push 시 `.github/workflows/deploy.yml` 이 자동 배포한다. 수동 `sam deploy` 는 하지 않는다.
- AWS 인증은 GitHub OIDC (`secrets.AWS_ROLE_ARN`). Access Key 를 secrets 에 넣지 않는다.

## 작성 언어

- PR 제목·본문, 커밋 메시지, PR/이슈 코멘트, 리뷰 답글은 항상 **한국어**로 작성한다. (코드 식별자, 명령어, 파일 경로는 원문 그대로)
