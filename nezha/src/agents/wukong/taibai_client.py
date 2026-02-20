"""
太白客户端 Python 实现
用于与太白服务（Matrix）通信
"""

import asyncio
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class TaibaiClient:
    """
    太白客户端 - 对接太白 SDK (Matrix 协议)
    
    用于发送消息到 Matrix 房间
    """
    
    def __init__(
        self,
        base_url: str = "http://localhost:8081",
        token: Optional[str] = None,
    ):
        """
        初始化太白客户端
        
        Args:
            base_url: 太白服务地址
            token: 认证 token
        """
        self.base_url = base_url.rstrip("/")
        self.token = token or ""
        self._session: Optional[Any] = None
        
    async def _get_session(self) -> Any:
        """获取 HTTP 会话"""
        if self._session is None:
            import aiohttp
            self._session = aiohttp.ClientSession()
        return self._session
        
    async def _request(
        self,
        method: str,
        path: str,
        body: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        发送 HTTP 请求
        
        Args:
            method: HTTP 方法
            path: 请求路径
            body: 请求体
            
        Returns:
            响应数据
        """
        import aiohttp
        
        session = await self._get_session()
        url = f"{self.base_url}{path}"
        
        headers = {
            "Content-Type": "application/json",
        }
        
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
            
        try:
            async with session.request(
                method,
                url,
                json=body,
                headers=headers,
            ) as response:
                if response.status >= 400:
                    text = await response.text()
                    raise Exception(f"Taibai API error: {response.status} - {text}")
                    
                if response.content_type == "application/json":
                    return await response.json()
                return {}
                
        except aiohttp.ClientError as e:
            logger.error(f"HTTP request failed: {e}")
            raise
            
    async def ping(self) -> bool:
        """
        测试连接
        
        Returns:
            是否连接成功
        """
        try:
            await self._request("GET", "/_matrix/client/versions")
            return True
        except Exception as e:
            logger.warning(f"Ping failed: {e}")
            return False
            
    async def send_text_message(
        self,
        room_id: str,
        content: str,
    ) -> Dict[str, Any]:
        """
        发送文本消息
        
        Args:
            room_id: 房间 ID
            content: 消息内容
            
        Returns:
            响应包含 event_id
        """
        import uuid
        
        txn_id = f"m{uuid.uuid4().hex[:8}"
        body = {
            "msgtype": "m.text",
            "format": "plain",
            "body": content,
        }
        
        return await self._request(
            "POST",
            f"/_matrix/client/r0/rooms/{room_id}/send/m.room.message/{txn_id}",
            body,
        )
        
    async def send_html_message(
        self,
        room_id: str,
        content: str,
        html: str,
    ) -> Dict[str, Any]:
        """
        发送 HTML 消息
        
        Args:
            room_id: 房间 ID
            content: 纯文本内容
            html: HTML 内容
            
        Returns:
            响应包含 event_id
        """
        import uuid
        
        txn_id = f"m{uuid.uuid4().hex[:8}"
        body = {
            "msgtype": "m.text",
            "format": "org.matrix.html",
            "body": content,
            "formatted_body": html,
        }
        
        return await self._request(
            "POST",
            f"/_matrix/client/r0/rooms/{room_id}/send/m.room.message/{txn_id}",
            body,
        )
        
    async def send_card_message(
        self,
        room_id: str,
        card: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        发送卡片消息
        
        Args:
            room_id: 房间 ID
            card: 卡片内容
            
        Returns:
            响应包含 event_id
        """
        import uuid
        import json
        
        txn_id = f"m{uuid.uuid4().hex[:8}"
        body = {
            "msgtype": "m.custom.card",
            "format": "plain",
            "body": json.dumps(card),
            "content": card,
        }
        
        return await self._request(
            "POST",
            f"/_matrix/client/r0/rooms/{room_id}/send/m.room.message/{txn_id}",
            body,
        )
        
    async def send_typing(
        self,
        room_id: str,
        user_id: str,
        timeout: int = 30000,
    ) -> Dict[str, Any]:
        """
        发送正在输入状态
        
        Args:
            room_id: 房间 ID
            user_id: 用户 ID
            timeout: 超时时间（毫秒）
            
        Returns:
            响应
        """
        body = {
            "timeout": timeout,
        }
        
        return await self._request(
            "PUT",
            f"/_matrix/client/r0/rooms/{room_id}/typing/{user_id}",
            body,
        )
        
    async def close(self) -> None:
        """关闭会话"""
        if self._session:
            await self._session.close()
            self._session = None


class HTTPMessageSender:
    """
    HTTP 消息发送器（无太白客户端时的后备方案）
    通过天枢的 HTTP API 发送消息
    """
    
    def __init__(
        self,
        tianshu_url: str = "http://localhost:8082",
        access_token: Optional[str] = None,
    ):
        self.tianshu_url = tianshu_url.rstrip("/")
        self.access_token = access_token or ""
        
    async def send_message(
        self,
        room_id: str,
        content: str,
        message_type: str = "text",
    ) -> Optional[str]:
        """
        发送消息
        
        Args:
            room_id: 房间 ID
            content: 消息内容
            message_type: 消息类型
            
        Returns:
            消息 ID 或 None
        """
        import aiohttp
        
        # 尝试通过天枢 API 发送
        url = f"{self.tianshu_url}/api/v1/delivery/message"
        
        headers = {"Content-Type": "application/json"}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
            
        body = {
            "room_id": room_id,
            "content": content,
            "message_type": message_type,
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=body, headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("event_id")
                    else:
                        logger.warning(f"HTTP message send failed: {response.status}")
                        return None
        except Exception as e:
            logger.error(f"HTTP message send error: {e}")
            return None
