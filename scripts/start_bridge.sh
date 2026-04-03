#!/bin/bash

# Hanzi Bridge 启动脚本

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
BRIDGE_DIR="$PROJECT_ROOT/services/coze-bridge"
ENV_FILE="$PROJECT_ROOT/.env.bridge"

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a && source "$ENV_FILE" && set +a
fi

if [ ! -d "$BRIDGE_DIR" ]; then
  log_error "未找到 Bridge 目录: $BRIDGE_DIR"
  exit 1
fi

export HANZI_BRIDGE_PORT="${HANZI_BRIDGE_PORT:-8787}"
export HANZI_PLUGIN_ROOT="${HANZI_PLUGIN_ROOT:-/home/lc/luckee_dao/baby/coze/插件}"
export HANZI_JOBS_ROOT="${HANZI_JOBS_ROOT:-$BRIDGE_DIR/jobs}"
export HANZI_EXECUTION_MODE="${HANZI_EXECUTION_MODE:-pipeline}"

if [ ! -d "$HANZI_PLUGIN_ROOT" ]; then
  log_warn "当前 HANZI_PLUGIN_ROOT 不存在: $HANZI_PLUGIN_ROOT"
  log_warn "如需实际跑评分流水线，请先在 .env.bridge 中修正该路径"
fi

log_info "Bridge 目录: $BRIDGE_DIR"
log_info "监听端口: $HANZI_BRIDGE_PORT"
log_info "插件目录: $HANZI_PLUGIN_ROOT"
log_info "任务目录: $HANZI_JOBS_ROOT"
log_info "执行模式: $HANZI_EXECUTION_MODE"

cd "$BRIDGE_DIR"

if [ ! -d node_modules ]; then
  log_info "首次启动，安装 Bridge 依赖"
  npm install
fi

log_info "启动 Hanzi Bridge"
exec npm start
