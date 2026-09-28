# vibe-deploy

Vite(React + TS) 프론트엔드 + AWS Lambda(Function URL) 백엔드 모노레포 PoC.
`main` 에 push 하면 GitHub Actions 가 **SAM 배포 → Function URL 을 `VITE_API_URL` 로 주입 → Vite 빌드 → GitHub Pages 배포** 를 한 파이프라인으로 수행한다.

## 최초 1회 설정

1. **AWS OIDC Provider & IAM Role**
   - IAM → Identity providers → `token.actions.githubusercontent.com` (audience `sts.amazonaws.com`) 추가
   - Role 신뢰 정책의 `sub` 조건: `repo:oinochoe/vibe-deploy:ref:refs/heads/main`
   - 권한: CloudFormation / Lambda / IAM(역할 생성·PassRole) / S3(SAM 아티팩트 버킷) / Logs — PoC 라면 SAM 공식 가이드의 배포 권한을 참고
2. **GitHub 저장소 설정**
   - Secrets: `AWS_ROLE_ARN`
   - Variables (선택): `AWS_REGION`(기본 `ap-northeast-2`), `STACK_NAME`(기본 `vibe-deploy-api`), `CORS_ALLOW_ORIGIN`(커스텀 도메인일 때)
   - Settings → Pages → Source: **GitHub Actions**

## 로컬 개발

```bash
npm ci && npm ci --prefix api
npm run dev:api   # API: http://localhost:3001/hello
npm run dev       # Web: http://localhost:5173 (/api → 3001 프록시)
```

규칙은 [CLAUDE.md](./CLAUDE.md) 참고.
