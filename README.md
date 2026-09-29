# vibe-deploy

Vite(React + TS) 프론트엔드 + 서버리스 백엔드(AWS Lambda 또는 Azure Functions) 모노레포 PoC.
기본 브랜치에 커밋이 들어오면 **API 배포 → 주소를 `VITE_API_URL` 로 주입 → Vite 빌드 → 웹 배포** 를 한 파이프라인으로 수행한다.
MR/PR 없이 바로 배포되며, 검사(타입체크 · 빌드 · 배포 확인)를 통과하지 못하면 이전 버전이 유지된다.

## 구조: 한 벌의 핸들러, 두 개의 클라우드

사용자가 쓰는 코드(`api/<이름>.ts` 의 `(req, res)` 함수와 `src/`)는 클라우드와 무관하다.
클라우드마다 다른 부분은 **어댑터와 진입점, 인프라 정의**뿐이다.

```
api/<이름>.ts ──┐                                  ┌─ _lib/lambda.ts + _router.ts  → AWS Lambda   (template.yml)
  (핸들러)      ├→ _generated/routes.ts → dispatch() ┤
src/ (프론트)   ┘   (자동 생성)          (_lib/http.ts)└─ _lib/azure.ts  + _azure.ts   → Azure Functions (host.json, staticwebapp.config.json)
```

| 구분 | AWS (기본) | Azure (예비) |
| --- | --- | --- |
| 웹 | GitLab Pages / GitHub Pages | Azure Static Web Apps (API 와 한 번에) |
| API 주소 | Lambda Function URL (다른 도메인 → CORS 필요, `VITE_API_URL` 주입) | 같은 도메인의 `/api` (CORS·주입 불필요) |
| 파이프라인 | `.gitlab-ci.yml` + `scripts/ci/*.sh` (GitLab), `.github/workflows/deploy.yml` (GitHub) | `.gitlab-ci.azure.yml` (기본으로 쓰려면 `.gitlab-ci.yml` 로 교체) |
| 인증 | 러너의 AWS 자격증명 또는 OIDC | 앱별 배포 토큰 |
| 로컬 검사 | `sam build` | `npm --prefix api run build:azure` |

**Azure 는 아직 실제 배포를 검증하지 않았다.** 어댑터는 Azure 요청 객체로 테스트했고(AWS 와 같은 응답), 번들 빌드까지 CI 에서 검사한다.
배포 파일(`.gitlab-ci.azure.yml`)의 배포 클라이언트 이미지·실행 방식, 그리고 번들에 `@azure/functions` 를 넣을지(`--external`) 여부는 Azure 공식 문서와 실제 배포로 확인해야 한다.

## 사내 GitLab (Azure 경로) — 단계별 진행

목표: 비개발자가 AI 에게 "배포해줘" 라고 하면 코드가 GitLab 에 커밋되고, **웹은 GitLab Pages**, **API 는 Azure Functions** 로 자동 배포된다.
한 번에 다 만들지 않고, 한 단계씩 실제 환경에서 확인하며 진행한다.

| 단계 | 내용 | 확인 방법 | 상태 |
| --- | --- | --- | --- |
| 1 | 웹만 GitLab Pages 에 배포 (`.gitlab-ci.yml`) | 파이프라인 성공, 웹 주소에서 화면이 뜸 | 진행 중 |
| 2 | Azure 함수 앱 1개를 수동으로 만들고, API 를 배포용 압축 파일로 빌드 | 함수 주소가 `/api/hello` 에 응답 | 예정 |
| 3 | 배포 서버(Azure DevOps 에이전트)에서 함수 앱에 API 배포 | 릴리스 실행 후 함수가 새 코드로 응답 | 예정 |
| 4 | GitLab 커밋 → Azure DevOps 릴리스 자동 호출, 웹에 API 주소 주입 | 커밋만으로 웹과 API 가 함께 갱신 | 예정 |
| 5 | "배포해줘" 도구 (AI 채팅에서 배포) | 채팅에서 배포 후 주소를 돌려받음 | 예정 |

파이프라인 파일 정리

| 파일 | 용도 |
| --- | --- |
| `.gitlab-ci.yml` | 사내 GitLab. 1단계(웹만) 부터 단계별로 job 을 추가한다 |
| `.gitlab-ci.aws.yml` | 사용하지 않는 AWS 버전 (보관용) |
| `.gitlab-ci.azure.yml` | Static Web Apps 기준 초안 (검증 전, 보관용) |
| `scripts/ci/build-web.sh` | 웹 빌드. 러너 환경(Node 유무, 인터넷/사내 레지스트리)에 맞춰 스스로 방법을 고른다 |

### 1단계 실행 방법

1. GitLab 에 새 프로젝트를 만들고 이 저장소의 코드를 올린다.
2. 러너에서 패키지를 받을 방법을 정한다 (둘 중 하나).
   - **사내 npm 레지스트리를 쓸 수 있으면:** 프로젝트 CI/CD 변수 `NPM_REGISTRY` 에 주소를 넣는다. 사내 CA 인증서를 쓰면 `NPM_CAFILE` 에 인증서 파일 경로도 넣는다.
   - **쓸 수 없으면(임시):** 프로젝트에 `ci-offline/node.tar.xz`(Node 실행 파일 압축본, 러너에 Node 가 없을 때)와
     `ci-offline/node_modules.tar.gz` 를 올린다. **러너와 같은 Linux x64 에서 만든 것**이어야 한다 (Windows 에서 만들면 빌드가 실패한다).
     이 폴더는 `.gitignore` 에 들어 있으므로, GitHub 에 올라가지 않도록 GitLab 화면의 파일 업로드로 넣는다.
3. 파이프라인을 실행하고 웹 주소를 연다. 이 단계에서는 API 가 없으므로 화면의 API 호출 부분이 오류로 보이는 것이 정상이다.

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
