# 悟空项目技术规范

## 1. 代码规范

### 1.1 Python 版本
- 最低支持版本: Python 3.8
- 推荐版本: Python 3.10+

### 1.2 代码风格
- 遵循 PEP 8 规范
- 使用 Black 进行代码格式化 (行长度: 88)
- 使用 isort 进行导入排序
- 使用 type hints 进行类型注解

### 1.3 命名规范
```python
# 类名: PascalCase
class AgentManager:
    pass

# 函数/方法: snake_case
def process_message():
    pass

# 常量: UPPER_SNAKE_CASE
MAX_RETRY_COUNT = 3

# 私有成员: 前缀下划线
def _internal_method():
    pass
```

### 1.4 文档字符串
使用 Google 风格的 docstring:

```python
def process_task(task_id: str, priority: int = 0) -> dict:
    """处理指定的任务。

    Args:
        task_id: 任务的唯一标识符
        priority: 任务优先级，默认为 0

    Returns:
        包含处理结果的字典，格式为:
        {
            'status': 'success' | 'failed',
            'result': Any,
            'error': Optional[str]
        }

    Raises:
        TaskNotFoundError: 当任务不存在时
        InvalidPriorityError: 当优先级无效时

    Example:
        >>> result = process_task('task-123', priority=1)
        >>> print(result['status'])
        'success'
    """
    pass
```

## 2. 项目结构规范

### 2.1 目录组织
```
wukong/
├── __init__.py           # 包初始化，导出公共 API
├── core/                 # 核心模块
│   ├── __init__.py
│   ├── agent.py
│   ├── graph.py
│   ├── state.py
│   └── tools.py
├── agents/               # Agent 实现
│   ├── __init__.py
│   ├── base.py          # 基础 Agent
│   └── ...
├── tools/                # 工具实现
│   ├── __init__.py
│   ├── base.py          # 基础工具
│   └── ...
├── utils/                # 工具函数
│   ├── __init__.py
│   ├── config.py
│   ├── logger.py
│   └── exceptions.py
└── examples/             # 示例代码
    └── ...

tests/                    # 测试代码
├── unit/                # 单元测试
├── integration/         # 集成测试
└── e2e/                 # 端到端测试

docs/                     # 文档
├── api/                 # API 文档
├── guides/              # 使用指南
└── examples/            # 示例文档
```

### 2.2 模块导入规范
```python
# 标准库
import os
import sys
from typing import Dict, List, Optional

# 第三方库
import langgraph
from pydantic import BaseModel

# 本地模块
from wukong.core.agent import BaseAgent
from wukong.utils.logger import get_logger
```

## 3. 核心接口规范

### 3.1 State 接口
```python
from typing import TypedDict, List, Optional

class AgentState(TypedDict):
    """Agent 状态定义"""
    messages: List[dict]          # 消息历史
    current_agent: str            # 当前 Agent
    context: dict                 # 上下文信息
    tools_output: Optional[dict]  # 工具输出
    metadata: dict                # 元数据
```

### 3.2 Agent 接口
```python
from abc import ABC, abstractmethod
from typing import Any, Dict

class BaseAgent(ABC):
    """Agent 基类"""

    def __init__(self, name: str, config: Dict[str, Any]):
        self.name = name
        self.config = config

    @abstractmethod
    async def process(self, state: AgentState) -> AgentState:
        """处理状态并返回新状态"""
        pass

    @abstractmethod
    def get_tools(self) -> List[BaseTool]:
        """获取 Agent 可用的工具列表"""
        pass
```

### 3.3 Tool 接口
```python
from abc import ABC, abstractmethod
from typing import Any, Dict
from pydantic import BaseModel

class ToolInput(BaseModel):
    """工具输入基类"""
    pass

class ToolOutput(BaseModel):
    """工具输出基类"""
    success: bool
    result: Any
    error: Optional[str] = None

class BaseTool(ABC):
    """工具基类"""

    name: str
    description: str

    @abstractmethod
    async def execute(self, input: ToolInput) -> ToolOutput:
        """执行工具"""
        pass

    def validate_input(self, input: ToolInput) -> bool:
        """验证输入"""
        return True
```

## 4. 配置规范

### 4.1 配置文件格式
使用 YAML 格式:

```yaml
# config.yaml
wukong:
  # LLM 配置
  llm:
    provider: "openai"  # openai, anthropic, local
    model: "gpt-4"
    temperature: 0.7
    max_tokens: 2000

  # Agent 配置
  agents:
    researcher:
      enabled: true
      max_iterations: 5
    coder:
      enabled: true
      language: "python"

  # 工具配置
  tools:
    search:
      enabled: true
      provider: "google"
    file:
      enabled: true
      allowed_paths: ["/tmp", "./workspace"]

  # 日志配置
  logging:
    level: "INFO"
    format: "json"
    output: "stdout"
```

### 4.2 环境变量
```bash
# API 密钥
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# 配置文件路径
WUKONG_CONFIG_PATH=/path/to/config.yaml

# 日志级别
WUKONG_LOG_LEVEL=DEBUG
```

## 5. 错误处理规范

### 5.1 异常层次
```python
class WukongError(Exception):
    """基础异常类"""
    pass

class ConfigError(WukongError):
    """配置错误"""
    pass

class AgentError(WukongError):
    """Agent 错误"""
    pass

class ToolError(WukongError):
    """工具错误"""
    pass

class StateError(WukongError):
    """状态错误"""
    pass
```

### 5.2 错误处理模式
```python
from wukong.utils.logger import get_logger

logger = get_logger(__name__)

async def safe_execute(func, *args, **kwargs):
    """安全执行函数"""
    try:
        return await func(*args, **kwargs)
    except WukongError as e:
        logger.error(f"Wukong error: {e}", exc_info=True)
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise WukongError(f"Unexpected error: {e}") from e
```

## 6. 测试规范

### 6.1 测试组织
```python
# tests/unit/core/test_agent.py
import pytest
from wukong.core.agent import BaseAgent

class TestBaseAgent:
    """BaseAgent 测试类"""

    @pytest.fixture
    def agent(self):
        """创建测试 Agent"""
        return MockAgent(name="test", config={})

    def test_initialization(self, agent):
        """测试初始化"""
        assert agent.name == "test"

    async def test_process(self, agent):
        """测试处理方法"""
        state = {"messages": []}
        result = await agent.process(state)
        assert "messages" in result
```

### 6.2 测试覆盖率
- 单元测试覆盖率 > 80%
- 核心模块覆盖率 > 90%
- 使用 pytest-cov 生成覆盖率报告

### 6.3 Mock 和 Fixture
```python
import pytest
from unittest.mock import Mock, AsyncMock

@pytest.fixture
def mock_llm():
    """Mock LLM"""
    llm = AsyncMock()
    llm.generate.return_value = "test response"
    return llm

@pytest.fixture
def sample_state():
    """示例状态"""
    return {
        "messages": [],
        "current_agent": "test",
        "context": {}
    }
```

## 7. 性能规范

### 7.1 性能目标
- Agent 响应时间 < 2s (不含 LLM 调用)
- 工具执行时间 < 1s
- 状态序列化/反序列化 < 100ms
- 内存使用 < 500MB (基础运行)

### 7.2 性能监控
```python
import time
from functools import wraps

def measure_time(func):
    """测量函数执行时间"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start = time.time()
        result = await func(*args, **kwargs)
        duration = time.time() - start
        logger.info(f"{func.__name__} took {duration:.2f}s")
        return result
    return wrapper
```

## 8. 安全规范

### 8.1 输入验证
- 所有外部输入必须验证
- 使用 Pydantic 进行数据验证
- 防止注入攻击

### 8.2 密钥管理
- 不在代码中硬编码密钥
- 使用环境变量或密钥管理服务
- 日志中不输出敏感信息

### 8.3 沙箱执行
- 工具执行在受限环境中
- 文件操作限制在指定目录
- 网络访问需要明确授权

## 9. 版本管理

### 9.1 语义化版本
遵循 SemVer 2.0.0:
- MAJOR.MINOR.PATCH
- 例如: 0.1.0, 1.0.0, 1.2.3

### 9.2 变更日志
使用 Keep a Changelog 格式:
```markdown
## [0.1.0] - 2024-01-15
### Added
- 初始版本发布
- 基础 Agent 系统
- 核心工具集

### Changed
- 无

### Fixed
- 无
```

## 10. 文档规范

### 10.1 README 结构
- 项目简介
- 快速开始
- 安装说明
- 基础示例
- 文档链接
- 贡献指南
- 许可证

### 10.2 API 文档
- 使用 Sphinx 生成
- 包含所有公共 API
- 提供使用示例
- 自动从 docstring 生成

### 10.3 使用指南
- 概念介绍
- 详细教程
- 最佳实践
- 常见问题
