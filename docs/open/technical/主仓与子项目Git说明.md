# 主仓与子项目 Git 管理说明

主仓（ziwei）与子项目天枢（tianshu）、獬豸（xiezhi）、太白（taibai）**各自独立 git**：主仓推 **NAS**，子项目开源推 **GitHub**，互不冲突。

**基础规范**：所有子仓库在主仓中均为 **git submodule**。**BMAD 文档仍按 BMAD 规范存放在各子项目目录内**（如 `tianshu/_bmad-output/`、`xiezhi/_bmad/`）；**Git 层面**由子仓 `.gitignore` 忽略上述路径、**由主仓跟踪并提交**这些文档。**悟空（wukong）** 及 **源于 wukong 的子项目**适用同一约定。

---

## ZiweiAxis 组织与仓库命名（统一约定）

**所有子仓库统一放在 GitHub 组织 [ZiweiAxis](https://github.com/ZiweiAxis) 下，仓库名与模块名一致：**

| 模块名 | 产品名 | GitHub 仓库 | 说明 |
|--------|--------|-------------|------|
| **tianshu** | 天枢 | [ZiweiAxis/tianshu](https://github.com/ZiweiAxis/tianshu) | 仓库名 = 模块名 |
| **xiezhi** | 獬豸 | [ZiweiAxis/xiezhi](https://github.com/ZiweiAxis/xiezhi) | 仓库名 = 模块名 |
| **taibai** | 太白 | [ZiweiAxis/taibai](https://github.com/ZiweiAxis/taibai) | 仓库名 = 模块名 |
| **wukong** | 悟空 | ZiweiAxis/wukong 或约定仓库 | Agent 生命周期管理器；源于 wukong 的子项目同此约定 |

- 克隆/推送统一使用：`git@github.com:ZiweiAxis/<模块名>.git` 或 `https://github.com/ZiweiAxis/<模块名>.git`。
- 迁移前若子仓在个人账号（如 hulk-yin/xiezhi），迁移时把 `origin` 改为上述 ZiweiAxis 对应仓库即可。

---

## 主仓推 NAS、子项目推 GitHub — 是否冲突？

**不冲突。** 主仓一个远程、子项目各一个远程，各推各的：

| 仓库 | 远程 | 说明 |
|------|------|------|
| **ziwei（主仓）** | `nas` → `nas:/volume2/homes/hulk/git/ziwei.git` | 主目录（docs、_bmad、_bmad-output、.cursor 等）+ 各子项目 BMAD 产出落在主仓路径（见下）；仅推 NAS |
| **tianshu（天枢）** | `origin` → `ZiweiAxis/tianshu` | 在 `ziwei/tianshu` 下 `git push origin` |
| **xiezhi（獬豸）** | `origin` → `ZiweiAxis/xiezhi` | 在 `ziwei/xiezhi` 下 `git push origin` |
| **taibai（太白）** | `origin` → `ZiweiAxis/taibai` | 在 `ziwei/taibai` 下 `git push origin` |

- 主仓 `git push nas` 只推送 ziwei 自己的提交与主仓内跟踪的文件（含根 _bmad、_bmad-output 及主仓内维护的子项目 BMAD 文档），**不会**改子项目的 GitHub 远程。
- 在 tianshu / xiezhi / taibai 目录下 `git push origin` 只推送到各自 ZiweiAxis 仓库。
- 日常：改主仓文档/规划 → `cd ziwei && git add . && git commit && git push nas`；改子项目代码 → 进对应目录 `git push origin`。

主仓本地已配置用户：`user.name = hulk`，`user.email = yinkehao@163.com`（仅 ziwei 仓库生效）。

---

## BMAD 输出：子仓忽略、主仓跟踪

- **BMAD 文档位置**：各子项目的 BMAD 文档与产出**仍按 BMAD 规范存放在该子项目目录内**（如 `tianshu/_bmad-output/planning-artifacts/`、`xiezhi/_bmad/`），不挪到主仓根路径。
- **子项目**（天枢、獬豸、太白、悟空及源于 wukong 的子项目）：在各自 `.gitignore` 中忽略 `_bmad/`、`_bmad-output/`，**不提交**这些路径；子仓仅提交代码。
- **主仓（紫微）**：通过 .gitignore 配置**只跟踪**各子项目目录下的 `_bmad/`、`_bmad-output/`（不跟踪子项目其余代码），从而在 Git 上由主仓提交、推送这些 BMAD 文档。根目录自身的 `_bmad/`、`_bmad-output/` 也由主仓跟踪。

---

## 当前状态

| 目录   | 说明           |
|--------|----------------|
| ziwei  | 主仓，已 init，远程 `nas` → NAS 裸仓 ziwei.git |
| tianshu | 天枢，独立 .git，远程应指向 `ZiweiAxis/tianshu` |
| xiezhi | 獬豸，独立 .git，远程应指向 `ZiweiAxis/xiezhi`（迁移前可能在个人账号） |
| taibai | 太白，需在 GitHub 建仓后 `git init` 并设 `origin` → `ZiweiAxis/taibai` |

---

## 迁移到 ZiweiAxis（统一子仓远程）

在 GitHub 上创建组织 **ZiweiAxis**（若尚未创建），并在该组织下创建仓库 **tianshu**、**xiezhi**、**taibai**（仓库名与模块名一致）。随后在本地：

**xiezhi / tianshu：把 origin 改为 ZiweiAxis 对应仓库**

```bash
# 獬豸
cd /home/dministrator/workspace/ziwei/xiezhi
git remote set-url origin git@github.com:ZiweiAxis/xiezhi.git
# 首次迁移：把现有代码推上去（若 ZiweiAxis/xiezhi 为空）
# git push -u origin main

# 天枢
cd /home/dministrator/workspace/ziwei/tianshu
git remote set-url origin git@github.com:ZiweiAxis/tianshu.git
# 若此前 origin 指向别处，同上：git push -u origin main
```

**太白（taibai）：在 GitHub 建仓后本地初始化并推送**

1. 在 GitHub 组织 ZiweiAxis 下新建**空仓库**，仓库名：**taibai**（与模块名一致）。
2. 本地执行：

```bash
cd /home/dministrator/workspace/ziwei/taibai
git init
git add .
git commit -m "chore: 太白项目初始化"
git remote add origin git@github.com:ZiweiAxis/taibai.git
git branch -M main
git push -u origin main
```

完成后，三个子仓的 `origin` 均为 `ZiweiAxis/<模块名>`，仓库名与模块名一致。

---

## 方案一：主仓与子项目完全独立（推荐，最简单）

主仓管理：ziwei 根下自有文件 + 子项目下的 `_bmad/`、`_bmad-output/`；子项目其余代码由各自 git 管理。

### 1. 主仓（ziwei）— 推 NAS

```bash
cd /home/dministrator/workspace/ziwei
# 已配置远程：git remote add nas nas:/volume2/homes/hulk/git/ziwei.git
git add .
git commit -m "你的提交说明"
git push nas
```

主仓只推 `nas`，不涉及子项目各自的 GitHub。

### 2. 天枢（tianshu）— 独立仓库

在 `ziwei/tianshu` 下 `git init`（若尚未初始化），`origin` 设为 `ZiweiAxis/tianshu`，照常 `git push origin`。

### 3. 獬豸（xiezhi）

已有 `.git`，将 `origin` 设为 `ZiweiAxis/xiezhi` 后，在 `ziwei/xiezhi` 下照常 `git push origin`；与主仓推 NAS 互不冲突。

### 4. 太白（taibai）

在 GitHub 创建 `ZiweiAxis/taibai` 后，在 `ziwei/taibai` 下执行上文「太白（taibai）：在 GitHub 建仓后本地初始化并推送」中的命令即可。

---

## 方案二：主仓用 submodule 记录子项目版本

若希望主仓「记录」当前使用的天枢、獬豸具体 commit（便于复现、回滚），可用 submodule。

### 1. 天枢先成仓并至少一次提交

```bash
cd /home/dministrator/workspace/ziwei/tianshu
git init
git add .
git commit -m "chore: 天枢项目初始化"
```

### 2. 主仓 init 并添加 submodule（纯本地路径）

先**删除**主仓 `.gitignore` 里对 `tianshu/`、`xiezhi/` 的忽略，再执行：

```bash
cd /home/dministrator/workspace/ziwei

# 若 xiezhi、tianshu 已在目录里且已有 .git，用本地路径添加为 submodule
# 注意：需先备份或确认 xiezhi/tianshu 内容，下面会“接管”这两个目录

# 先 init 主仓
git init

# 以「当前目录下已有仓库」方式登记为 submodule（保留现有 clone）
git submodule add -f ./xiezhi xiezhi 2>/dev/null || true
# 若报错，可先 mv xiezhi xiezhi.bak，再：git submodule add file:///home/dministrator/workspace/ziwei/xiezhi.bak xiezhi

# 天枢同理
git submodule add -f ./tianshu tianshu 2>/dev/null || true
```

更稳妥的 submodule 添加方式（子项目已在本地）：

```bash
cd /home/dministrator/workspace/ziwei
git init
# 添加时使用 file:// 绝对路径（纯本地）
git submodule add file:///home/dministrator/workspace/ziwei/xiezhi xiezhi
git submodule add file:///home/dministrator/workspace/ziwei/tianshu tianshu
git add .
git commit -m "chore: 主仓初始化，xiezhi/tianshu 为 submodule"
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

## 建议执行顺序（方案一 + ZiweiAxis）

1. **GitHub**  
   在组织 [ZiweiAxis](https://github.com/ZiweiAxis) 下创建仓库 **tianshu**、**xiezhi**、**taibai**（仓库名与模块名一致；若已有则跳过）。

2. **主仓**  
   `cd ziwei && git push nas` 照常；主仓仅推 NAS。

3. **子仓远程**  
   xiezhi / tianshu：`git remote set-url origin git@github.com:ZiweiAxis/<模块名>.git`；taibai：在 `ziwei/taibai` 内 `git init` → `git remote add origin git@github.com:ZiweiAxis/taibai.git` → 提交并 `git push -u origin main`。

4. **日常**  
   主仓改文档/规划 → `cd ziwei && git add . && git commit && git push nas`；改天枢/獬豸/太白 → 进对应目录 `git push origin`。

这样即可实现：主仓推 NAS，天枢、獬豸、太白各自推 ZiweiAxis 下同名仓库，互不冲突。
