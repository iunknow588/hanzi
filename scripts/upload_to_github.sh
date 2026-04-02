#!/bin/bash

# Hanzi 项目 GitHub 推送脚本

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_REMOTE_URL="${HANZI_REMOTE_URL:-git@github.com:iunknow588/hanzi.git}"
COMMIT_MSG="${1:-}"

cd "$PROJECT_ROOT"

log_info "项目根目录: $PROJECT_ROOT"

if [ ! -d .git ]; then
  log_warn "未检测到 .git，自动初始化仓库"
  git init
  git checkout -B main >/dev/null 2>&1 || git branch -M main
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log_error "当前目录不是 Git 仓库"
  exit 1
fi

if ! git remote | grep -q '^origin$'; then
  log_warn "未检测到 origin，自动添加默认远端"
  git remote add origin "$DEFAULT_REMOTE_URL"
else
  CURRENT_URL="$(git remote get-url origin)"
  if [ "$CURRENT_URL" != "$DEFAULT_REMOTE_URL" ]; then
    log_warn "origin 与期望不一致，自动更新"
    git remote set-url origin "$DEFAULT_REMOTE_URL"
  fi
fi

log_info "Git 状态:"
git status --short || true

git add -A

if git diff --cached --quiet; then
  log_warn "没有需要提交的更改"
else
  if [ -z "$COMMIT_MSG" ]; then
    CHANGED_COUNT="$(git diff --cached --name-only | wc -l | tr -d ' ')"
    COMMIT_MSG="chore(deploy): sync hanzi repo\\n\\n- auto commit from hanzi/scripts\\n- files: $CHANGED_COUNT\\n- ts: $(date '+%Y-%m-%d %H:%M:%S')"
  fi
  log_info "提交信息: $COMMIT_MSG"
  git commit -m "$COMMIT_MSG"
fi

CURRENT_BRANCH="$(git branch --show-current || echo main)"
if [ -z "$CURRENT_BRANCH" ]; then
  CURRENT_BRANCH="main"
fi

log_info "推送分支: $CURRENT_BRANCH"
git push -u origin "$CURRENT_BRANCH"

log_info "GitHub 推送完成 -> $(git remote get-url origin)"
