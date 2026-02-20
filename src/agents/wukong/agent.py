"""
悟空智能体服务封装模块

S015: 消息通道集成
- 消息接收：从天枢接收消息
- 消息发送：发送消息到天枢
- 流式输出：实时推送 Agent 输出
"""

import asyncio
import logging
from typing import Optional, Callable, Dict, Any, List, AsyncIterator
from dataclasses import dataclass, field
from enum import Enum

from .client import WukongClient
from .config import WukongConfig
from .tools import ToolRegistry, get_registry
from .message_channel import (
    MessageChannel, 
    TianshuMessage, 
    MessageType,
    MessageSource,
)

logger = logging.getLogger(__name__)


class AgentState(Enum):
    """Agent 状态"""
    IDLE = "idle"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    ERROR = "error"


@dataclass
class ConversationMessage:
    """对话消息"""
    role: str  # "user" or "assistant"
    content: str
    timestamp: float = field(default_factory=lambda: asyncio.get_event_loop().time())
    metadata: Dict[str, Any] = field(default_factory=dict)


class WukongAgent:
    """
    悟空智能体服务封装
    
    提供统一的 Agent 服务接口，支持启动、停止、消息发送等功能。
    S015: 集成消息通道，支持与天枢的消息互通。
    """
    
    def __init__(
        self,
        config: Optional[WukongConfig] = None,
        message_callback: Optional[Callable[[str], None]] = None,
        tianshu_callback: Optional[Callable[[TianshuMessage], None]] = None,
    ):
        """
        初始化悟空 Agent
        
        Args:
            config: 悟空配置
            message_callback: 消息回调函数（接收消息内容）
            tianshu_callback: 天枢消息回调（接收完整的 TianshuMessage）
        """
        self.config = config or WukongConfig()
        self._client = WukongClient(self.config)
        self._state = AgentState.IDLE
        self._message_callback = message_callback
        self._tianshu_callback = tianshu_callback
        self._conversation_history: List[ConversationMessage] = []
        self._tool_registry = get_registry()
        
        # 消息通道（S015 新增）
        self._message_channel: Optional[MessageChannel] = None
        if self.config.enable_message_channel:
            self._message_channel = MessageChannel(self.config)
        
    async def start(self) -> bool:
        """
        启动 Agent
        
        Returns:
            是否启动成功
        """
        if self._state == AgentState.RUNNING:
            logger.warning("Agent is already running")
            return True
            
        try:
            self._state = AgentState.STARTING
            logger.info("Starting Wukong Agent...")
            
            # 初始化客户端
            await self._client.initialize()
            
            # 设置消息回调
            if self._message_callback:
                self._client.set_message_callback(self._message_callback)
            
            # S015: 初始化消息通道
            if self._message_channel:
                await self._message_channel.initialize(
                    taibai_url=self.config.taibai_url,
                    taibai_token=self.config.tianshu_token,
                )
                # 设置天枢消息回调
                if self._tianshu_callback:
                    self._message_channel.set_message_callback(self._tianshu_callback)
                logger.info("MessageChannel initialized")
                
            self._state = AgentState.RUNNING
            logger.info("Wukong Agent started successfully")
            return True
            
        except Exception as e:
            self._state = AgentState.ERROR
            logger.error(f"Failed to start agent: {e}")
            raise
            
    async def stop(self) -> bool:
        """
        停止 Agent
        
        Returns:
            是否停止成功
        """
        if self._state == AgentState.IDLE:
            logger.warning("Agent is not running")
            return True
            
        try:
            self._state = AgentState.STOPPING
            logger.info("Stopping Wukong Agent...")
            
            # 关闭消息通道（S015）
            if self._message_channel:
                await self._message_channel.close()
                
            # 关闭客户端
            await self._client.close()
            
            self._state = AgentState.IDLE
            logger.info("Wukong Agent stopped successfully")
            return True
            
        except Exception as e:
            self._state = AgentState.ERROR
            logger.error(f"Failed to stop agent: {e}")
            raise
            
    async def send_message(
        self,
        message: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """
        发送消息
        
        Args:
            message: 用户消息
            system_prompt: 系统提示词（可选）
            
        Returns:
            AI 回复
        """
        if self._state != AgentState.RUNNING:
            raise RuntimeError("Agent is not running")
            
        # 添加到对话历史
        self._conversation_history.append(
            ConversationMessage(role="user", content=message)
        )
        
        try:
            # 发送消息
            response = await self._client.send_message(
                message=message,
                system_prompt=system_prompt,
            )
            
            # 添加回复到对话历史
            self._conversation_history.append(
                ConversationMessage(role="assistant", content=response)
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            raise
            
    def on_message(self, callback: Callable[[str], None]) -> None:
        """
        设置消息回调
        
        Args:
            callback: 回调函数，接收消息内容
        """
        self._message_callback = callback
        if self._client.is_initialized:
            self._client.set_message_callback(callback)
            
    def on_tianshu_message(self, callback: Callable[[TianshuMessage], None]) -> None:
        """
        设置天枢消息回调（S015）
        
        Args:
            callback: 回调函数，接收 TianshuMessage
        """
        self._tianshu_callback = callback
        if self._message_channel and self._message_channel.is_initialized:
            self._message_channel.set_message_callback(callback)
            
    # ==================== S015: 消息通道方法 ====================
    
    async def handle_tianshu_message(self, raw_message: Dict[str, Any]) -> None:
        """
        处理收到的天枢消息（S015）
        
        Args:
            raw_message: 原始天枢消息 (Matrix event)
        """
        if not self._message_channel:
            logger.warning("MessageChannel not initialized")
            return
            
        await self._message_channel.handle_tianshu_message(raw_message)
        
    async def send_to_tianshu(
        self,
        room_id: str,
        content: str,
        message_type: MessageType = MessageType.TEXT,
    ) -> Optional[str]:
        """
        发送消息到天枢（S015）
        
        Args:
            room_id: 目标房间 ID
            content: 消息内容
            message_type: 消息类型
            
        Returns:
            发送的消息 ID，失败返回 None
        """
        if not self._message_channel:
            logger.warning("MessageChannel not initialized")
            return None
            
        return await self._message_channel.send_message(
            room_id=room_id,
            content=content,
            message_type=message_type,
        )
        
    async def send_streaming(
        self,
        room_id: str,
        content: str,
    ) -> str:
        """
        发送流式消息（S015）
        
        实时推送 Agent 输出到天枢
        
        Args:
            room_id: 目标房间 ID
            content: 消息内容
            
        Returns:
            完整消息内容
        """
        if not self._message_channel:
            logger.warning("MessageChannel not initialized")
            return content
            
        return await self._message_channel.send_streaming_message(
            room_id=room_id,
            content=content,
        )
        
    async def process_tianshu_message(
        self,
        raw_message: Dict[str, Any],
    ) -> str:
        """
        处理收到的天枢消息并返回回复（S015）
        
        完整流程：
        1. 接收天枢消息
        2. 转换为 Agent 格式
        3. 调用 Agent 处理
        4. 返回回复
        
        Args:
            raw_message: 原始天枢消息
            
        Returns:
            Agent 回复内容
        """
        # 解析消息
        tianshu_msg = self._message_channel.handle_tianshu_message(raw_message) if self._message_channel else None
        
        # 发送到 Agent
        content = tianshu_msg.content if tianshu_msg else raw_message.get("content", {}).get("body", "")
        
        # 获取房间 ID
        room_id = raw_message.get("room_id", "")
        
        # 发送消息到 Agent
        response = await self.send_message(content)
        
        # 发送回复到天枢
        if room_id and self._message_channel:
            await self._message_channel.send_message(
                room_id=room_id,
                content=response,
            )
            
        return response
        
    @property
    def message_channel(self) -> Optional[MessageChannel]:
        """获取消息通道（S015）"""
        return self._message_channel
        
    # ==================== 原有方法 ====================
            
    def get_history(self) -> List[ConversationMessage]:
        """获取对话历史"""
        return self._conversation_history.copy()
        
    def clear_history(self) -> None:
        """清空对话历史"""
        self._conversation_history.clear()
        
    @property
    def state(self) -> AgentState:
        """获取当前状态"""
        return self._state
        
    @property
    def is_running(self) -> bool:
        """检查是否正在运行"""
        return self._state == AgentState.RUNNING
        
    @property
    def tool_registry(self) -> ToolRegistry:
        """获取工具注册表"""
        return self._tool_registry


class WukongAgentFactory:
    """悟空 Agent 工厂类"""
    
    @staticmethod
    def create(config: Optional[WukongConfig] = None) -> WukongAgent:
        """
        创建悟空 Agent
        
        Args:
            config: 配置
            
        Returns:
            WukongAgent 实例
        """
        return WukongAgent(config=config)
        
    @staticmethod
    async def create_and_start(
        config: Optional[WukongConfig] = None,
        message_callback: Optional[Callable[[str], None]] = None,
    ) -> WukongAgent:
        """
        创建并启动悟空 Agent
        
        Args:
            config: 配置
            message_callback: 消息回调
            
        Returns:
            已启动的 WukongAgent 实例
        """
        agent = WukongAgent(config=config, message_callback=message_callback)
        await agent.start()
        return agent
