#!/usr/bin/env bash
# api/ 를 SAM 으로 AWS Lambda 에 배포하고, Function URL 을 api.env 에 VITE_API_URL=... 로 남긴다.
#
# 필수 환경변수
#   STACK_NAME       CloudFormation 스택 이름 (프로젝트마다 달라야 함)
#   AWS_REGION       배포 리전
#   ALLOWED_ORIGIN   Function URL CORS 허용 Origin (웹이 서빙되는 도메인)
# 선택 환경변수
#   AWS_ROLE_ARN + AWS_OIDC_TOKEN   둘 다 있으면 OIDC 로 역할을 넘겨받는다.
#                                   없으면 러너의 IAM Role 또는 AWS_ACCESS_KEY_ID 등 기존 자격증명을 쓴다.
#   PERMISSIONS_BOUNDARY_ARN        Lambda 실행 역할에 붙일 권한 경계
set -euo pipefail

: "${STACK_NAME:?STACK_NAME 이 필요합니다}"
: "${AWS_REGION:?AWS_REGION 이 필요합니다}"
: "${ALLOWED_ORIGIN:?ALLOWED_ORIGIN 이 필요합니다}"

for cmd in node npm sam aws; do
  command -v "$cmd" >/dev/null || { echo "::error:: 빌드 이미지에 '$cmd' 가 없습니다. SAM_IMAGE 를 확인하세요." >&2; exit 1; }
done

echo "== 의존성 설치 · 라우트 생성 · 타입체크"
npm ci --prefix api
npm --prefix api run typecheck

if [[ -n "${AWS_ROLE_ARN:-}" && -n "${AWS_OIDC_TOKEN:-}" ]]; then
  echo "== OIDC 로 AWS 역할 넘겨받기"
  read -r AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN < <(
    aws sts assume-role-with-web-identity \
      --region "$AWS_REGION" \
      --role-arn "$AWS_ROLE_ARN" \
      --role-session-name "ci-${CI_PIPELINE_ID:-local}" \
      --web-identity-token "$AWS_OIDC_TOKEN" \
      --duration-seconds 3600 \
      --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' \
      --output text
  )
  export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
fi

params=("AllowedOrigin=${ALLOWED_ORIGIN}")
[[ -n "${PERMISSIONS_BOUNDARY_ARN:-}" ]] && params+=("PermissionsBoundaryArn=${PERMISSIONS_BOUNDARY_ARN}")

echo "== sam build"
sam build

echo "== sam deploy (stack: $STACK_NAME)"
sam deploy \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --parameter-overrides "${params[@]}"

API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)
if [[ -z "$API_URL" || "$API_URL" == "None" ]]; then
  echo "::error:: 스택 $STACK_NAME 에 ApiUrl 출력이 없습니다." >&2
  exit 1
fi

echo "== 배포 확인: ${API_URL}hello"
curl -fsS "${API_URL}hello"
echo

echo "VITE_API_URL=${API_URL}" > api.env
echo "API: $API_URL"
