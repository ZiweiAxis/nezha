# 本目录说明（I-013 迁移后）

**代码与构建已上移至仓库根。** 请从**仓库根**执行：

- 构建：`make build` 或 `go build -o bin/diting ./cmd/diting_allinone`
- 运行：`make run` 或 `./bin/diting`
- 单测：`make test`
- 执行层验证：`./scripts/verify_exec.sh`

配置与文档：

- 配置层次：`docs/diting/CONFIG_LAYERS.md`
- 入口说明：`docs/diting/MAIN_ENTRIES.md`
- 验收清单：`docs/diting/ACCEPTANCE_CHECKLIST.md`
- 开发 Watch：`docs/diting/DEV_WATCH.md`、`make watch`

本目录仅保留本地配置（如 `.env`、`config.yaml`）及历史脚本副本，新开发请以仓库根为工作目录。
