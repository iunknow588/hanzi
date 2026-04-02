#!/bin/bash

# Hanzi Workspace 一键部署：GitHub + Vercel

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${CYAN}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_section() {
  echo -e "\n${CYAN}══════════════════════════════${NC}"
  echo -e "${CYAN}$1${NC}"
  echo -e "${CYAN}══════════════════════════════${NC}\n"
}

show_help() {
  cat <<'USAGE'
Hanzi Workspace 一键部署脚本

用法:
  ./scripts/deploy_all.sh [preview|production]
  ./scripts/deploy_all.sh help

可用环境变量:
  HANZI_RUN_GITHUB     默认 true  - 是否执行 upload_to_github
  HANZI_RUN_VERCEL     默认 true  - 是否执行 deploy_vercel
  HANZI_COMMIT_MSG     传递给 upload_to_github.sh 的提交信息
  HANZI_VERCEL_SCOPE   目标 Vercel scope（deploy_vercel 需要）
  HANZI_VERCEL_PROJECT 目标 Vercel project 名称
  HANZI_VERCEL_PROJECT_ID 可选 projectId 校验
  HANZI_VERCEL_SOURCE_DIR 需部署的子目录，默认 hanzi-writer-workspace/apps/hanzi-demo
USAGE
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET_ENV="${1:-preview}"
HANZI_RUN_GITHUB="${HANZI_RUN_GITHUB:-true}"
HANZI_RUN_VERCEL="${HANZI_RUN_VERCEL:-true}"

if [ "$1" = "help" ] || [ "$1" = "--help" ]; then
  show_help
  exit 0
fi

log_info "项目根目录: $PROJECT_ROOT"
log_info "目标环境: $TARGET_ENV"
log_info "执行 GitHub 推送: $HANZI_RUN_GITHUB"
log_info "执行 Vercel 部署: $HANZI_RUN_VERCEL"

if [ "$HANZI_RUN_GITHUB" = "true" ]; then
  log_section "步骤 1: 推送至 GitHub"
  if [ -n "$HANZI_COMMIT_MSG" ]; then
    "$SCRIPT_DIR/upload_to_github.sh" "$HANZI_COMMIT_MSG"
  else
    "$SCRIPT_DIR/upload_to_github.sh"
  fi
else
  log_warn "已跳过 GitHub 推送"
fi

if [ "$HANZI_RUN_VERCEL" = "true" ]; then
  log_section "步骤 2: 构建 Demo 并部署至 Vercel"
  if [ -d "$PROJECT_ROOT/hanzi-writer-workspace" ]; then
    (
      cd "$PROJECT_ROOT/hanzi-writer-workspace" && \
      yarn install >/dev/null && \
      yarn renderers:build >/dev/null && \
      yarn demo:build >/dev/null
    )
  else
    log_warn "未找到 hanzi-writer-workspace，跳过 demo:build"
  fi
  "$SCRIPT_DIR/deploy_vercel.sh" "$TARGET_ENV"
else
  log_warn "已跳过 Vercel 部署"
fi

log_section "部署完成"
log_info "Hanzi Workspace 部署全部完成"
