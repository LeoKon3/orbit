# Orbit - AI 技能编排引擎

[English](README.md) | 简体中文

```
 ██████╗ ██████╗ ██████╗ ██╗████████╗
██╔═══██╗██╔══██╗██╔══██╗██║╚══██╔══╝
██║   ██║██████╔╝██████╔╝██║   ██║
██║   ██║██╔══██╗██╔══██╗██║   ██║
╚██████╔╝██║  ██║██████╔╝██║   ██║
 ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚═╝   ╚═╝
```

**让您的 AI 开发工作流保持在轨道上**

通过基于脚本的可靠性实现完整的开发生命周期自动化，采用结构化的 5 阶段工作流。

## 状态

✅ **v0.2.0 CLI - 完成**

核心工作流实现：

- ✅ 项目结构
- ✅ 基于脚本的自动化
- ✅ 带哈希跟踪的状态管理
- ✅ 5 阶段工作流技能
- ✅ 同步检测和恢复
- ✅ 独立技能调用

## 安装

全局安装 Orbit：

```bash
npm install -g @leokon3/orbit@latest
```

进入你的项目目录并初始化：

```bash
cd your-project
orbit init
```

初始化器会询问两个问题：

1. 你使用哪个 Agent：
   - Claude Code
   - Codex
2. 安装到哪里：
   - 当前项目
   - 用户全局

| Agent | 当前项目 | 用户全局 |
| --- | --- | --- |
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Codex | `.agents/skills/` | `~/.agents/skills/` |

### CLI 命令

```bash
orbit init       # 安装 Orbit skills
orbit update     # 更新已安装的 Orbit skills
orbit uninstall  # 卸载 Orbit skills
orbit -version   # 查看 Orbit 版本
```

### 手动安装

如果你不想安装全局 CLI，也可以克隆本仓库后，将 skills 复制到目标目录。

#### Claude Code

```bash
# 当前项目
mkdir -p .claude/skills
cp -r skills/* .claude/skills/

# 用户全局
mkdir -p ~/.claude/skills
cp -r skills/* ~/.claude/skills/
```

#### Codex

```bash
# 当前项目
mkdir -p .agents/skills
cp -r skills/* .agents/skills/

# 用户全局
mkdir -p ~/.agents/skills
cp -r skills/* ~/.agents/skills/
```

安装完成后，开始使用 Orbit：

```bash
/orbit
```

---

## 快速开始

### 作为 Claude Code 技能使用

```bash
# 自动工作流（推荐）
/orbit

# 或者直接调用特定阶段
/orbit-explore          # 阶段 1：需求探索
/orbit-brainstorming    # 阶段 2：技术设计
/orbit-planning         # 阶段 3.1：实施规划
/orbit-build            # 阶段 3.2：代码实施
/orbit-review           # 阶段 4：代码审查
/orbit-archive          # 阶段 5：归档和文档
/orbit-sync             # 规格变更后同步
```

### 首次使用

```bash
# 1. 开始一个新变更
/orbit

# Claude 会问："告诉我你想构建什么。"
# 回答后，跟随对话完成每个阶段

# 2. 随时查看状态
ls -la .orbit/
cat .orbit/state.yaml

# 3. 从上次中断的地方继续
/orbit
```

## 五阶段工作流

```
探索 → 头脑风暴 → 构建 → 审查 → 归档
 ↓        ↓        ↓      ↓      ↓
proposal  brain-   plan.md review  归档
.md      storming   + 代码  .md    + 合并
spec.md    .md
```

### 阶段详情

| 阶段                | 技能                               | 创建内容                        | 关键活动                                                              |
| ------------------- | ---------------------------------- | ------------------------------- | --------------------------------------------------------------------- |
| **1. 探索**         | `/orbit-explore`                   | `proposal.md`<br>`spec.md`      | 需求对话<br>问题/解决方案探索<br>功能规格                             |
| **2. 头脑风暴**     | `/orbit-brainstorming`             | `brainstorming.md`              | 技术设计<br>架构图（ASCII）<br>技术选择                               |
| **3. 构建**         | `/orbit-planning`<br>`/orbit-build` | `plan.md`<br>代码 + 测试        | 实施规划<br>子代理/内联执行<br>TDD 方法                               |
| **4. 审查**         | `/orbit-review`                    | `review.md`                     | 代码质量审查<br>Bug 检测<br>通过/失败验证                             |
| **5. 归档**         | `/orbit-archive`                   | 归档 + 索引<br>合并的规格       | 移动到归档<br>合并到主规格<br>清除状态                                |

---

## 核心机制

### 1. 基于脚本的自动化

所有关键逻辑都在 bash 脚本中（而非代理承诺）：

```bash
skills/orbit/scripts/
├── orbit-check-state.sh     # 检测当前阶段
├── orbit-phase-guard.sh     # 验证转换
├── orbit-update-hash.sh     # 跟踪文档变更
├── orbit-sync-detect.sh     # 检测过期文档
└── orbit-merge-spec.sh      # 智能规格合并
```

### 2. 基于哈希的文档跟踪

SHA256 哈希链确保一致性：

```yaml
documents:
  spec:
    hash: bbb222...
  brainstorming:
    hash: ccc333...
    based_on_spec_hash: bbb222...  ✓ 匹配
  plan:
    hash: ddd444...
    based_on_brainstorming_hash: ccc333...  ✓ 匹配
```

如果规格在构建期间变更 → **自动同步检测**。

### 3. 状态机

`.orbit/state.yaml` 跟踪工作流：

```yaml
workflow: full
phase: brainstorming
current_change: ops-platform

documents:
  proposal:
    path: .orbit/changes/ops-platform/proposal.md
    hash: aaa111...
  spec:
    path: .orbit/changes/ops-platform/spec.md
    hash: bbb222...
    based_on_proposal_hash: aaa111...
```

### 4. 阶段守卫

防止无效转换：

```bash
# 不能跳过阶段
bash skills/orbit/scripts/orbit-phase-guard.sh archive
# ✗ 缺少 review.md。请先运行审查阶段。
```

### 5. 自动同步

规格变更触发精准更新：

```bash
# 用户在构建期间编辑 spec.md
/orbit
# ⚠️  自从创建头脑风暴以来规格已更改
# 🔄 首先运行同步...
# [更新 brainstorming.md 和 plan.md]
# ✓ 同步完成，继续构建...
```

---

## 技能结构

```
skills/
├── orbit/                    # 主调度器 + 共享脚本
│   ├── SKILL.md
│   └── scripts/
│       ├── orbit-check-state.sh
│       ├── orbit-phase-guard.sh
│       ├── orbit-update-hash.sh
│       ├── orbit-sync-detect.sh
│       └── orbit-merge-spec.sh
│
├── orbit-explore/           # 阶段 1：需求
├── orbit-brainstorming/     # 阶段 2：技术设计
├── orbit-planning/          # 阶段 3.1：规划
├── orbit-build/             # 阶段 3.2：执行调度器
├── orbit-review/            # 阶段 4：代码审查
├── orbit-archive/           # 阶段 5：归档
├── orbit-sync/              # 同步处理器
│
└── 执行技能（由 orbit-build 调用）：
    ├── orbit-executing/      # 简单任务（≤2 个任务）
    ├── orbit-subagent-dev/   # 复杂任务（≥3 个任务）
    ├── orbit-tdd/            # 测试驱动开发
    ├── orbit-verify/         # 验证检查
    └── orbit-finishing/      # 分支清理
```

---

## 使用模式

### 模式 1：自动流程（推荐）

```bash
/orbit  # 重复调用，它会从当前阶段继续
```

**示例会话：**

```
回合 1: /orbit → 探索 → 创建 proposal.md + spec.md
回合 2: /orbit → 头脑风暴 → 创建 brainstorming.md
回合 3: /orbit → 规划 → 创建 plan.md
回合 4: /orbit → 构建 → 实施代码
回合 5: /orbit → 审查 → 创建 review.md
回合 6: /orbit → 归档 → 归档变更
```

### 模式 2：直接阶段调用（高级）

```bash
/orbit-brainstorming  # 跳转到头脑风暴（对快速设计有用）
/orbit-review         # 快速代码审查
/orbit-sync           # 规格编辑后手动同步
```

---

## 项目目录结构

```
myproject/
├── .orbit/
│   ├── state.yaml                      # 当前工作流状态
│   ├── changes/
│   │   └── my-feature/                 # 活动变更
│   │       ├── proposal.md
│   │       ├── spec.md
│   │       ├── brainstorming.md
│   │       ├── plan.md
│   │       └── review.md
│   ├── specs/
│   │   └── authentication.md           # 合并的主规格
│   ├── archive/
│   │   ├── INDEX.md
│   │   └── 2026-06-18-my-feature/      # 已完成的变更
│   └── design-sessions/
│       └── brainstorm-2026-06-18.md
│
└── (你的项目代码)
```

---

## 哈希链示例

完整的文档谱系：

```yaml
documents:
  proposal:
    hash: aaa111...

  spec:
    hash: bbb222...
    based_on_proposal_hash: aaa111...  ✓

  brainstorming:
    hash: ccc333...
    based_on_spec_hash: bbb222...      ✓

  plan:
    hash: ddd444...
    based_on_brainstorming_hash: ccc333...  ✓

  review:
    hash: eee555...
    based_on_plan_hash: ddd444...      ✓
```

**如果 spec.md 变更：**

```yaml
spec:
  hash: bbb999...  ← 已变更！

brainstorming:
  based_on_spec_hash: bbb222...  ✗ 不匹配
```

→ `orbit-sync-detect.sh` 捕获此情况  
→ 自动触发 `/orbit-sync`  
→ 更新 brainstorming.md 和 plan.md  
→ 重建哈希链

---

## 设计原则

1. **脚本优先** - 关键逻辑在 bash 脚本中，而非代理解释
2. **基于哈希的可追溯性** - SHA256 跟踪所有文档关系
3. **自动同步** - 规格变更触发精准更新，而非完全重写
4. **阶段守卫** - 防止无效的工作流状态
5. **增量规格** - 变更合并到主文档，保留历史
6. **独立技能** - 可以直接调用任何阶段以获得灵活性

---

## 与类似工具的比较

| 维度           | Comet                                | Orbit                              |
| -------------- | ------------------------------------ | ---------------------------------- |
| **定位**       | OpenSpec + Superpowers               | 独立的 5 阶段工作流                |
| **依赖**       | 外部 CLI（openspec, superpowers）    | 自包含的技能 + 脚本                |
| **调用**       | `/comet`, `/comet-open` 等           | `/orbit`, `/orbit-explore` 等      |
| **阶段 2 名称** | design                               | brainstorming（探索重点）          |
| **自动化**     | 状态机 + 脚本                        | 状态机 + 脚本 + 哈希跟踪           |
| **构建策略**   | Superpowers 执行                     | 子代理驱动或内联                   |
| **可扩展性**   | 单体技能                             | 模块化独立技能                     |

---

## 文档

- [orbit-project-plan.md](orbit-project-plan.md) - 原始项目计划
- [CLAUDE.md](CLAUDE.md) - 开发指南

---

## 路线图

### ✅ v0.1.0 - MVP（当前）

- ✅ 5 阶段工作流技能
- ✅ 基于脚本的自动化
- ✅ 基于哈希的文档跟踪
- ✅ 同步检测和恢复
- ✅ 独立技能调用

### v0.2.0 - 增强功能

- [ ] 工作流模板（仅探索、仅构建）
- [ ] 热修复和微调工作流
- [ ] 更好的错误恢复
- [ ] 多语言支持

### v0.3.0 - 集成

- [ ] 用于提交验证的 Git 钩子
- [ ] CI/CD 集成
- [ ] 团队协作功能

### v1.0.0 - 生产就绪

- [ ] 完整的测试覆盖
- [ ] 完整的文档
- [ ] 性能优化
- [ ] 社区推广

---

## 致谢

灵感来源：

- [OpenSpec](https://github.com/Fission-AI/OpenSpec) - 规格生命周期
- [Superpowers](https://github.com/obra/superpowers) - 开发方法论
