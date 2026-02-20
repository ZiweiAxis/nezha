"""
悟空智能体模块

提供统一的 Claude Agent 服务封装。
"""

from .config import WukongConfig, default_config, load_config
from .client import WukongClient, Message
from .agent import WukongAgent, WukongAgentFactory, AgentState, ConversationMessage
from .tools import (
    ToolRegistry,
    ToolDefinition,
    ToolPermission,
    get_registry,
    register_tool,
    register_builtin_tools,
)

__version__ = "0.1.0"

__all__ = [
    # 配置
    "WukongConfig",
    "default_config",
    "load_config",
    
    # 客户端
    "WukongClient",
    "Message",
    
    # Agent
    "WukongAgent",
    "WukongAgentFactory",
    "AgentState",
    "ConversationMessage",
    
    # 工具
    "ToolRegistry",
    "ToolDefinition",
    "ToolPermission",
    "get_registry",
    "register_tool",
    "register_builtin_tools",
]
