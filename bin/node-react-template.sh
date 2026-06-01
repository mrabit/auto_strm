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
  sync            从模板拉取更新

Create options:
  --repo <url>    从 Git 仓库拉取模板（默认用本地目录）
  --no-install    跳过 npm install

Init options:
  --repo <url>    模板仓库地址（默认用本地目录）

Sync options:
  --branch <name> 模板分支名（默认 master）
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

  # 5) npm install
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
  echo "  同步模板更新: node-react-template sync"
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
  echo ""
  echo "  同步模板更新: node-react-template sync"
}

# ─── sync ────────────────────────────────────────────
cmd_sync() {
  local branch="master"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --branch) [[ -n "${2:-}" ]] || die "--branch 需要一个参数"; branch="$2"; shift 2 ;;
      -*)       die "未知选项: $1" ;;
      *)        shift ;;
    esac
  done

  # 检查 template remote
  local remote_url
  remote_url=$(git remote get-url template 2>/dev/null) || die "当前目录没有 template remote，请先用 create 命令创建项目"

  info "从 $remote_url 拉取更新 (branch: $branch)..."
  git fetch template "$branch" || die "fetch 失败"

  info "合并 template/$branch..."
  if git merge "template/$branch" --no-edit --allow-unrelated-histories; then
    # 移除模板专属的 bin 字段（create 时已排除，sync 需清理）
    local cleaned=false
    if [[ -d bin ]]; then
      rm -rf bin
      git add bin 2>/dev/null || true
      info "已移除模板 bin/ 目录"
      cleaned=true
    fi
    if [[ -f package.json ]] && grep -q '"bin"' package.json; then
      sed -i.bak '/"bin": {/,/}/d' package.json && rm package.json.bak
      git add package.json
      info "已移除 package.json 中的 bin 字段"
      cleaned=true
    fi
    if [[ "$cleaned" == true ]]; then
      git commit --no-verify -q -m "chore: 移除模板专属的 bin 配置"
    fi
    ok "同步完成！"
  else
    warn "合并冲突，请手动解决后 git add + git commit"
    exit 1
  fi
}

# ─── 入口 ────────────────────────────────────────────
[[ $# -eq 0 ]] && usage

case "${1:-}" in
  create) shift; cmd_create "$@" ;;
  init)   shift; cmd_init "$@" ;;
  sync)   shift; cmd_sync "$@" ;;
  -h|--help|help) usage ;;
  *)      die "未知命令: $1（运行 --help 查看用法）" ;;
esac
