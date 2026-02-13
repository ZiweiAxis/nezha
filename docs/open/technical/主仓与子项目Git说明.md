# 主仓与子项目 Git 管理说明

主仓（ziwei）与子项目天枢（tianshu）、谛听（diting）各自独立 git，主仓纯本地、无远程。

---

## BMAD 输出：子仓忽略、紫微管理

- **子项目**（天枢、谛听）：在各自 `.gitignore` 中忽略 `_bmad/`、`_bmad-output/`，不纳入子仓版本。
- **主仓（紫微）**：只跟踪并管理子项目下的 `_bmad/`、`_bmad-output/`，子项目其余代码不进入主仓。

主仓 `.gitignore` 已配置为：忽略 `/tianshu/*`、`/diting/*`，但保留并跟踪  
`tianshu/_bmad/`、`tianshu/_bmad-output/`、`diting/_bmad/`、`diting/_bmad-output/`。  
天枢、谛听各自的 `.gitignore` 中已包含 `_bmad/`、`_bmad-output/`，子仓不跟踪这部分内容。

---

## 当前状态

| 目录   | 说明           |
|--------|----------------|
| ziwei  | 主仓，尚未 init |
| tianshu | 天枢，暂无 .git |
| diting | 谛听，已有独立 .git（origin/master） |

---

## 方案一：主仓与子项目完全独立（推荐，最简单）

主仓管理：ziwei 根下自有文件 + 子项目下的 `_bmad/`、`_bmad-output/`；子项目其余代码由各自 git 管理。

### 1. 主仓（ziwei）— 纯本地

```bash
cd /home/dministrator/workspace/ziwei
git init
# .gitignore 已配置：子项目代码忽略，仅跟踪子项目下的 _bmad/_bmad-output
git add .
git commit -m "chore: 主仓初始化，子项目天枢/谛听独立管理，BMAD 输出由紫微管理"
```

之后主仓正常使用：`git add`、`git commit`，不涉及子项目内容。

### 2. 天枢（tianshu）— 独立仓库

```bash
cd /home/dministrator/workspace/ziwei/tianshu
git init
git add .
git commit -m "chore: 天枢项目初始化"
```

### 3. 谛听（diting）

已有 `.git`，无需再 init，在 `ziwei/diting` 下照常 `git add` / `git commit` / `git push` 即可。

---

## 方案二：主仓用 submodule 记录子项目版本

若希望主仓「记录」当前使用的天枢、谛听具体 commit（便于复现、回滚），可用 submodule。

### 1. 天枢先成仓并至少一次提交

```bash
cd /home/dministrator/workspace/ziwei/tianshu
git init
git add .
git commit -m "chore: 天枢项目初始化"
```

### 2. 主仓 init 并添加 submodule（纯本地路径）

先**删除**主仓 `.gitignore` 里对 `tianshu/`、`diting/` 的忽略，再执行：

```bash
cd /home/dministrator/workspace/ziwei

# 若 diting、tianshu 已在目录里且已有 .git，用本地路径添加为 submodule
# 注意：需先备份或确认 diting/tianshu 内容，下面会“接管”这两个目录

# 先 init 主仓
git init

# 以「当前目录下已有仓库」方式登记为 submodule（保留现有 clone）
git submodule add -f ./diting diting 2>/dev/null || true
# 若报错，可先 mv diting diting.bak，再：git submodule add file:///home/dministrator/workspace/ziwei/diting.bak diting

# 天枢同理
git submodule add -f ./tianshu tianshu 2>/dev/null || true
```

更稳妥的 submodule 添加方式（子项目已在本地）：

```bash
cd /home/dministrator/workspace/ziwei
git init
# 添加时使用 file:// 绝对路径（纯本地）
git submodule add file:///home/dministrator/workspace/ziwei/diting diting
git submodule add file:///home/dministrator/workspace/ziwei/tianshu tianshu
git add .
git commit -m "chore: 主仓初始化，diting/tianshu 为 submodule"
```

之后克隆主仓时需：

```bash
git clone <主仓路径> ziwei
cd ziwei
git submodule update --init --recursive
```

---

## 与上层 workspace 的关系

当前 workspace 根目录（`/home/dministrator/workspace`）已是另一个 git 仓库（无 commit），且把整个 `ziwei/` 列为未跟踪。

- 若希望 **只有 ziwei 是主仓**：在 ziwei 内按上面步骤 `git init` 即可；workspace 根仓可不再使用，或仅用于管理 workspace 下其它目录。
- 若希望 **workspace 根仓包含 ziwei**：可在 workspace 根仓的 `.gitignore` 里加入 `ziwei/`，不把 ziwei 纳入该仓，让 ziwei 单独做自己的主仓。

---

## 建议执行顺序（方案一）

1. **主仓**  
   `cd /home/dministrator/workspace/ziwei && git init && git add . && git commit -m "chore: 主仓初始化"`

2. **天枢**  
   `cd /home/dministrator/workspace/ziwei/tianshu && git init && git add . && git commit -m "chore: 天枢初始化"`

3. **谛听**  
   保持现状，在 `ziwei/diting` 下继续按原流程使用 git。

这样即可实现：主仓与天枢、谛听各自独立 git 管理，主仓纯本地。
