#!/bin/bash

# Hanzi Workspace Vercel 部署脚本

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

load_node_env() {
  local nvm_dir="${NVM_DIR:-$HOME/.nvm}"
  local nvm_script="$nvm_dir/nvm.sh"
  local nvmrc_file="$PROJECT_ROOT/hanzi-writer-workspace/.nvmrc"
  if [ -s "$nvm_script" ]; then
    # shellcheck disable=SC1090
    . "$nvm_script"
    if [ -f "$nvmrc_file" ]; then
      nvm use "$(cat "$nvmrc_file")" >/dev/null
    fi
  fi
  hash -r
}

run_vercel() {
  if command -v vercel >/dev/null 2>&1; then
    vercel "$@"
    return
  fi

  if command -v npx >/dev/null 2>&1; then
    npx --yes vercel "$@"
    return
  fi

  log_error "未检测到 vercel CLI，且无法使用 npx 自动拉起 vercel"
  exit 1
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.vercel"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a && source "$ENV_FILE" && set +a
fi
ENVIRONMENT="${1:-preview}"
HANZI_VERCEL_SCOPE="${HANZI_VERCEL_SCOPE:-}"
HANZI_VERCEL_PROJECT="${HANZI_VERCEL_PROJECT:-}"
HANZI_VERCEL_PROJECT_ID="${HANZI_VERCEL_PROJECT_ID:-}"
HANZI_VERCEL_ARCHIVE="${HANZI_VERCEL_ARCHIVE:-tgz}"
HANZI_VERCEL_SOURCE_DIR="${HANZI_VERCEL_SOURCE_DIR:-hanzi-writer-workspace/apps/hanzi-demo}"
HANZI_VERCEL_BUILD_DIR="${HANZI_VERCEL_BUILD_DIR:-dist}"
SOURCE_PATH="$PROJECT_ROOT/$HANZI_VERCEL_SOURCE_DIR"
LINK_FILE="$SOURCE_PATH/.vercel/project.json"

if [ -z "$HANZI_VERCEL_SCOPE" ] || [ -z "$HANZI_VERCEL_PROJECT" ]; then
  log_error "请通过 HANZI_VERCEL_SCOPE/HANZI_VERCEL_PROJECT 指定 Vercel 目标"
  exit 1
fi

if [ ! -d "$SOURCE_PATH" ]; then
  log_error "部署目录不存在: $SOURCE_PATH"
  exit 1
fi

load_node_env

extract_field() {
  local file="$1"
  local field="$2"
  if [ ! -f "$file" ]; then
    echo ""
    return
  fi
  sed -n "s/.*\"$field\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" "$file" | head -n1
}

verify_link_result() {
  local project_id project_name
  project_id="$(extract_field "$LINK_FILE" "projectId")"
  project_name="$(extract_field "$LINK_FILE" "projectName")"
  if [ -z "$project_name" ]; then
    log_error "无法读取 link 结果，缺少 projectName"
    exit 1
  fi
  if [ "$project_name" != "$HANZI_VERCEL_PROJECT" ]; then
    log_error "link 后项目名不匹配：$project_name vs $HANZI_VERCEL_PROJECT"
    exit 1
  fi
  if [ -n "$HANZI_VERCEL_PROJECT_ID" ] && [ "$project_id" != "$HANZI_VERCEL_PROJECT_ID" ]; then
    log_error "link 后 projectId 不匹配：$project_id vs $HANZI_VERCEL_PROJECT_ID"
    exit 1
  fi
}

cd "$SOURCE_PATH"

log_info "部署目录: $SOURCE_PATH"
log_info "Vercel Scope: $HANZI_VERCEL_SCOPE"
log_info "Vercel Project: $HANZI_VERCEL_PROJECT"
log_info "环境: $ENVIRONMENT"

log_info "步骤 1: 验证远端项目"
if ! run_vercel project inspect "$HANZI_VERCEL_PROJECT" --scope "$HANZI_VERCEL_SCOPE" >/dev/null 2>&1; then
  log_error "Vercel 项目不存在或无权限: $HANZI_VERCEL_SCOPE/$HANZI_VERCEL_PROJECT"
  exit 1
fi

log_info "步骤 2: link 项目"
run_vercel link --yes --scope "$HANZI_VERCEL_SCOPE" --project "$HANZI_VERCEL_PROJECT"
verify_link_result

BUILD_PATH="$SOURCE_PATH/$HANZI_VERCEL_BUILD_DIR"

if [ ! -d "$BUILD_PATH" ]; then
  log_error "部署目录缺少构建输出: $HANZI_VERCEL_BUILD_DIR"
  exit 1
fi

for required_file in index.html practice.html test.html upload.html; do
  if [ ! -f "$BUILD_PATH/$required_file" ]; then
    log_error "部署目录缺少必要页面文件: $HANZI_VERCEL_BUILD_DIR/$required_file"
    exit 1
  fi
done

log_info "已验证多页面构建产物完整"

TMP_VERCEL_DIR="$BUILD_PATH/.vercel"
rm -rf "$TMP_VERCEL_DIR"
mkdir -p "$(dirname "$TMP_VERCEL_DIR")"
cp -R "$SOURCE_PATH/.vercel" "$TMP_VERCEL_DIR"

log_info "步骤 3: 部署 ($HANZI_VERCEL_BUILD_DIR)"
if [ "$ENVIRONMENT" = "production" ]; then
  run_vercel deploy "$BUILD_PATH" --prod --yes --scope "$HANZI_VERCEL_SCOPE" --logs --archive="$HANZI_VERCEL_ARCHIVE"
else
  run_vercel deploy "$BUILD_PATH" --yes --scope "$HANZI_VERCEL_SCOPE" --logs --archive="$HANZI_VERCEL_ARCHIVE"
fi

rm -rf "$TMP_VERCEL_DIR"

log_info "步骤 4: 展示最近部署"
run_vercel list --yes --scope "$HANZI_VERCEL_SCOPE" | head -n 20 || true

log_info "Vercel 部署完成"
