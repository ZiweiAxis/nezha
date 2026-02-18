# NAS Synapse 与紫微 Secret 一致性

**目的**：天枢通过 `REGISTRATION_SHARED_SECRET` 在 NAS Synapse 上自动注册网关用户（如 `@gateway:xyin.oicp.net`）。NAS 上 Synapse 的 `registration_shared_secret` 必须与紫微侧使用的 **同一约定值**，否则注册会失败（如 Synapse 未返回 nonce）。

---

## 约定值（唯一权威来源）

| 变量 / 配置项 | 约定值 |
|---------------|--------|
| 紫微 `.env` / Compose | `REGISTRATION_SHARED_SECRET=ziwei-gateway-dev-secret` |
| NAS Synapse `homeserver.yaml` | `registration_shared_secret: "ziwei-gateway-dev-secret"` |

**紫微侧**：见 `deploy/env.example`，复制到根目录 `.env` 后默认即为此值；Compose 中默认也为该值（`REGISTRATION_SHARED_SECRET` / `SYNAPSE_REGISTRATION_SHARED_SECRET`）。

**NAS 侧**：在 NAS 上部署 Synapse 时，必须在 `homeserver.yaml` 中配置与上表一致的 `registration_shared_secret`。

---

## NAS 上如何配置 / 检查

1. **找到 Synapse 配置目录**  
   例如：`/volume1/docker/synapse-data`（或你实际挂载的数据目录）。主配置一般为该目录下的 `homeserver.yaml`。

2. **编辑 `homeserver.yaml`**  
   确保存在且与紫微一致：
   ```yaml
   registration_shared_secret: "ziwei-gateway-dev-secret"
   ```
   若已有该行但值不同，改为上述字符串（注意引号、无多余空格）。

3. **重启 Synapse 容器**  
   修改后需重启 NAS 上的 Synapse 容器使配置生效。

4. **验证**  
   启动天枢（本机或 NAS 外连 NAS Synapse），看天枢日志：无「Synapse 未返回 nonce」「未配置 registration_shared_secret」等错误，且能成功注册网关用户即表示 secret 一致。

---

## 小结

- **唯一约定值**：`ziwei-gateway-dev-secret`。
- **紫微**：`deploy/env.example` 与 Compose 默认已写该值；用 `.env` 时保持 `REGISTRATION_SHARED_SECRET=ziwei-gateway-dev-secret`。
- **NAS Synapse**：`homeserver.yaml` 中 `registration_shared_secret: "ziwei-gateway-dev-secret"`，修改后重启 Synapse。
