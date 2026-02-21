# E015: 天枢 Telegram 审批投递修复

## 目标
修复天枢使其支持 Telegram 审批投递，移除 Matrix 依赖

## 背景
E014 集成测试中发现天枢依赖 Matrix 导致启动失败，需要修复为支持 Telegram 投递

## Story

### S080: 恢复天枢基础功能
- 恢复被破坏的 import 语句
- 验证天枢能正常启动

### S081: 支持 Telegram 审批投递
- 添加 Telegram Provider 投递逻辑
- 配置审批消息发送 Telegram

### S082: 支持只读模式
- Matrix 连接失败时不退出
- 仅支持 Telegram 投递模式

### S083: 端到端测试
- 重启所有服务
- 验证完整流程
