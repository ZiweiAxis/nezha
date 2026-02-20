"""
悟空智能体消息通道模块
负责与天枢的消息互通：接收消息、发送消息、流式输出

消息流程:
用户消息 (天枢) → 哪吒 → 悟空 Agent
                              ↓
                        工具执行
                              ↓
Agent 输出 → 天枢 → 用户消息
"""

import asyncio
import logging
from typing import Optional, Callable, Dict, Any, List, AsyncIterator
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime

from .config import WukongConfig

logger = logging.getLogger(__name__)


class MessageSource(Enum):
    """消息来源"""
    TIANSHU = "tianshu"  # 天枢
    DIRECT = "direct"    # 直接调用


class MessageType(Enum):
    """消息类型"""
    TEXT = "text"
    IMAGE = "image"
    CARD = "card"
    HTML = "html"


@dataclass
class TianshuMessage:
    """天枢消息格式"""
    message_id: str           # 消息 ID
    room_id: str              # 房间 ID
    sender: str               # 发送者 DID
    content: str              # 消息内容
    timestamp: int            # 时间戳
    source: MessageSource     # 消息来源
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentMessage:
    """Agent 消息格式（发送回天枢）"""
    room_id: str              # 目标房间 ID
    content: str              # 消息内容
    message_type: MessageType = MessageType.TEXT
    metadata: Dict[str, Any] = field(default_factory=dict)
    reply_to: Optional[str] = None  # 回复的消息 ID


class TianshuMessageConverter:
    """消息格式转换器（天枢 ↔ Agent）"""
    
    @staticmethod
    def tianshu_to_agent(tianshu_msg: Dict[str, Any]) -> TianshuMessage:
        """
        将天枢消息格式转换为 Agent 消息格式
        
        天枢消息格式 (Matrix event):
        {
            "event_id": "xxx",
            "room_id": "!xxx:matrix.org",
            "sender": "@user:matrix.org",
            "type": "m.room.message",
            "content": {
                "msgtype": "m.text",
                "body": "消息内容"
            },
            "origin_server_ts": 1234567890
        }
        """
        content = tianshu_msg.get("content", {})
        msgtype = content.get("msgtype", "m.text")
        
        # 根据消息类型提取内容
        if msgtype == "m.text":
            body = content.get("body", "")
        elif msgtype == "m.custom.card":
            # 卡片消息
            try:
                body = content.get("content", "")
                if isinstance(body, str):
                    import json
                    body = json.loads(body).get("content", body)
            except:
                body = str(content.get("content", ""))
        else:
            body = content.get("body", "")
        
        return TianshuMessage(
            message_id=tianshu_msg.get("event_id", ""),
            room_id=tianshu_msg.get("room_id", ""),
            sender=tianshu_msg.get("sender", ""),
            content=body,
            timestamp=tianshu_msg.get("origin_server_ts", 0),
            source=MessageSource.TIANSHU,
            metadata={
                "msgtype": msgtype,
                "raw_content": content,
            }
        )
    
    @staticmethod
    def agent_to_tianshu(agent_msg: AgentMessage) -> Dict[str, Any]:
        """
        将 Agent 消息格式转换为天枢消息格式
        
        返回:
        {
            "room_id": "xxx",
            "content": "消息内容",
            "msgtype": "m.text",
            "format": "plain",
        }
        """
        msgtype_map = {
            MessageType.TEXT: "m.text",
            MessageType.IMAGE: "m.image",
            MessageType.CARD: "m.custom.card",
            MessageType.HTML: "m.text",
        }
        
        result = {
            "room_id": agent_msg.room_id,
            "msgtype": msgtype_map.get(agent_msg.message_type, "m.text"),
            "body": agent_msg.content,
        }
        
        if agent_msg.message_type == MessageType.HTML:
            result["format"] = "html"
            result["formatted_body"] = agent_msg.content
        elif agent_msg.message_type == MessageType.CARD:
            result["body"] = json.dumps({
                "type": "card",
                "content": agent_msg.content,
                "metadata": agent_msg.metadata,
            })
        
        return result


class MessageChannel:
    """
    消息通道管理器
    负责与天枢的消息收发
    """
    
    def __init__(
        self,
        config: Optional[WukongConfig] = None,
    ):
        """
        初始化消息通道
        
        Args:
            config: 悟空配置
        """
        self.config = config or WukongConfig()
        self._tianshu_client = None
        self._message_callback: Optional[Callable[[TianshuMessage], None]] = None
        self._stream_callback: Optional[Callable[[str], None]] = None
        self._is_initialized = False
        
    async def initialize(
        self,
        taibai_url: Optional[str] = None,
        taibai_token: Optional[str] = None,
    ) -> None:
        """
        初始化消息通道
        
        Args:
            taibai_url: 太白服务地址
            taibai_token: 太白认证 token
        """
        if self._is_initialized:
            logger.warning("MessageChannel already initialized")
            return
            
        taibai_url = taibai_url or self.config.tianshu_url or "http://localhost:8081"
        taibai_token = taibai_token or self.config.tianshu_token
        
        try:
            # 导入太白客户端
            from .taibai_client import TaibaiClient
            
            self._tianshu_client = TaibaiClient(
                base_url=taibai_url,
                token=taibai_token,
            )
            
            # 测试连接
            if await self._tianshu_client.ping():
                logger.info(f"MessageChannel initialized: {taibai_url}")
                self._is_initialized = True
            else:
                raise RuntimeError("Taibai ping failed")
                
        except ImportError:
            logger.warning("TaibaiClient not available, using HTTP fallback")
            self._tianshu_client = None
            self._is_initialized = True
        except Exception as e:
            logger.error(f"Failed to initialize MessageChannel: {e}")
            raise
            
    def set_message_callback(
        self,
        callback: Callable[[TianshuMessage], None]
    ) -> None:
        """设置消息接收回调"""
        self._message_callback = callback
        
    def set_stream_callback(
        self,
        callback: Callable[[str], None]
    ) -> None:
        """设置流式输出回调"""
        self._stream_callback = callback
        
    async def handle_tianshu_message(self, raw_message: Dict[str, Any]) -> None:
        """
        处理收到的天枢消息
        
        Args:
            raw_message: 原始天枢消息 (Matrix event)
        """
        try:
            # 转换为 Agent 消息格式
            agent_msg = TianshuMessageConverter.tianshu_to_agent(raw_message)
            
            logger.debug(f"Received message from {agent_msg.sender}: {agent_msg.content[:50]}...")
            
            # 调用消息回调
            if self._message_callback:
                self._message_callback(agent_msg)
                
        except Exception as e:
            logger.error(f"Error handling tianshu message: {e}")
            
    async def send_message(
        self,
        room_id: str,
        content: str,
        message_type: MessageType = MessageType.TEXT,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """
        发送消息到天枢
        
        Args:
            room_id: 目标房间 ID
            content: 消息内容
            message_type: 消息类型
            metadata: 附加元数据
            
        Returns:
            发送的消息 ID，失败返回 None
        """
        if not self._is_initialized:
            await self.initialize()
            
        agent_msg = AgentMessage(
            room_id=room_id,
            content=content,
            message_type=message_type,
            metadata=metadata or {},
        )
        
        tianshu_format = TianshuMessageConverter.agent_to_tianshu(agent_msg)
        
        try:
            if self._tianshu_client:
                # 使用太白客户端发送
                if message_type == MessageType.HTML:
                    response = await self._tianshu_client.send_html_message(
                        room_id=room_id,
                        content=content,
                        html=content,
                    )
                elif message_type == MessageType.CARD:
                    response = await self._tianshu_client.send_card_message(
                        room_id=room_id,
                        card=tianshu_format,
                    )
                else:
                    response = await self._tianshu_client.send_text_message(
                        room_id=room_id,
                        content=content,
                    )
                return response.get("event_id")
            else:
                # HTTP fallback
                logger.warning("TaibaiClient not available, message not sent")
                return None
                
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            return None
            
    async def send_streaming_message(
        self,
        room_id: str,
        content: str,
    ) -> str:
        """
        发送流式消息（实时推送）
        
        Args:
            room_id: 目标房间 ID
            content: 消息内容
            
        Returns:
            完整消息内容
        """
        # 调用流式回调
        if self._stream_callback:
            self._stream_callback(content)
            
        # 也可以实现为实时发送（每段内容都发送）
        # 对于长回复，可以分段发送
        
        return content
        
    async def send_typing-indicator(
        self,
        room_id: str,
        is_typing: bool = True,
    ) -> None:
        """
        发送正在输入状态
        
        Args:
            room_id: 房间 ID
            is_typing: 是否正在输入
        """
        # Matrix 支持 typing 状态
        # 可以通过太白客户端发送 m.typing 状态
        logger.debug(f"Typing indicator: {room_id} -> {is_typing}")
        
    async def close(self) -> None:
        """关闭消息通道"""
        self._tianshu_client = None
        self._is_initialized = False
        logger.info("MessageChannel closed")
        
    @property
    def is_initialized(self) -> bool:
        """检查是否已初始化"""
        return self._is_initialized


# 导入 json
import json
