"""
悟空智能体工具注册模块
"""

import logging
from typing import Dict, Any, Callable, List, Optional
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class ToolPermission(Enum):
    """工具权限级别"""
    DENY = "deny"          # 拒绝
    AUTO = "auto"          # 自动批准
    MANUAL = "manual"      # 手动批准
    BETA = "beta"          # 测试中


@dataclass
class ToolDefinition:
    """工具定义"""
    name: str
    description: str
    input_schema: Dict[str, Any]
    handler: Optional[Callable] = None
    permission: ToolPermission = ToolPermission.AUTO
    category: str = "general"


class ToolRegistry:
    """工具注册表"""
    
    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}
        self._permission_mode: str = "auto"
        
    def register(self, tool: ToolDefinition) -> None:
        """
        注册工具
        
        Args:
            tool: 工具定义
        """
        self._tools[tool.name] = tool
        logger.info(f"Registered tool: {tool.name}")
        
    def unregister(self, name: str) -> bool:
        """
        注销工具
        
        Args:
            name: 工具名称
            
        Returns:
            是否成功注销
        """
        if name in self._tools:
            del self._tools[name]
            logger.info(f"Unregistered tool: {name}")
            return True
        return False
        
    def get_tool(self, name: str) -> Optional[ToolDefinition]:
        """获取工具定义"""
        return self._tools.get(name)
        
    def list_tools(self) -> List[str]:
        """列出所有工具名称"""
        return list(self._tools.keys())
        
    def set_permission_mode(self, mode: str) -> None:
        """设置权限模式"""
        self._permission_mode = mode
        logger.info(f"Permission mode set to: {mode}")
        
    def check_permission(self, tool_name: str) -> ToolPermission:
        """
        检查工具权限
        
        Args:
            tool_name: 工具名称
            
        Returns:
            权限级别
        """
        tool = self._tools.get(tool_name)
        if not tool:
            return ToolPermission.DENY
            
        if self._permission_mode == "deny":
            return ToolPermission.DENY
        elif self._permission_mode == "manual":
            return ToolPermission.MANUAL
            
        return tool.permission
        
    def get_allowed_tools(self) -> List[str]:
        """获取允许使用的工具列表"""
        return [
            name for name, tool in self._tools.items()
            if self.check_permission(name) != ToolPermission.DENY
        ]
        
    def execute_tool(self, name: str, **kwargs) -> Any:
        """
        执行工具
        
        Args:
            name: 工具名称
            **kwargs: 工具参数
            
        Returns:
            工具执行结果
        """
        tool = self._tools.get(name)
        if not tool:
            raise ValueError(f"Tool not found: {name}")
            
        permission = self.check_permission(name)
        if permission == ToolPermission.DENY:
            raise PermissionError(f"Tool {name} is not allowed")
            
        if not tool.handler:
            raise RuntimeError(f"Tool {name} has no handler")
            
        logger.info(f"Executing tool: {name}")
        return tool.handler(**kwargs)


# 全局工具注册表实例
_global_registry = ToolRegistry()


def get_registry() -> ToolRegistry:
    """获取全局工具注册表"""
    return _global_registry


def register_tool(
    name: str,
    description: str,
    input_schema: Dict[str, Any],
    handler: Optional[Callable] = None,
    permission: ToolPermission = ToolPermission.AUTO,
    category: str = "general",
) -> None:
    """
    便捷工具注册函数
    
    Args:
        name: 工具名称
        description: 工具描述
        input_schema: 输入 schema
        handler: 处理函数
        permission: 权限级别
        category: 分类
    """
    tool = ToolDefinition(
        name=name,
        description=description,
        input_schema=input_schema,
        handler=handler,
        permission=permission,
        category=category,
    )
    _global_registry.register(tool)


# 内置工具注册
def register_builtin_tools():
    """注册内置工具"""
    
    # 文件读取工具
    register_tool(
        name="read",
        description="读取文件内容",
        input_schema={
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "文件路径"},
                "limit": {"type": "integer", "description": "限制行数"},
                "offset": {"type": "integer", "description": "起始行号"},
            },
            "required": ["file_path"],
        },
        category="filesystem",
    )
    
    # 文件写入工具
    register_tool(
        name="write",
        description="写入文件内容",
        input_schema={
            "type": "object",
            "properties": {
                "content": {"type": "string", "description": "文件内容"},
                "file_path": {"type": "string", "description": "文件路径"},
            },
            "required": ["content", "file_path"],
        },
        category="filesystem",
    )
    
    # 命令执行工具
    register_tool(
        name="exec",
        description="执行 Shell 命令",
        input_schema={
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "要执行的命令"},
                "timeout": {"type": "integer", "description": "超时时间(秒)"},
            },
            "required": ["command"],
        },
        permission=ToolPermission.MANUAL,
        category="system",
    )
    
    # 浏览器工具
    register_tool(
        name="browser",
        description="控制浏览器",
        input_schema={
            "type": "object",
            "properties": {
                "action": {"type": "string", "description": "操作类型"},
                "url": {"type": "string", "description": "URL"},
            },
            "required": ["action"],
        },
        category="browser",
    )
    
    # Web 搜索工具
    register_tool(
        name="web_search",
        description="搜索网页",
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "搜索关键词"},
                "count": {"type": "integer", "description": "结果数量"},
            },
            "required": ["query"],
        },
        category="web",
    )
    
    # Web 获取工具
    register_tool(
        name="web_fetch",
        description="获取网页内容",
        input_schema={
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "网页 URL"},
                "max_chars": {"type": "integer", "description": "最大字符数"},
            },
            "required": ["url"],
        },
        category="web",
    )
    
    logger.info("Built-in tools registered")


# 初始化时注册内置工具
register_builtin_tools()
