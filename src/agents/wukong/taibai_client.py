"""
太白客户端模块

提供太白服务的 API 客户端封装。
"""

import logging
from typing import Optional, Dict, Any
import aiohttp

logger = logging.getLogger(__name__)


class TaiBaiClient:
    """太白服务客户端"""
    
    def __init__(
        self,
        base_url: str = "http://localhost:8081",
        token: Optional[str] = None,
    ):
        """
        初始化太白客户端
        
        Args:
            base_url: 太白服务 URL
            token: 认证 Token
        """
        self.base_url = base_url
        self.token = token
        self._session: Optional[aiohttp.ClientSession] = None
        
    async def initialize(self) -> None:
        """初始化客户端"""
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = "Bearer " + self.token
            
        self._session = aiohttp.ClientSession(headers=headers)
        logger.info("TaiBaiClient initialized")
        
    async def close(self) -> None:
        """关闭客户端"""
        if self._session:
            await self._session.close()
            self._session = None
        logger.info("TaiBaiClient closed")
        
    async def send_message(
        self,
        room_id: str,
        content: str,
    ) -> Optional[str]:
        """
        发送消息
        
        Args:
            room_id: 房间 ID
            content: 消息内容
            
        Returns:
            消息 ID
        """
        if not self._session:
            await self.initialize()
            
        try:
            url = self.base_url + "/api/message/send"
            payload = {
                "room_id": room_id,
                "content": content,
            }
            
            async with self._session.post(url, json=payload) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    return result.get("event_id")
                return None
        except Exception as e:
            logger.error("Error sending message: " + str(e))
            return None
            
    @property
    def is_initialized(self) -> bool:
        """检查是否已初始化"""
        return self._session is not None


# 导出
__all__ = ["TaiBaiClient"]
