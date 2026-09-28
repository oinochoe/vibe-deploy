# Copilot instructions — vibe-deploy

이 저장소의 규칙 원문은 루트 `CLAUDE.md` 이다. 요약:

- 구조: `src/`(Vite React TS 프론트, GitHub Pages) + `api/`(AWS Lambda 백엔드, 자체 package.json). 새 최상위 폴더나 다른 프레임워크를 추가하지 말 것.
- API 라우트 = `api/<kebab-case>.ts` 의 default export `(req: ApiRequest, res: ApiResponse)` 핸들러. `./_lib/http` 에서 타입을 import.
- `_` 로 시작하는 파일은 라우트가 아님. `api/_generated/` 와 `api/_router.ts` 는 수정 금지 (라우트 자동 등록).
- 모든 라우트는 단일 Lambda + Function URL 로 배포. template.yml 에 함수를 추가하지 말 것.
- 핸들러에서 CORS 헤더 설정 금지 (Function URL 설정이 담당).
- 프론트는 `src/lib/api.ts` 의 `apiFetch()` 로만 백엔드 호출. API URL 은 `import.meta.env.VITE_API_URL` (CI 가 주입). 하드코딩 금지.
- `.env.production` 커밋 금지. AWS 자격증명은 OIDC 만 사용.
- 변경 후 `npm run typecheck` 가 통과해야 한다.
