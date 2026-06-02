#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || realpath "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
TEMPLATE_DIR="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)"
EXCLUDES="node_modules|dist|\.git|\.env|web/node_modules|web/dist|\.claude|docs|bin"

# ─── 颜色 ───────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}ℹ ${NC}$*"; }
ok()    { echo -e "${GREEN}✔ ${NC}$*"; }
warn()  { echo -e "${YELLOW}⚠ ${NC}$*"; }
die()   { echo -e "${RED}✘ ${NC}$*" >&2; exit 1; }

# ─── 帮助 ───────────────────────────────────────────
usage() {
  cat <<EOF
Usage: node-react-template <command> [options]

Commands:
  create <name>   从模板创建新项目
  init            给已有项目添加 template remote

Create options:
  --repo <url>    从 Git 仓库拉取模板（默认用本地目录）
  --no-install    跳过 npm install

Init options:
  --repo <url>    模板仓库地址（默认用本地目录）

同步模板更新: 在 Claude Code 中运行 /template-sync 获得智能冲突处理和自动清理。
EOF
  exit 0
}

# ─── create ──────────────────────────────────────────
cmd_create() {
  local name="" repo="" skip_install=false

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --repo)       [[ -n "${2:-}" ]] || die "--repo 需要一个参数"; repo="$2"; shift 2 ;;
      --no-install) skip_install=true; shift ;;
      -*)           die "未知选项: $1" ;;
      *)            name="$1"; shift ;;
    esac
  done

  [[ -z "$name" ]] && die "用法: node-react-template create <name> [--repo <url>] [--no-install]"
  [[ "$name" =~ [/\\] ]] && die "项目名 '$name' 包含非法字符"
  [[ -d "$name" ]] && die "目录 '$name' 已存在"

  # 1) 复制模板
  if [[ -n "$repo" ]]; then
    info "从 $repo 克隆模板..."
    git clone --depth 1 "$repo" "$name"
    rm -rf "$name/.git"
  else
    info "从本地模板复制..."
    rsync -a --exclude-from=<(echo "$EXCLUDES" | tr '|' '\n' | sed 's/^/\//') "$TEMPLATE_DIR/" "$name/"
  fi

  # 2) 替换项目名 & 移除模板专属的 bin 字段
  info "替换项目名为 $name..."
  for f in "$name/package.json" "$name/web/package.json"; do
    [[ -f "$f" ]] && sed -i.bak "s#\"name\": \"node-react-template\"#\"name\": \"$name\"#" "$f" && rm "$f.bak"
  done
  if [[ -f "$name/package.json" ]]; then
    sed -i.bak '/"bin": {/,/}/d' "$name/package.json" && rm "$name/package.json.bak"
  fi

  # 3) git init
  info "初始化 Git..."
  (cd "$name" && git init -q && git add -A && git commit -q --no-verify -m "init: 从 node-react-template 创建")

  # 4) 添加 template remote
  local remote_url="${repo:-$TEMPLATE_DIR}"
  (cd "$name" && git remote add template "$remote_url")
  ok "已添加 template remote: $remote_url"

  # 5) 安装 Claude Code skill
  if [[ -d "$TEMPLATE_DIR/.claude/skills" ]]; then
    mkdir -p "$name/.claude/skills"
    cp -r "$TEMPLATE_DIR/.claude/skills/." "$name/.claude/skills/"
    (cd "$name" && git add .claude/skills/ 2>/dev/null && git commit -q --no-verify -m "chore: 安装 template-sync skill" 2>/dev/null || true)
    ok "已安装 Claude Code skill: /template-sync"
  fi

  # 6) npm install
  if [[ "$skip_install" == false ]]; then
    info "安装依赖..."
    (cd "$name" && npm install --silent)
    (cd "$name/web" && npm install --silent)
    ok "依赖安装完成"
  fi

  ok "项目 '$name' 创建完成！"
  echo ""
  echo "  cd $name"
  echo "  npm run dev:web"
  echo ""
  echo "  同步模板更新: /template-sync"
}

# ─── init ────────────────────────────────────────────
cmd_init() {
  local repo=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --repo)   [[ -n "${2:-}" ]] || die "--repo 需要一个参数"; repo="$2"; shift 2 ;;
      -*)       die "未知选项: $1" ;;
      *)      shift ;;
    esac
  done

  # 检查是否在 git 仓库中
  git rev-parse --is-inside-work-tree &>/dev/null || die "当前目录不是 Git 仓库"

  # 检查是否已有 template remote
  if git remote get-url template &>/dev/null; then
    local existing
    existing=$(git remote get-url template)
    warn "已存在 template remote: $existing"
    echo -n "覆盖？[y/N] "
    read -r confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || exit 0
    git remote remove template
  fi

  local remote_url="${repo:-$TEMPLATE_DIR}"
  git remote add template "$remote_url"
  ok "已添加 template remote: $remote_url"

  # 安装 Claude Code skill
  if [[ -d "$TEMPLATE_DIR/.claude/skills" ]]; then
    mkdir -p .claude/skills
    cp -r "$TEMPLATE_DIR/.claude/skills/." .claude/skills/
    git add .claude/skills/ 2>/dev/null || true
    git commit -q --no-verify -m "chore: 安装 template-sync skill" 2>/dev/null || true
    ok "已安装 Claude Code skill: /template-sync"
  fi

  echo ""
  echo "  同步模板更新: /template-sync"
}

# ─── 入口 ────────────────────────────────────────────
[[ $# -eq 0 ]] && usage

case "${1:-}" in
  create) shift; cmd_create "$@" ;;
  init)   shift; cmd_init "$@" ;;
  -h|--help|help) usage ;;
  *)      die "未知命令: $1（运行 --help 查看用法）" ;;
esac
