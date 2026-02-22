"""
悟空智能体 Claude Agent SDK 客户端
"""

import asyncio
import logging
from typing import Optional, Callable, AsyncIterator, Dict, Any, List
from dataclasses import dataclass

from .config import WukongConfig

logger = logging.getLogger(__name__)


@dataclass
class Message:
    """消息结构"""
    role: str  # "user" or "assistant"
    content: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_results: Optional[List[Dict[str, Any]]] = None


class WukongClient:
    """Claude Agent SDK 客户端"""
    
    def __init__(self, config: Optional[WukongConfig] = None):
        """
        初始化客户端
        
        Args:
            config: 悟空配置，如果为 None 则使用默认配置
        """
        self.config = config or WukongConfig()
        self._client = None
        self._agent = None
        self._is_running = False
        self._message_callback: Optional[Callable[[str], None]] = None
        
    async def initialize(self) -> None:
        """初始化 Claude Agent SDK"""
        try:
            # 动态导入 anthropic 的 Agent SDK
            from anthropic import Anthropic
            from anthropic.types import MessageParam
            
            # 创建客户端
            self._client = Anthropic(
                api_key=self.config.api_key,
                base_url=self.config.base_url,
            )
            
            logger.info("WukongClient initialized successfully")
            
        except ImportError as e:
            logger.error(f"Failed to import anthropic SDK: {e}")
            raise RuntimeError("anthropic SDK not installed. Run: pip install anthropic")
        except Exception as e:
            logger.error(f"Failed to initialize WukongClient: {e}")
            raise
            
    def set_message_callback(self, callback: Callable[[str], None]) -> None:
        """设置消息回调函数"""
        self._message_callback = callback
        
    async def send_message(
        self, 
        message: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        发送消息并获取回复
        
        Args:
            message: 用户消息
            system_prompt: 系统提示词（可选）
            max_tokens: 最大 token 数（可选）
            
        Returns:
            AI 回复内容
        """
        if not self._client:
            await self.initialize()
            
        # 使用配置或默认值
        system = system_prompt or self.config.system_prompt
        max_tokens = max_tokens or self.config.max_tokens
        
        try:
            response = self._client.messages.create(
                model=self.config.model,
                max_tokens=max_tokens,
                system=system,
                messages=[
                    {"role": "user", "content": message}
                ],
                tools=self._get_tool_schemas() if self.config.allowed_tools else None,
                stream=self.config.stream,
            )
            
            if self.config.stream:
                # 处理流式响应
                full_content = ""
                async for chunk in self._stream_response(response):
                    full_content += chunk
                    if self._message_callback:
                        self._message_callback(chunk)
                return full_content
            else:
                # 处理非流式响应
                content = response.content[0].text
                if self._message_callback:
                    self._message_callback(content)
                return content
                
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            raise
            
    async def _stream_response(self, response) -> AsyncIterator[str]:
        """处理流式响应"""
        try:
            for event in response:
                if event.type == "content_block_delta":
                    if hasattr(event.delta, "text"):
                        yield event.delta.text
        except Exception as e:
            logger.error(f"Error streaming response: {e}")
            raise
            
    def _get_tool_schemas(self) -> List[Dict[str, Any]]:
        """获取工具 schemas"""
        # 这里定义可用的工具 schema
        # 实际使用时可以根据 allowed_tools 动态生成
        tools = []
        
        if "read" in self.config.allowed_tools:
            tools.append({
                "name": "read",
                "description": "读取文件内容",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "file_path": {"type": "string", "description": "文件路径"}
                    },
                    "required": ["file_path"]
                }
            })
            
        if "write" in self.config.allowed_tools:
            tools.append({
                "name": "write",
                "description": "写入文件内容",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "content": {"type": "string", "description": "文件内容"},
                        "file_path": {"type": "string", "description": "文件路径"}
                    },
                    "required": ["content", "file_path"]
                }
            })
            
        # 可以继续添加其他工具...
        return tools
        
    async def close(self) -> None:
        """关闭客户端"""
        self._client = None
        self._is_running = False
        logger.info("WukongClient closed")
        
    @property
    def is_initialized(self) -> bool:
        """检查是否已初始化"""
        return self._client is not None
        
    @property
    def is_running(self) -> bool:
        """检查是否正在运行"""
        return self._is_running
