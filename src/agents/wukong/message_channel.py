"""
悟空消息通道模块

S015: 天枢消息通道集成
- 消息接收：从天枢接收消息
- 消息发送：发送消息到天枢
- 流式输出：实时推送 Agent 输出
"""

import asyncio
import logging
from typing import Optional, Callable, Dict, Any, List, AsyncIterator
from dataclasses import dataclass, field
from enum import Enum
import json
import aiohttp

from .config import WukongConfig

logger = logging.getLogger(__name__)


class MessageType(Enum):
    """消息类型"""
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    NOTICE = "notice"


class MessageSource(Enum):
    """消息来源"""
    USER = "user"
    AGENT = "agent"
    SYSTEM = "system"


@dataclass
class TianshuMessage:
    """天枢消息结构"""
    message_id: str = ""
    room_id: str = ""
    sender: str = ""
    content: str = ""
    message_type: MessageType = MessageType.TEXT
    source: MessageSource = MessageSource.USER
    timestamp: int = 0
    raw: Dict[str, Any] = field(default_factory=dict)


class MessageChannel:
    """天枢消息通道"""
    
    def __init__(self, config: WukongConfig):
        """
        初始化消息通道
        
        Args:
            config: 悟空配置
        """
        self.config = config
        self._session: Optional[aiohttp.ClientSession] = None
        self._message_callback: Optional[Callable[[str], None]] = None
        self._tianshu_callback: Optional[Callable[[TianshuMessage], None]] = None
        self._is_initialized = False
        
    async def initialize(
        self,
        taibai_url: Optional[str] = None,
        taibai_token: Optional[str] = None,
    ) -> None:
        """初始化消息通道
        
        Args:
            taibai_url: 太白服务 URL
            taibai_token: 天枢 Token
        """
        try:
            # 使用传入的参数或配置
            url = taibai_url or self.config.taibai_url
            token = taibai_token or self.config.tianshu_token
            
            self._session = aiohttp.ClientSession(
                headers={
                    "Authorization": "Bearer " + (token or ""),
                    "Content-Type": "application/json",
                }
            )
            self._is_initialized = True
            logger.info("MessageChannel initialized successfully")
        except Exception as e:
            logger.error("Failed to initialize MessageChannel: " + str(e))
            raise
            
    def set_message_callback(self, callback: Callable[[str], None]) -> None:
        """设置消息回调函数"""
        self._message_callback = callback
        
    def set_tianshu_callback(self, callback: Callable[[TianshuMessage], None]) -> None:
        """设置天枢消息回调"""
        self._tianshu_callback = callback
        
    async def handle_tianshu_message(self, raw_message: Dict[str, Any]) -> None:
        """
        处理收到的天枢消息
        
        Args:
            raw_message: 原始天枢消息 (Matrix event)
        """
        try:
            # 解析 Matrix 事件
            event_type = raw_message.get("type", "")
            if event_type != "m.room.message":
                return
                
            room_id = raw_message.get("room_id", "")
            sender = raw_message.get("sender", "")
            message_id = raw_message.get("event_id", "")
            timestamp = raw_message.get("origin_server_ts", 0)
            
            # 解析消息内容
            content = raw_message.get("content", {})
            msg_type = content.get("msgtype", "m.text")
            body = content.get("body", "")
            
            # 转换消息类型
            if msg_type == "m.text":
                message_type = MessageType.TEXT
            elif msg_type == "m.image":
                message_type = MessageType.IMAGE
            else:
                message_type = MessageType.TEXT
                
            # 创建消息对象
            tianshu_msg = TianshuMessage(
                message_id=message_id,
                room_id=room_id,
                sender=sender,
                content=body,
                message_type=message_type,
                source=MessageSource.USER,
                timestamp=timestamp,
                raw=raw_message,
            )
            
            # 调用回调
            if self._tianshu_callback:
                self._tianshu_callback(tianshu_msg)
                
            logger.debug("Processed tianshu message: " + message_id)
            
        except Exception as e:
            logger.error("Failed to handle tianshu message: " + str(e))
            
    async def send_message(
        self,
        room_id: str,
        content: str,
        message_type: MessageType = MessageType.TEXT,
    ) -> Optional[str]:
        """
        发送消息到天枢
        
        Args:
            room_id: 目标房间 ID
            content: 消息内容
            message_type: 消息类型
            
        Returns:
            发送的消息 ID，失败返回 None
        """
        if not self._session:
            await self.initialize()
            
        try:
            url = self.config.tianshu_url + "/api/message/send"
            payload = {
                "room_id": room_id,
                "content": content,
                "msgtype": "m.text",
            }
            
            async with self._session.post(url, json=payload) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    message_id = result.get("event_id", "")
                    logger.info("Message sent successfully: " + message_id)
                    return message_id
                else:
                    logger.error("Failed to send message: " + str(resp.status))
                    return None
                    
        except Exception as e:
            logger.error("Error sending message: " + str(e))
            return None
            
    async def send_streaming_message(
        self,
        room_id: str,
        content: str,
    ) -> str:
        """
        发送流式消息
        
        实时推送内容到天枢
        
        Args:
            room_id: 目标房间 ID
            content: 消息内容
            
        Returns:
            完整消息内容
        """
        # 如果启用流式输出，使用流式发送
        if self.config.stream_output:
            # 简化的流式发送：逐段发送
            try:
                for i in range(0, len(content), 100):
                    chunk = content[i:i+100]
                    await self.send_message(room_id, chunk)
                    if self._message_callback:
                        self._message_callback(chunk)
                    await asyncio.sleep(0.1)
                return content
            except Exception as e:
                logger.error("Error in streaming: " + str(e))
                return content
        else:
            # 非流式：直接发送
            await self.send_message(room_id, content)
            return content
            
    async def close(self) -> None:
        """关闭消息通道"""
        if self._session:
            await self._session.close()
            self._session = None
        self._is_initialized = False
        logger.info("MessageChannel closed")
        
    @property
    def is_initialized(self) -> bool:
        """检查是否已初始化"""
        return self._is_initialized


# 导出
__all__ = [
    "MessageChannel",
    "TianshuMessage",
    "MessageType",
    "MessageSource",
]
