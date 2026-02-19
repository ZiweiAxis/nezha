# 紫微平台 - 组件端口规范

## 概述

本文档定义紫微平台各组件的默认端口分配，确保开发、测试、生产环境的统一性。

## 端口分配表

| 组件 | 服务名 | 默认端口 | 协议 | 说明 |
|------|--------|----------|------|------|
| **天枢** | tianshu | **8081** | HTTP | 网关服务 API |
| **獬豸** | xiezhi | **8080** | HTTP | 策略服务 + 审批服务 |
| **悟空** | wukong | **8082** | HTTP | 拦截器服务 |
| **Synapse** | synapse | **8008** | HTTP | Matrix homeserver |
| **Synapse** | synapse | **8448** | HTTPS | Matrix federation (SSL) |

## 端口规划原则

1. **固定端口**: 每个组件使用固定端口，避免动态分配带来的不确定性
2. **避免冲突**: 端口区间划分清晰，开发时严格遵循
3. **本地开发**: 默认使用 localhost 访问
4. **容器化**: 容器间通过服务名通信，映射到宿主机时使用统一端口

## 端口区间划分

| 区间 | 用途 |
|------|------|
| 3000-3999 | 前端/UI 服务 |
| 5000-5999 | 数据库/后端辅助服务 |
| 8000-8999 | 核心服务 (API/Mesh) |
| 9000-9999 | 开发工具/监控 |

## 各组件配置示例

### Docker Compose

```yaml
services:
  synapse:
    ports:
      - "8008:8008"   # HTTP
      - "8448:8448"   # Federation

  xiezhi:
    ports:
      - "8080:8080"

  tianshu:
    ports:
      - "8081:8081"

  wukong:
    ports:
      - "8082:8082"
```

### 环境变量

```bash
# 天枢
export Tianshu_PORT=8081
export MATRIX_HOMESERVER=http://localhost:8008

# 獬豸
export DITING_PORT=8080

# 悟空
export WUKONG_PORT=8082
```

## 历史变更

- **2026-02-17**: 初始版本，定义四大组件端口
  - 天枢: 8081 (原 8080 与 xiezhi 冲突)
  - 獬豸: 8080
  - 悟空: 8082 (新增)
  - Synapse: 8008
