# CHEQ 协议 - IETF 草案

> CHEQ: A Protocol for Confirmation AI Agent Decisions with Human in the Loop (HITL)

## 基本信息

| 项目 | 内容 |
|------|------|
| **全称** | Confirmation with Human in the Loop (HITL) Exchange of Quotations |
| **草案名** | `draft-rosenberg-aiproto-cheq-00` |
| **状态** | Active Internet-Draft（个人草案） |
| **作者** | Jonathan Rosenberg（Five9）、Pat White（Bitwave）、Cullen Fluffy Jennings（Cisco） |
| **发布日期** | 2025-10-19 |
| **过期日期** | 2026-04-22 |

## 核心概念

CHEQ 是一个 **IETF 标准草案协议**，用于 AI Agent 决策的人类确认（HITL）。

与紫微项目的 CHEQ（Confirmation Engine）概念一致：
- AI 执行敏感操作前，需要人类审批确认
- 支持多种确认方式（批准/拒绝）
- 全流程审计追溯

## 参考网址

### 官方
- IETF Datatracker: https://datatracker.ietf.org/doc/draft-rosenberg-aiproto-cheq/
- HTML 版本: https://www.ietf.org/archive/id/draft-rosenberg-aiproto-cheq-00.html

### 国内镜像
- 阿里云: https://mirrors.aliyun.com/ietf/draft-rosenberg-aiproto-cheq-00.html

## 协议结构

1. **Introduction** - 概述
2. **Requirements** - 需求
3. **Architectural Framework** - 架构框架
4. **Overview of Operation** - 操作流程
   - 4.1 Triggering Confirmation
   - 4.2 Performing Confirmation
   - 4.3 Finalizing
5. **Detailed Protocol Specification** - 详细协议规范
   - 8.1 URI Pack Syntax
   - 8.2 CHEQ Object Syntax
   - 8.3 CHEQ Protocol Details

## 与紫微的关系

紫微项目中的 CHEQ（Confirmation Engine）实现与该 IETF 草案概念一致：
- 都是为了实现 AI 决策的人类确认
- 草案提供了标准化的协议设计参考
- 可借鉴协议规范完善紫微实现

## 相关文档

- [核心目标-飞书端到端流程.md](./核心目标-飞书端到端流程.md) - CHEQ 在紫微中的应用
- [紫微平台各模块集成方案.md](./紫微平台各模块集成方案.md) - 谛听 CHEQ 模块
