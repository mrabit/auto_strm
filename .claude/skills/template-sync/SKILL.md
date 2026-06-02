---
name: template-sync
description: Use when working in a project created from node-react-template and needing to sync upstream template updates — handles merge conflicts, cleans template artifacts, and commits the result
---

# Template Sync

从 node-react-template 上游模板同步更新到下游项目。全流程向导式操作。

## 流程

依次执行六个阶段，每阶段完成后报告结果再继续。

### Phase 1 — Pre-check

1. `git remote get-url template` 确认 template remote 存在，不存在则报错退出
2. `git status --porcelain` 确认工作区干净，若有未提交更改则提示用户先处理
3. 记录当前分支名

### Phase 2 — Fetch & Analyze

1. `git fetch template master` 拉取模板最新代码
2. **确定上次同步点**：`git merge-base HEAD template/master` 获取 merge-base 作为基准
3. 以 merge-base 为基准，展示增量 commit log：
   `git log <merge-base>..template/master --oneline --no-merges`
4. 按类型分组展示变更文件：
   - `git diff --name-status <merge-base>...template/master` 获取文件列表
   - 分为 Added / Modified / Deleted 三组
5. 若无新增 commit，提示「已是最新」并退出
6. 询问用户是否继续合并

### Phase 3 — Merge

1. 执行 `git merge template/master --allow-unrelated-histories`（普通 merge，非 squash）
   > **为什么不用 `--squash`**：squash merge 不产生 merge commit，merge-base 不更新，导致每次同步都会重复出现已解决的冲突。普通 merge 记录 parent 关系，后续同步只需处理新变更的冲突。
2. 无冲突 → 直接进入 Phase 4
3. 有冲突 → 对每个冲突文件，根据冲突类型分别处理：

   **content conflict（两边都修改了同一区域）：**
   - 展示冲突内容（`git diff` 格式）
   - 分析模板侧变更意图和本地侧变更意图
   - 给出推荐：🟢用模板 / 🔵保本地 / 🟡合并 / ⚪跳过
   - 用户逐项确认后 apply
   - 判断依据：模板侧是 bugfix/安全补丁→倾向模板；本地已有同类实现→保本地；两边独立新增→自动合并

   **modify/delete conflict（一边修改、一边删除）：**
   - 展示哪一侧删除、哪一侧修改
   - 给出推荐：🟢接受删除（模板专属文件）/ 🔵保留本地修改 / 🟡合并到本地
   - 用户确认后 apply（通常模板删除 + 本地无对应功能 → 接受删除）

4. 冲突解决后，检查 `package.json` 和 `web/package.json` 的 `version` 字段，以模板 `package.json` 的 `version` 为准统一，不一致则自动修正并告知用户

### Phase 4 — Cleanup

精确清理模板专属内容，不删除下游自有文件。**仅处理 Phase 3 冲突未覆盖的情况**（如无冲突但模板新增的文件）：

| 清理项 | 检测方式 | 操作 |
|--------|---------|------|
| `bin/` 目录 | 目录存在且 Phase 3 未处理 | `rm -rf bin/` |
| `"bin"` 字段 | `package.json` 中存在 `"bin"` 键且 Phase 3 未移除 | 删除该字段块 |
| 模板带来的 `docs/` | `git diff --name-only HEAD template/master -- 'docs/'` | 仅删除 diff 中列出的文件 |
| 模板带来的 `.claude/` 文件 | `git diff --name-only HEAD template/master -- '.claude/'` | **区分通用功能和模板专属配置**：通用功能（如 skills、commands）保留；模板专属配置（如模板项目的 settings、hooks）删除 |
| CLAUDE.md 模板段 | 匹配 `### Template Maintenance` 到下一个 `## ` 之间的内容 | 删除该段落 |
| CLAUDE.md 模板专属内容 | `git diff <merge-base> HEAD -- CLAUDE.md` 检查 merge 是否引入模板专属段落（如 `## Project Overview`、`## Strapi Setup` 等描述模板自身而非下游项目的内容） | 展示 diff，与用户确认后删除模板专属段落，保留通用指引（如 `## Customization`） |
| `.gitignore` 缺少 skill 忽略规则 | `grep -qxF '.claude/skills/template-sync/' .gitignore` 失败 | 追加 `.claude/skills/template-sync/` 到 `.gitignore` |

每项操作结果记录到 report。模板侧新增的其他不明确文件先展示再确认。

### Phase 5 — Commit

1. `git add -A`
2. 生成 commit message：从模板 `package.json` 读取版本号，格式 `chore: sync template v<version>`
3. 执行 `git commit -m "..."`（不 push）

### Phase 6 — Report

汇总输出：
- 合并的文件列表
- 冲突及处理方式
- 清理的文件列表
- Commit 信息
- 可能需要用户手动 review 的文件清单
