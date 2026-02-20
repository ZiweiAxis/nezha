# 故障排查与恢复（FR23）

## 审批超时/失败/拒绝后的恢复路径

- **待审批 (pending)**：可设置 `WUKONG_APPROVAL_POLL_INTERVAL_MS` 与 `WUKONG_APPROVAL_POLL_MAX_ATTEMPTS` 启用轮询，或稍后重新执行 `wukong claude` 再查状态。
- **拒绝 (rejected)**：联系管理员确认审批策略；可删除本地身份后重新注册：移除 `~/.wukong/identities.json` 中对应条目或使用 `wukong identity` 重新注册。
- **超时 (timeout)**：与“拒绝”相同，重试或联系管理员；重试行为与上述一致。

## 配置错误

- 检查 `~/.wukong/config.json` 与环境变量 `TIANSHU_API_URL`、`WUKONG_OWNER_ID`。
- 运行 `wukong config` 查看当前生效配置。

## 网络错误

- 确保天枢服务可达；检查防火墙与代理。
- 错误信息中会包含 HTTP 状态码或连接失败原因，便于追溯。
