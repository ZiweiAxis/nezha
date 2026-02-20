"""
悟空智能体工具注册模块
支持自定义工具、权限控制和獬豸策略集成
"""

import logging
import os
import subprocess
from typing import Dict, Any, Callable, List, Optional, Set
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path

logger = logging.getLogger(__name__)


class ToolPermission(Enum):
    """工具权限级别"""
    DENY = "deny"          # 拒绝
    AUTO = "auto"          # 自动批准
    MANUAL = "manual"      # 手动审批
    BETA = "beta"          # 测试中


class PermissionMode(Enum):
    """全局权限模式"""
    AUTO = "auto"          # 自动模式 - 基于工具自身权限
    DENY_ALL = "deny_all"  # 拒绝所有
    MANUAL_ALL = "manual_all"  # 全部需要审批


@dataclass
class ToolDefinition:
    """工具定义"""
    name: str
    description: str
    input_schema: Dict[str, Any]
    handler: Optional[Callable] = None
    permission: ToolPermission = ToolPermission.AUTO
    category: str = "general"
    # 高级选项
    requires_approval: bool = False  # 是否需要额外审批
    sandboxed: bool = False  # 是否需要沙箱执行
    allowed_paths: List[str] = field(default_factory=list)  # 允许的操作路径
    blocked_paths: List[str] = field(default_factory=list)  # 禁止的路径
    timeout: int = 30  # 超时秒数
    tags: Set[str] = field(default_factory=set)  # 标签


@dataclass
class ToolExecutionRequest:
    """工具执行请求"""
    tool_name: str
    arguments: Dict[str, Any]
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    trace_id: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ToolExecutionResult:
    """工具执行结果"""
    success: bool
    result: Any = None
    error: str = ""
    trace_id: str = ""
    cheq_id: str = ""  # 审批 ID
    decision: str = ""  # 决策结果


class PolicyIntegration:
    """獬豸策略集成"""
    
    def __init__(self, xiezhi_url: str = "http://localhost:8080"):
        self.xiezhi_url = xiezhi_url
        self.enabled = False
        self._client = None
        
    def enable(self) -> None:
        """启用策略集成"""
        try:
            import requests
            self._client = requests
            self.enabled = True
            logger.info(f"Policy integration enabled: {self.xiezhi_url}")
        except ImportError:
            logger.warning("requests library not available, policy integration disabled")
            
    def disable(self) -> None:
        """禁用策略集成"""
        self.enabled = False
        self._client = None
        
    def is_enabled(self) -> bool:
        """检查是否启用"""
        return self.enabled
        
    def evaluate(self, request: ToolExecutionRequest) -> ToolExecutionResult:
        """
        请求策略评估
        
        Args:
            request: 工具执行请求
            
        Returns:
            执行结果
        """
        if not self.enabled or not self._client:
            # 未启用策略，返回自动批准
            return ToolExecutionResult(
                success=True,
                decision="auto",
                trace_id=request.trace_id or ""
            )
            
        try:
            # 构建策略请求
            tool_name = request.tool_name
            args = request.arguments
            
            # 提取命令参数
            command = args.get("command", "")
            file_path = args.get("file_path", "")
            url = args.get("url", "")
            
            auth_request = {
                "subject": request.user_id or "anonymous",
                "action": tool_name,
                "resource": command or file_path or url or tool_name,
                "context": request.context,
                "command": command,
                "working_dir": args.get("workdir", os.getcwd()),
                "trace_id": request.trace_id or "",
            }
            
            # 发送评估请求
            resp = self._client.post(
                f"{self.xiezhi_url}/api/v1/auth/exec",
                json=auth_request,
                timeout=10
            )
            
            if resp.status_code == 200:
                data = resp.json()
                decision = data.get("decision", "deny")
                
                result = ToolExecutionResult(
                    success=decision in ("allow", "auto"),
                    decision=decision,
                    trace_id=data.get("trace_id", ""),
                    cheq_id=data.get("cheq_id", ""),
                    error=data.get("reason", "")
                )
                
                # 如果需要审批，更新状态
                if decision == "pending":
                    result.success = False
                    result.error = "Requires manual approval"
                    
                return result
            else:
                return ToolExecutionResult(
                    success=False,
                    error=f"Policy evaluation failed: {resp.status_code}",
                    decision="deny"
                )
                
        except Exception as e:
            logger.error(f"Policy evaluation error: {e}")
            # 策略评估失败时拒绝执行
            return ToolExecutionResult(
                success=False,
                error=f"Policy evaluation error: {str(e)}",
                decision="deny"
            )
            
    async def evaluate_async(self, request: ToolExecutionRequest) -> ToolExecutionResult:
        """异步评估（兼容 asyncio）"""
        return self.evaluate(request)


class ToolRegistry:
    """工具注册表"""
    
    def __init__(self, xiezhi_url: str = "http://localhost:8080"):
        self._tools: Dict[str, ToolDefinition] = {}
        self._permission_mode: PermissionMode = PermissionMode.AUTO
        self._policy = PolicyIntegration(xiezhi_url)
        self._handlers: Dict[str, Callable] = {}  # 工具处理器映射
        
    @property
    def policy(self) -> PolicyIntegration:
        """获取策略集成实例"""
        return self._policy
        
    def enable_policy(self) -> None:
        """启用獬豸策略集成"""
        self._policy.enable()
        
    def disable_policy(self) -> None:
        """禁用獬豸策略集成"""
        self._policy.disable()
        
    def register(self, tool: ToolDefinition) -> None:
        """
        注册工具
        
        Args:
            tool: 工具定义
        """
        self._tools[tool.name] = tool
        if tool.handler:
            self._handlers[tool.name] = tool.handler
        logger.info(f"Registered tool: {tool.name} (permission: {tool.permission.value})")
        
    def register_handler(self, name: str, handler: Callable) -> None:
        """
        动态注册工具处理器
        
        Args:
            name: 工具名称
            handler: 处理函数
        """
        if name in self._tools:
            self._tools[name].handler = handler
            self._handlers[name] = handler
            logger.info(f"Registered handler for tool: {name}")
        else:
            # 自动创建工具定义
            tool = ToolDefinition(
                name=name,
                description=f"Dynamically registered tool: {name}",
                input_schema={"type": "object", "properties": {}},
                handler=handler,
            )
            self.register(tool)
            
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
            if name in self._handlers:
                del self._handlers[name]
            logger.info(f"Unregistered tool: {name}")
            return True
        return False
        
    def get_tool(self, name: str) -> Optional[ToolDefinition]:
        """获取工具定义"""
        return self._tools.get(name)
        
    def list_tools(self, category: Optional[str] = None) -> List[str]:
        """列出工具"""
        if category:
            return [
                name for name, tool in self._tools.items()
                if tool.category == category
            ]
        return list(self._tools.keys())
        
    def list_categories(self) -> List[str]:
        """列出所有分类"""
        return list(set(tool.category for tool in self._tools.values()))
        
    def set_permission_mode(self, mode: str) -> None:
        """设置权限模式"""
        try:
            self._permission_mode = PermissionMode(mode)
            logger.info(f"Permission mode set to: {mode}")
        except ValueError:
            logger.warning(f"Invalid permission mode: {mode}")
            
    def get_permission_mode(self) -> PermissionMode:
        """获取权限模式"""
        return self._permission_mode
        
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
            
        # 全局模式优先
        if self._permission_mode == PermissionMode.DENY_ALL:
            return ToolPermission.DENY
        elif self._permission_mode == PermissionMode.MANUAL_ALL:
            return ToolPermission.MANUAL
            
        return tool.permission
        
    def get_allowed_tools(self) -> List[str]:
        """获取允许使用的工具列表"""
        return [
            name for name, tool in self._tools.items()
            if self.check_permission(name) != ToolPermission.DENY
        ]
        
    def get_tools_by_permission(self, permission: ToolPermission) -> List[str]:
        """按权限筛选工具"""
        return [
            name for name in self._tools
            if self.check_permission(name) == permission
        ]
        
    async def execute(self, request: ToolExecutionRequest) -> ToolExecutionResult:
        """
        执行工具（带策略评估）
        
        Args:
            request: 工具执行请求
            
        Returns:
            执行结果
        """
        tool = self._tools.get(request.tool_name)
        if not tool:
            return ToolExecutionResult(
                success=False,
                error=f"Tool not found: {request.tool_name}",
                decision="deny"
            )
            
        # 检查本地权限
        permission = self.check_permission(request.tool_name)
        if permission == ToolPermission.DENY:
            return ToolExecutionResult(
                success=False,
                error=f"Tool {request.tool_name} is denied",
                decision="deny"
            )
            
        # 如果需要策略评估
        if permission == ToolPermission.MANUAL or self._policy.is_enabled():
            policy_result = self._policy.evaluate(request)
            if not policy_result.success:
                return policy_result
                
        # 执行工具
        if not tool.handler:
            return ToolExecutionResult(
                success=False,
                error=f"Tool {request.tool_name} has no handler",
                decision="deny"
            )
            
        try:
            # 检查路径限制
            if tool.allowed_paths or tool.blocked_paths:
                args = request.arguments
                for path_key in ["file_path", "path", "directory"]:
                    if path_key in args:
                        path = str(args[path_key])
                        if tool.blocked_paths and any(path.startswith(bp) for bp in tool.blocked_paths):
                            return ToolExecutionResult(
                                success=False,
                                error=f"Path blocked: {path}",
                                decision="deny"
                            )
                        if tool.allowed_paths and not any(path.startswith(ap) for ap in tool.allowed_paths):
                            return ToolExecutionResult(
                                success=False,
                                error=f"Path not allowed: {path}",
                                decision="deny"
                            )
            
            # 执行处理函数
            logger.info(f"Executing tool: {request.tool_name}")
            result = tool.handler(**request.arguments)
            
            return ToolExecutionResult(
                success=True,
                result=result,
                decision="allow",
                trace_id=request.trace_id or ""
            )
            
        except Exception as e:
            logger.error(f"Tool execution error: {e}")
            return ToolExecutionResult(
                success=False,
                error=str(e),
                decision="deny"
            )
            
    def execute_tool(self, name: str, **kwargs) -> Any:
        """
        执行工具（简化版本，不带策略评估）
        
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
_global_registry: Optional[ToolRegistry] = None


def get_registry() -> ToolRegistry:
    """获取全局工具注册表"""
    global _global_registry
    if _global_registry is None:
        _global_registry = ToolRegistry()
        register_builtin_tools()
    return _global_registry


def init_registry(xiezhi_url: str = "http://localhost:8080") -> ToolRegistry:
    """初始化工具注册表"""
    global _global_registry
    _global_registry = ToolRegistry(xiezhi_url)
    register_builtin_tools()
    return _global_registry


def register_tool(
    name: str,
    description: str,
    input_schema: Dict[str, Any],
    handler: Optional[Callable] = None,
    permission: ToolPermission = ToolPermission.AUTO,
    category: str = "general",
    **kwargs
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
        **kwargs: 其他参数
    """
    tool = ToolDefinition(
        name=name,
        description=description,
        input_schema=input_schema,
        handler=handler,
        permission=permission,
        category=category,
        **kwargs
    )
    get_registry().register(tool)


def register_handler(name: str, handler: Callable) -> None:
    """动态注册处理器"""
    get_registry().register_handler(name, handler)


# ==================== 工具实现 ====================

def _read_file_handler(file_path: str, limit: int = None, offset: int = None, **kwargs) -> str:
    """文件读取处理函数"""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    if offset:
        lines = lines[offset-1:]
    if limit:
        lines = lines[:limit]
    
    return ''.join(lines)


def _write_file_handler(content: str, file_path: str, **kwargs) -> str:
    """文件写入处理函数"""
    path = Path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return f"File written: {file_path}"


def _exec_command_handler(command: str, timeout: int = 30, workdir: str = None, **kwargs) -> str:
    """命令执行处理函数"""
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=workdir
        )
        
        output = []
        if result.stdout:
            output.append(result.stdout)
        if result.stderr:
            output.append(f"[stderr] {result.stderr}")
            
        if result.returncode != 0:
            return f"[exit {result.returncode}]\n" + "\n".join(output)
            
        return "\n".join(output) if output else "[success]"
        
    except subprocess.TimeoutExpired:
        return f"[timeout] Command timed out after {timeout}s"
    except Exception as e:
        return f"[error] {str(e)}"


def _list_directory_handler(path: str = ".", **kwargs) -> List[str]:
    """目录列表处理函数"""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Directory not found: {path}")
    if not p.is_dir():
        raise ValueError(f"Not a directory: {path}")
    
    return [str(item) for item in p.iterdir()]


def _create_directory_handler(path: str, **kwargs) -> str:
    """创建目录处理函数"""
    p = Path(path)
    p.mkdir(parents=True, exist_ok=True)
    return f"Directory created: {path}"


def _delete_handler(path: str, **kwargs) -> str:
    """删除文件/目录处理函数"""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Path not found: {path}")
    
    if p.is_dir():
        import shutil
        shutil.rmtree(p)
        return f"Directory deleted: {path}"
    else:
        p.unlink()
        return f"File deleted: {path}"


def _exists_handler(path: str, **kwargs) -> bool:
    """检查路径是否存在"""
    return Path(path).exists()


def _copy_handler(src: str, dst: str, **kwargs) -> str:
    """复制文件/目录处理函数"""
    import shutil
    src_path = Path(src)
    if not src_path.exists():
        raise FileNotFoundError(f"Source not found: {src}")
    
    if src_path.is_dir():
        shutil.copytree(src, dst)
        return f"Directory copied: {src} -> {dst}"
    else:
        shutil.copy2(src, dst)
        return f"File copied: {src} -> {dst}"


def _move_handler(src: str, dst: str, **kwargs) -> str:
    """移动文件/目录处理函数"""
    import shutil
    src_path = Path(src)
    if not src_path.exists():
        raise FileNotFoundError(f"Source not found: {src}")
    
    shutil.move(src, dst)
    return f"Moved: {src} -> {dst}"


def _file_info_handler(path: str, **kwargs) -> Dict[str, Any]:
    """获取文件信息"""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Path not found: {path}")
    
    stat = p.stat()
    return {
        "path": str(p.absolute()),
        "name": p.name,
        "size": stat.st_size,
        "is_file": p.is_file(),
        "is_dir": p.is_dir(),
        "modified": stat.st_mtime,
        "created": stat.st_ctime,
    }


def _network_ping_handler(host: str, count: int = 4, **kwargs) -> str:
    """Ping 命令处理函数"""
    import shutil
    ping = shutil.which("ping")
    if not ping:
        return "[error] ping command not available"
    
    result = subprocess.run(
        [ping, "-c", str(count), host],
        capture_output=True,
        text=True,
        timeout=count * 5
    )
    return result.stdout or result.stderr


def _network_curl_handler(url: str, method: str = "GET", headers: Dict[str, str] = None, 
                         data: str = None, **kwargs) -> str:
    """Curl 命令处理函数"""
    import shutil
    curl = shutil.which("curl")
    if not curl:
        return "[error] curl command not available"
    
    cmd = [curl, "-s", "-X", method, url]
    if headers:
        for k, v in headers.items():
            cmd.extend(["-H", f"{k}: {v}"])
    if data:
        cmd.extend(["-d", data])
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    return result.stdout or result.stderr


def _http_request_handler(url: str, method: str = "GET", **kwargs) -> Dict[str, Any]:
    """HTTP 请求处理函数"""
    try:
        import requests
        resp = requests.request(method, url, timeout=30, **kwargs)
        return {
            "status_code": resp.status_code,
            "headers": dict(resp.headers),
            "text": resp.text[:5000],  # 限制返回长度
        }
    except ImportError:
        return {"error": "requests library not available"}


# ==================== 内置工具注册 ====================

def register_builtin_tools():
    """注册内置工具"""
    registry = get_registry()
    
    # ==================== 文件系统工具 ====================
    
    # 文件读取
    registry.register(ToolDefinition(
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
        handler=_read_file_handler,
        category="filesystem",
        permission=ToolPermission.AUTO,
        allowed_paths=["/home", "/workspace", "/tmp"],
    ))
    
    # 文件写入
    registry.register(ToolDefinition(
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
        handler=_write_file_handler,
        category="filesystem",
        permission=ToolPermission.AUTO,
        allowed_paths=["/home", "/workspace", "/tmp"],
    ))
    
    # 目录列表
    registry.register(ToolDefinition(
        name="list_dir",
        description="列出目录内容",
        input_schema={
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "目录路径", "default": "."},
            },
        },
        handler=_list_directory_handler,
        category="filesystem",
        permission=ToolPermission.AUTO,
    ))
    
    # 创建目录
    registry.register(ToolDefinition(
        name="mkdir",
        description="创建目录",
        input_schema={
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "目录路径"},
            },
            "required": ["path"],
        },
        handler=_create_directory_handler,
        category="filesystem",
        permission=ToolPermission.AUTO,
    ))
    
    # 删除文件/目录
    registry.register(ToolDefinition(
        name="delete",
        description="删除文件或目录",
        input_schema={
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "路径"},
            },
            "required": ["path"],
        },
        handler=_delete_handler,
        category="filesystem",
        permission=ToolPermission.MANUAL,
        blocked_paths=["/etc", "/usr", "/bin", "/sbin", "/boot", "/sys"],
    ))
    
    # 路径存在检查
    registry.register(ToolDefinition(
        name="exists",
        description="检查路径是否存在",
        input_schema={
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "路径"},
            },
            "required": ["path"],
        },
        handler=_exists_handler,
        category="filesystem",
        permission=ToolPermission.AUTO,
    ))
    
    # 复制文件/目录
    registry.register(ToolDefinition(
        name="copy",
        description="复制文件或目录",
        input_schema={
            "type": "object",
            "properties": {
                "src": {"type": "string", "description": "源路径"},
                "dst": {"type": "string", "description": "目标路径"},
            },
            "required": ["src", "dst"],
        },
        handler=_copy_handler,
        category="filesystem",
        permission=ToolPermission.MANUAL,
    ))
    
    # 移动文件/目录
    registry.register(ToolDefinition(
        name="move",
        description="移动文件或目录",
        input_schema={
            "type": "object",
            "properties": {
                "src": {"type": "string", "description": "源路径"},
                "dst": {"type": "string", "description": "目标路径"},
            },
            "required": ["src", "dst"],
        },
        handler=_move_handler,
        category="filesystem",
        permission=ToolPermission.MANUAL,
    ))
    
    # 文件信息
    registry.register(ToolDefinition(
        name="file_info",
        description="获取文件/目录信息",
        input_schema={
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "路径"},
            },
            "required": ["path"],
        },
        handler=_file_info_handler,
        category="filesystem",
        permission=ToolPermission.AUTO,
    ))
    
    # ==================== 系统工具 ====================
    
    # 命令执行
    registry.register(ToolDefinition(
        name="exec",
        description="执行 Shell 命令",
        input_schema={
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "要执行的命令"},
                "timeout": {"type": "integer", "description": "超时时间(秒)", "default": 30},
                "workdir": {"type": "string", "description": "工作目录"},
            },
            "required": ["command"],
        },
        handler=_exec_command_handler,
        category="system",
        permission=ToolPermission.MANUAL,
        timeout=60,
    ))
    
    # ==================== 网络工具 ====================
    
    # Ping
    registry.register(ToolDefinition(
        name="ping",
        description="Ping 主机",
        input_schema={
            "type": "object",
            "properties": {
                "host": {"type": "string", "description": "主机地址"},
                "count": {"type": "integer", "description": "次数", "default": 4},
            },
            "required": ["host"],
        },
        handler=_network_ping_handler,
        category="network",
        permission=ToolPermission.AUTO,
    ))
    
    # Curl
    registry.register(ToolDefinition(
        name="curl",
        description="使用 curl 请求",
        input_schema={
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "URL"},
                "method": {"type": "string", "description": "方法", "default": "GET"},
                "headers": {"type": "object", "description": "请求头"},
                "data": {"type": "string", "description": "请求体"},
            },
            "required": ["url"],
        },
        handler=_network_curl_handler,
        category="network",
        permission=ToolPermission.AUTO,
    ))
    
    # HTTP 请求
    registry.register(ToolDefinition(
        name="http_request",
        description="HTTP 请求",
        input_schema={
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "URL"},
                "method": {"type": "string", "description": "方法", "default": "GET"},
            },
            "required": ["url"],
        },
        handler=_http_request_handler,
        category="network",
        permission=ToolPermission.AUTO,
    ))
    
    # ==================== 浏览器工具 ====================
    
    # 浏览器控制（预留接口）
    registry.register(ToolDefinition(
        name="browser",
        description="控制浏览器（需配置浏览器服务）",
        input_schema={
            "type": "object",
            "properties": {
                "action": {"type": "string", "description": "操作类型: snapshot/navigate/click/type"},
                "url": {"type": "string", "description": "URL"},
                "selector": {"type": "string", "description": "CSS 选择器"},
                "text": {"type": "string", "description": "输入文本"},
            },
            "required": ["action"],
        },
        category="browser",
        permission=ToolPermission.MANUAL,
    ))
    
    # ==================== Web 工具 ====================
    
    # Web 搜索（预留接口）
    registry.register(ToolDefinition(
        name="web_search",
        description="搜索网页（需配置搜索服务）",
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "搜索关键词"},
                "count": {"type": "integer", "description": "结果数量", "default": 5},
            },
            "required": ["query"],
        },
        category="web",
        permission=ToolPermission.AUTO,
    ))
    
    # Web 获取（预留接口）
    registry.register(ToolDefinition(
        name="web_fetch",
        description="获取网页内容（需配置）",
        input_schema={
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "网页 URL"},
                "max_chars": {"type": "integer", "description": "最大字符数", "default": 10000},
            },
            "required": ["url"],
        },
        category="web",
        permission=ToolPermission.AUTO,
    ))
    
    logger.info(f"Registered {len(registry.list_tools())} built-in tools")


# 初始化
def _ensure_registry():
    """确保注册表已初始化"""
    global _global_registry
    if _global_registry is None:
        _global_registry = ToolRegistry()
        register_builtin_tools()

# 初始化注册
_ensure_registry()
