# 悟空项目依赖清单

## 1. 核心依赖

### 1.1 LangGraph 生态
```toml
langgraph = "^0.2.0"           # 状态图编排框架
langchain-core = "^0.3.0"      # LangChain 核心组件
langchain-community = "^0.3.0" # 社区集成
```

**用途**:
- LangGraph: 构建和管理 Agent 工作流的状态图
- LangChain Core: 提供基础的 LLM 抽象和工具接口
- LangChain Community: 提供各种工具和集成

### 1.2 LLM 提供商
```toml
langchain-openai = "^0.2.0"     # OpenAI 集成
langchain-anthropic = "^0.2.0"  # Anthropic 集成
```

**用途**: 支持多种 LLM 提供商

### 1.3 数据验证和配置
```toml
pydantic = "^2.0.0"            # 数据验证
pydantic-settings = "^2.0.0"   # 配置管理
```

**用途**:
- 类型验证和数据模型
- 配置文件解析和环境变量管理

### 1.4 异步支持
```toml
asyncio = "*"                  # Python 标准库
aiohttp = "^3.9.0"            # 异步 HTTP 客户端
aiofiles = "^23.0.0"          # 异步文件操作
```

**用途**: 支持异步 Agent 和工具执行

## 2. 工具依赖

### 2.1 搜索工具
```toml
google-search-results = "^2.4.0"  # Google 搜索 API
duckduckgo-search = "^4.0.0"      # DuckDuckGo 搜索
```

**用途**: 为 Agent 提供网络搜索能力

### 2.2 文件处理
```toml
python-magic = "^0.4.27"       # 文件类型检测
chardet = "^5.2.0"             # 字符编码检测
```

**用途**: 安全的文件操作和类型检测

### 2.3 代码工具
```toml
black = "^23.0.0"              # 代码格式化
isort = "^5.12.0"              # 导入排序
pylint = "^3.0.0"              # 代码检查
mypy = "^1.7.0"                # 类型检查
ast-grep = "^0.15.0"           # AST 搜索
```

**用途**: 代码分析、格式化和检查工具

## 3. 日志和监控

### 3.1 日志系统
```toml
structlog = "^23.2.0"          # 结构化日志
python-json-logger = "^2.0.7"  # JSON 日志格式
```

**用途**: 提供结构化、易于分析的日志

### 3.2 性能监控
```toml
prometheus-client = "^0.19.0"  # Prometheus 指标
psutil = "^5.9.0"              # 系统资源监控
```

**用途**: 性能指标收集和监控

## 4. 存储和缓存

### 4.1 缓存
```toml
redis = "^5.0.0"               # Redis 客户端
diskcache = "^5.6.0"           # 磁盘缓存
```

**用途**: 缓存 LLM 响应和中间结果

### 4.2 数据库 (可选)
```toml
sqlalchemy = "^2.0.0"          # ORM
alembic = "^1.13.0"            # 数据库迁移
```

**用途**: 持久化存储 Agent 状态和历史

## 5. 配置和环境

### 5.1 配置管理
```toml
python-dotenv = "^1.0.0"       # .env 文件支持
pyyaml = "^6.0.0"              # YAML 解析
toml = "^0.10.2"               # TOML 解析
```

**用途**: 多种配置文件格式支持

### 5.2 环境管理
```toml
python = "^3.8"                # Python 版本要求
```

## 6. 开发依赖

### 6.1 测试框架
```toml
pytest = "^7.4.0"              # 测试框架
pytest-asyncio = "^0.21.0"     # 异步测试支持
pytest-cov = "^4.1.0"          # 覆盖率报告
pytest-mock = "^3.12.0"        # Mock 支持
pytest-timeout = "^2.2.0"      # 测试超时控制
```

**用途**: 单元测试、集成测试和覆盖率分析

### 6.2 代码质量
```toml
black = "^23.0.0"              # 代码格式化
isort = "^5.12.0"              # 导入排序
pylint = "^3.0.0"              # 代码检查
mypy = "^1.7.0"                # 类型检查
flake8 = "^6.1.0"              # 代码风格检查
bandit = "^1.7.5"              # 安全检查
```

**用途**: 保持代码质量和一致性

### 6.3 Git Hooks
```toml
pre-commit = "^3.5.0"          # Git hooks 管理
```

**用途**: 提交前自动检查代码质量

### 6.4 文档生成
```toml
sphinx = "^7.2.0"              # 文档生成
sphinx-rtd-theme = "^2.0.0"    # ReadTheDocs 主题
sphinx-autodoc-typehints = "^1.25.0"  # 类型提示文档
myst-parser = "^2.0.0"         # Markdown 支持
```

**用途**: 自动生成 API 文档

## 7. 可选依赖

### 7.1 可视化
```toml
graphviz = "^0.20.0"           # 图可视化
matplotlib = "^3.8.0"          # 数据可视化
```

**用途**: 工作流可视化和调试

### 7.2 Web 界面 (未来)
```toml
fastapi = "^0.104.0"           # Web 框架
uvicorn = "^0.24.0"            # ASGI 服务器
websockets = "^12.0"           # WebSocket 支持
```

**用途**: 提供 Web API 和管理界面

### 7.3 云服务集成 (未来)
```toml
boto3 = "^1.34.0"              # AWS SDK
google-cloud-storage = "^2.14.0"  # GCS SDK
```

**用途**: 云存储和服务集成

## 8. 完整 pyproject.toml

```toml
[tool.poetry]
name = "wukong"
version = "0.1.0"
description = "基于 LangGraph 的智能体框架"
authors = ["Your Name <your.email@example.com>"]
readme = "README.md"
license = "MIT"
homepage = "https://github.com/yourusername/wukong"
repository = "https://github.com/yourusername/wukong"
keywords = ["ai", "agent", "langgraph", "llm"]
classifiers = [
    "Development Status :: 3 - Alpha",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.8",
    "Programming Language :: Python :: 3.9",
    "Programming Language :: Python :: 3.10",
    "Programming Language :: Python :: 3.11",
]

[tool.poetry.dependencies]
python = "^3.8"
# 核心依赖
langgraph = "^0.2.0"
langchain-core = "^0.3.0"
langchain-community = "^0.3.0"
langchain-openai = "^0.2.0"
langchain-anthropic = "^0.2.0"
pydantic = "^2.0.0"
pydantic-settings = "^2.0.0"
# 异步支持
aiohttp = "^3.9.0"
aiofiles = "^23.0.0"
# 工具
google-search-results = { version = "^2.4.0", optional = true }
duckduckgo-search = "^4.0.0"
python-magic = "^0.4.27"
chardet = "^5.2.0"
# 日志和监控
structlog = "^23.2.0"
python-json-logger = "^2.0.7"
prometheus-client = "^0.19.0"
psutil = "^5.9.0"
# 缓存
diskcache = "^5.6.0"
redis = { version = "^5.0.0", optional = true }
# 配置
python-dotenv = "^1.0.0"
pyyaml = "^6.0.0"
toml = "^0.10.2"

[tool.poetry.group.dev.dependencies]
# 测试
pytest = "^7.4.0"
pytest-asyncio = "^0.21.0"
pytest-cov = "^4.1.0"
pytest-mock = "^3.12.0"
pytest-timeout = "^2.2.0"
# 代码质量
black = "^23.0.0"
isort = "^5.12.0"
pylint = "^3.0.0"
mypy = "^1.7.0"
flake8 = "^6.1.0"
bandit = "^1.7.5"
pre-commit = "^3.5.0"
# 文档
sphinx = "^7.2.0"
sphinx-rtd-theme = "^2.0.0"
sphinx-autodoc-typehints = "^1.25.0"
myst-parser = "^2.0.0"

[tool.poetry.extras]
all = ["google-search-results", "redis"]
search = ["google-search-results"]
cache = ["redis"]

[tool.poetry.scripts]
wukong = "wukong.cli:main"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"

[tool.black]
line-length = 88
target-version = ['py38', 'py39', 'py310', 'py311']
include = '\.pyi?$'

[tool.isort]
profile = "black"
line_length = 88

[tool.mypy]
python_version = "3.8"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = "-v --cov=wukong --cov-report=html --cov-report=term"

[tool.coverage.run]
source = ["wukong"]
omit = ["*/tests/*", "*/examples/*"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
]
```

## 9. 依赖更新策略

### 9.1 定期更新
- 每月检查依赖更新
- 优先更新安全补丁
- 测试后再更新主版本

### 9.2 版本锁定
- 使用 poetry.lock 锁定版本
- CI/CD 使用锁定版本
- 开发环境可以使用最新版本

### 9.3 兼容性测试
- 在多个 Python 版本上测试
- 测试主要依赖的不同版本
- 使用 tox 进行多环境测试

## 10. 安装说明

### 10.1 基础安装
```bash
# 使用 pip
pip install wukong

# 使用 poetry
poetry add wukong
```

### 10.2 完整安装
```bash
# 安装所有可选依赖
pip install wukong[all]

# 或使用 poetry
poetry add wukong -E all
```

### 10.3 开发安装
```bash
# 克隆仓库
git clone https://github.com/yourusername/wukong.git
cd wukong

# 安装依赖
poetry install

# 安装 pre-commit hooks
poetry run pre-commit install
```

## 11. 依赖大小估算

- 核心依赖: ~200MB
- 开发依赖: ~100MB
- 可选依赖: ~50MB
- 总计: ~350MB

## 12. 许可证兼容性

所有依赖均使用以下兼容许可证:
- MIT
- Apache 2.0
- BSD
- Python Software Foundation License

确保与项目的 MIT 许可证兼容。
