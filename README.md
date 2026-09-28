# vibe-deploy

Vite(React + TS) 프론트엔드 + AWS Lambda(Function URL) 백엔드 모노레포 PoC.
기본 브랜치에 커밋이 들어오면 **SAM 배포 → Function URL 을 `VITE_API_URL` 로 주입 → Vite 빌드 → Pages 배포** 를 한 파이프라인으로 수행한다.
MR/PR 없이 바로 배포되며, 검사(타입체크 · 빌드 · 배포 확인)를 통과하지 못하면 이전 버전이 유지된다.

| 파이프라인 | 파일 | 웹 호스팅 |
| --- | --- | --- |
| GitLab (사내, 목표) | `.gitlab-ci.yml` → `scripts/ci/*.sh` | GitLab Pages |
| GitHub (PoC) | `.github/workflows/deploy.yml` | GitHub Pages |

## GitLab 설정 (최초 1회)

### 1. AWS 배포 러너 (DevOps 표준 러너 사용)

API 배포(`deploy-api`)는 **AWS 에 배포할 수 있는 기존 러너**에서 실행한다. 사내 Pages 러너는 외부 접속이 막혀 있어 AWS 에 배포할 수 없다.
배포 권한은 그 러너에만 있고, 사용자와 Pages 러너는 AWS 자격증명을 갖지 않는다.

DevOps 팀에 확인할 것:

| 항목 | 이유 |
| --- | --- |
| 러너 태그, 사용자 프로젝트 그룹에서 쓸 수 있는지 | `DEPLOY_RUNNER_TAG` 에 넣음 |
| 실행기 종류 (Docker / Kubernetes / 셸) | Docker 계열이면 `SAM_IMAGE` 사용, 셸이면 러너에 `node` 22 · `sam` · `aws` 설치 필요 |
| AWS 자격증명 방식 (인스턴스 역할 / 역할 전환 / OIDC) | 러너에 이미 있으면 `AWS_ROLE_ARN` 비움 |
| 그 역할의 권한 범위 | CloudFormation 스택 생성, SAM 아티팩트 S3, Lambda, IAM 역할 생성(`vibe-*`), Logs 가 필요 |
| 러너에서 npm 레지스트리(Nexus) 접근 | `npm ci` |
| 기존 Lambda 배포 CI 템플릿 여부 | 있으면 `include:` 로 재사용 검토 |

권한 정책은 GitHub PoC 정책에서 `vibe-deploy-stack` 을 `vibe-*` 로 넓힌 것과 같다 (스택 이름이 `vibe-<프로젝트 경로>` 로 자동 생성됨).
여러 사람이 쓰므로 `iam:CreateRole` 에 조건 `"StringEquals": {"iam:PermissionsBoundary": "<권한 경계 ARN>"}` 을 걸어,
템플릿을 고쳐 관리자 권한 역할을 만드는 것을 막는다.

### 2. GitLab: CI/CD 변수 (사용자 프로젝트 그룹에 한 번)

| 변수 | 값 | 비고 |
| --- | --- | --- |
| `DEPLOY_RUNNER_TAG` | AWS 배포 러너의 태그 | 필수 |
| `AWS_ROLE_ARN` | OIDC 로 넘겨받을 역할 ARN | 선택. 러너에 자격증명이 이미 있으면 비움 |
| `PERMISSIONS_BOUNDARY_ARN` | 권한 경계 정책 ARN | 선택 |
| `SAM_IMAGE`, `NODE_IMAGE` | 사내 레지스트리 미러 주소 | 러너가 인터넷에 못 나갈 때 |

프로젝트의 Pages 경로(`CI_PAGES_URL`)에서 Vite base 경로와 CORS 허용 Origin 을 자동으로 계산하므로 따로 설정할 것은 없다.

## GitHub PoC 설정 (최초 1회)

1. **AWS OIDC Provider & IAM Role**
   - IAM → Identity providers → `token.actions.githubusercontent.com` (audience `sts.amazonaws.com`) 추가
   - Role **신뢰 정책**(신뢰 관계 탭)의 `sub` 조건 (`StringLike`):
     `repo:oinochoe@24869229/vibe-deploy@1391652582:*`
     - 이 저장소는 GitHub 가 `소유자@계정ID/저장소@저장소ID` 형식의 `sub` 를 보낸다.
       `repo:oinochoe/vibe-deploy:*` 처럼 이름만 쓰면 `Not authorized to perform sts:AssumeRoleWithWebIdentity` 로 거부된다.
   - Role **권한 정책**(권한 탭, 신뢰 정책과 별개): CloudFormation(`vibe-deploy-stack`, `aws-sam-cli-managed-default` 스택 + `Serverless-2016-10-31` transform) /
     S3(`aws-sam-cli-managed-default-samclisourcebucket-*`) / Lambda·IAM Role·Logs(`vibe-deploy-stack-*`)
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
