#!/usr/bin/env bash
# 프론트엔드(Vite)를 빌드한다. 결과물은 dist/.
#
# 필수 환경변수
#   VITE_API_URL   API 주소 (deploy-api.sh 가 만든 Function URL)
# 선택 환경변수
#   VITE_BASE      웹이 서빙되는 경로. 예: /my-project-1a2b3c/ (기본 /)
set -euo pipefail

: "${VITE_API_URL:?VITE_API_URL 이 필요합니다}"
export VITE_BASE="${VITE_BASE:-/}"

echo "== 의존성 설치"
npm ci

echo "VITE_API_URL=${VITE_API_URL}" > .env.production

echo "== 타입체크 · 빌드 (base: $VITE_BASE)"
npm run build
