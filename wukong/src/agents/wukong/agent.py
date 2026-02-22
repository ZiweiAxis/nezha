"""
悟空智能体服务封装模块

S015: 消息通道集成
- 消息接收：从天枢接收消息
- 消息发送：发送消息到天枢
- 流式输出：实时推送 Agent 输出

S052: Skill 加载器集成
- 根据用户意图匹配 Skill
- 将 SKILL.md 文档注入 LLM 上下文
- 支持 Skill 热重载
"""

import asyncio
import logging
from typing import Optional, Callable, Dict, Any, List
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
    S052: 集成 Skill 加载器，支持文档式 Skill 上下文注入。
    """

    def __init__(
        self,
        config: Optional[WukongConfig] = None,
        message_callback: Optional[Callable[[str], None]] = None,
        tianshu_callback: Optional[Callable[[TianshuMessage], None]] = None,
        skill_loader=None,
        enable_skills: bool = True,
        owner_id: Optional[str] = None,
    ):
        """
        初始化悟空 Agent

        Args:
            config: 悟空配置
            message_callback: 消息回调函数（接收消息内容）
            tianshu_callback: 天枢消息回调（接收完整的 TianshuMessage）
            skill_loader: SkillLoader 实例，为 None 时按需自动创建
            enable_skills: 是否启用 Skill 功能
            owner_id: 所有者 ID（供外部策略系统使用）
        """
        self.config = config or WukongConfig()
        self._client = WukongClient(self.config)
        self._state = AgentState.IDLE
        self._message_callback = message_callback
        self._tianshu_callback = tianshu_callback
        self._conversation_history: List[ConversationMessage] = []
        self._tool_registry = get_registry()
        self._owner_id = owner_id

        # 消息通道（S015）
        self._message_channel: Optional[MessageChannel] = None
        if self.config.enable_message_channel:
            self._message_channel = MessageChannel(self.config)

        # Skill 加载器（S052）
        self._enable_skills = enable_skills and self.config.skill_enabled
        self._skill_loader = skill_loader
        self._skill_contexts: Dict[str, str] = {}  # skill_name -> formatted content

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
                if self._tianshu_callback:
                    self._message_channel.set_message_callback(self._tianshu_callback)
                logger.info("MessageChannel initialized")

            # S052: 初始化 Skill 加载器
            if self._enable_skills:
                if self._skill_loader is None:
                    from .skills import get_loader
                    self._skill_loader = get_loader(
                        skills_path=self.config.skill_dir or None
                    )
                self._load_skill_contexts()
                self._skill_loader.on_reload(self._on_skills_reloaded)
                logger.info(f"Loaded {len(self._skill_contexts)} skill contexts")

            self._state = AgentState.RUNNING
            logger.info("Wukong Agent started successfully")
            return True

        except Exception as e:
            self._state = AgentState.ERROR
            logger.error(f"Failed to start agent: {e}")
            raise

    def _on_skills_reloaded(self) -> None:
        """Skill 热重载回调"""
        self._load_skill_contexts()
        logger.info(f"Skills reloaded, now have {len(self._skill_contexts)} skill contexts")

    def _load_skill_contexts(self) -> None:
        """加载所有 Skill 文档内容"""
        self._skill_contexts = {}
        for ctx in self._skill_loader.get_all_contexts():
            content = self._skill_loader.format_for_llm(ctx.skill.name, include_frontmatter=False)
            if content:
                self._skill_contexts[ctx.skill.name] = content

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

            # 停止 Skill 文件监听（S052）
            if self._skill_loader:
                self._skill_loader.stop()

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
            # S052: 注入 Skill 上下文
            effective_system = system_prompt or self.config.system_prompt
            if self._enable_skills and self._skill_loader:
                matched = self._skill_loader.find_by_intent(message)
                if matched:
                    skill_context = self._build_skill_context(matched[:2])
                    effective_system = f"{effective_system}\n\n{skill_context}"
                    logger.info(f"Injected skill context: {[m.skill.name for m in matched[:2]]}")

            response = await self._client.send_message(
                message=message,
                system_prompt=effective_system,
            )

            self._conversation_history.append(
                ConversationMessage(role="assistant", content=response)
            )
            return response

        except Exception as e:
            logger.error(f"Error sending message: {e}")
            raise

    def _build_skill_context(self, contexts) -> str:
        """构建 Skill 上下文字符串"""
        parts = ["## 可用 Skills\n"]
        for ctx in contexts:
            content = self._skill_contexts.get(ctx.skill.name, "")
            if content:
                parts.append(f"### Skill: {ctx.skill.name}\n")
                parts.append(content)
                parts.append("\n---\n")
        return "\n".join(parts)

    def set_owner_id(self, owner_id: str) -> None:
        """设置所有者 ID（供外部策略系统使用）"""
        self._owner_id = owner_id
        logger.info(f"Owner ID set: {owner_id}")

    def on_message(self, callback: Callable[[str], None]) -> None:
        """设置消息回调"""
        self._message_callback = callback
        if self._client.is_initialized:
            self._client.set_message_callback(callback)

    def on_tianshu_message(self, callback: Callable[[TianshuMessage], None]) -> None:
        """设置天枢消息回调（S015）"""
        self._tianshu_callback = callback
        if self._message_channel and self._message_channel.is_initialized:
            self._message_channel.set_message_callback(callback)

    # ==================== S015: 消息通道方法 ====================

    async def handle_tianshu_message(self, raw_message: Dict[str, Any]) -> None:
        """处理收到的天枢消息（S015）"""
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
        """发送消息到天枢（S015）"""
        if not self._message_channel:
            logger.warning("MessageChannel not initialized")
            return None
        return await self._message_channel.send_message(
            room_id=room_id,
            content=content,
            message_type=message_type,
        )

    async def send_streaming(self, room_id: str, content: str) -> str:
        """发送流式消息到天枢（S015）"""
        if not self._message_channel:
            logger.warning("MessageChannel not initialized")
            return content
        return await self._message_channel.send_streaming_message(
            room_id=room_id,
            content=content,
        )

    async def process_tianshu_message(self, raw_message: Dict[str, Any]) -> str:
        """
        处理收到的天枢消息并返回回复（S015）

        完整流程：接收 → 解析 → Agent 处理 → 回复天枢
        """
        tianshu_msg = None
        if self._message_channel:
            await self._message_channel.handle_tianshu_message(raw_message)

        content = raw_message.get("content", {}).get("body", "")
        room_id = raw_message.get("room_id", "")

        response = await self.send_message(content)

        if room_id and self._message_channel:
            await self._message_channel.send_message(room_id=room_id, content=response)

        return response

    @property
    def message_channel(self) -> Optional[MessageChannel]:
        """获取消息通道（S015）"""
        return self._message_channel

    # ==================== 通用方法 ====================

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
    def create(config: Optional[WukongConfig] = None, **kwargs) -> WukongAgent:
        """创建悟空 Agent"""
        return WukongAgent(config=config, **kwargs)

    @staticmethod
    async def create_and_start(
        config: Optional[WukongConfig] = None,
        message_callback: Optional[Callable[[str], None]] = None,
        **kwargs,
    ) -> WukongAgent:
        """创建并启动悟空 Agent"""
        agent = WukongAgent(config=config, message_callback=message_callback, **kwargs)
        await agent.start()
        return agent
