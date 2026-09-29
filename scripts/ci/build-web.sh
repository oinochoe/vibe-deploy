#!/usr/bin/env bash
# 프론트엔드(Vite)를 빌드한다. 결과물은 dist/.
#
# 러너마다 환경이 달라서(Node 가 없거나, 인터넷/사내 레지스트리 접근이 안 되는 경우) 아래 순서로 스스로 고른다.
#
#  [Node]     1) 러너에 node 가 있으면 그대로 사용
#             2) 없으면 압축본을 풀어 사용 (NODE_TARBALL, 기본 ci-offline/node.tar.xz)
#  [패키지]   1) NPM_REGISTRY 가 있으면 그 레지스트리에서 npm ci
#             2) 없고 압축본이 있으면 node_modules 를 풀어 사용 (NODE_MODULES_TARBALL, 기본 ci-offline/node_modules.tar.gz)
#             3) 둘 다 없으면 npm 기본 레지스트리 사용
#
# 선택 환경변수
#   VITE_BASE      웹이 서빙되는 경로. 예: /my-project-1a2b3c/ (기본 /)
#   VITE_API_URL   API 주소. 없으면 프론트는 같은 도메인의 "/api" 를 호출한다
#   NPM_REGISTRY, NPM_CAFILE, NODE_TARBALL, NODE_MODULES_TARBALL
#
# 주의: node_modules 압축본은 반드시 **러너와 같은 OS·CPU(Linux x64)** 에서 만든다.
#       Vite 등은 OS 별 실행 파일을 포함하므로 Windows 에서 만든 것을 풀면 빌드가 실패한다.
set -euo pipefail

export VITE_BASE="${VITE_BASE:-/}"

echo "== Node 준비"
if ! command -v node >/dev/null 2>&1; then
  tarball="${NODE_TARBALL:-ci-offline/node.tar.xz}"
  if [ ! -f "$tarball" ]; then
    echo "오류: 러너에 node 가 없고 압축본($tarball)도 없습니다." >&2
    exit 1
  fi
  mkdir -p /tmp/node-bin
  tar -xJf "$tarball" -C /tmp/node-bin --strip-components=1
  export PATH="/tmp/node-bin/bin:$PATH"
fi
echo "node $(node -v), npm $(npm -v)"

echo "== 의존성 설치"
modules_tarball="${NODE_MODULES_TARBALL:-ci-offline/node_modules.tar.gz}"
if [ -n "${NPM_REGISTRY:-}" ]; then
  npm config set registry "$NPM_REGISTRY"
  if [ -n "${NPM_CAFILE:-}" ]; then
    # 인증서 검사를 끄지 않고, 사내 CA 파일을 신뢰하도록 지정한다
    npm config set cafile "$NPM_CAFILE"
  fi
  npm ci --no-audit --no-fund
elif [ -f "$modules_tarball" ]; then
  tar -xzf "$modules_tarball"
else
  npm ci --no-audit --no-fund
fi

# 값이 있을 때만 .env.production 을 만든다 (없으면 프론트가 "/api" 를 호출)
rm -f .env.production
if [ -n "${VITE_API_URL:-}" ]; then
  echo "VITE_API_URL=${VITE_API_URL}" > .env.production
fi

echo "== 타입체크 · 빌드 (base: $VITE_BASE)"
npm run build
