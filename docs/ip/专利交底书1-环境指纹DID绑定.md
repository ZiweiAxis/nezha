# 专利技术交底书

## 专利 #1：基于环境指纹与区块链 DID 绑定的智能体身份防冒充方法及系统

---

## 一、发明名称
**《一种基于环境指纹与区块链 DID 绑定的智能体身份防冒充方法及系统》**

---

## 二、技术领域
本发明属于人工智能安全技术领域，具体涉及一种智能体身份认证与防冒充方法，特别涉及将环境指纹与区块链去中心化标识符（DID）进行生命周期级绑定，实现智能体身份防冒充的系统与方法。

---

## 三、背景技术

### 3.1 现有技术问题

随着大语言模型（LLM）技术的快速发展，AI 智能体（Agent）正在企业场景中广泛应用。然而，智能体的身份管理存在严重的安全隐患：

1. **身份冒充风险**：智能体的身份凭证（如 API Key、Token）一旦泄露，攻击者可以冒充智能体执行恶意操作
2. **静态认证失效**：传统基于密钥的认证无法区分合法智能体和攻击者，即使凭证被窃取也无法检测
3. **环境隔离不足**：现有方案缺乏对智能体运行环境的有效绑定，无法感知智能体是否被部署到未知环境
4. **缺乏治理闭环**：身份异常时缺乏自动化的状态变更和人工审批机制

### 3.2 现有技术方案

现有技术中已有关于 DID（去中心化标识符）和设备指纹的相关方案：

- **DID 标准（W3C）**：提供了一种去中心化的身份标识方案，但未涉及与运行环境的绑定
- **设备指纹技术**：用于识别设备和浏览器，但主要用于营销和安全风控，未与区块链 DID 结合
- **环境检测技术**：如硬件特征检测、容器识别等，但未形成完整的身份防冒充闭环

**现有技术的缺陷**：
- 均未将"环境指纹"与"区块链 DID"进行生命周期级强制绑定
- 均未建立"指纹失配→身份待验证→人工审批→恢复/吊销"的治理闭环
- 无法解决"即使私钥被窃取，环境变化也会触发身份降级"的问题

---

## 四、发明内容

### 4.1 本发明要解决的技术问题

本发明要解决的技术问题是：提供一种基于环境指纹与区块链 DID 绑定的智能体身份防冒充方法及系统，实现即使智能体私钥被窃取，攻击者也无法通过环境差异冒充合法智能体的技术效果。

### 4.2 本发明的技术方案

**核心思路**：将智能体的运行环境特征（环境指纹）与区块链上的 DID 进行强制绑定，每次智能体启动时验证环境指纹，若不一致则触发身份降级和人工审批流程。

**具体方案包括**：

#### 4.2.1 环境指纹采集模块

在智能体首次注册和后续每次启动时，采集以下环境特征：

1. **硬件特征**：CPU 型号、序列号、内存大小、磁盘序列号
2. **容器特征**：容器 ID、镜像 ID、容器网络模式、挂载卷信息
3. **网络特征**：IP 地址、MAC 地址、网卡信息、DNS 服务器
4. **软件特征**：操作系统版本、关键软件包版本、运行时版本

将上述特征进行哈希处理，生成环境指纹（Fingerprint）：

```
Fingerprint = SHA256(HardwareInfo || ContainerInfo || NetworkInfo || SoftwareInfo)
```

#### 4.2.2 DID 注册与绑定模块

1. 为每个智能体生成唯一的 DID（格式：`did:ziwei:<hash>`）
2. 生成公私钥对，将公钥关联到 DID 文档
3. 将环境指纹写入区块链上的 DID 文档，与 DID 形成强制绑定
4. DID 文档结构示例：

```json
{
  "@context": "https://www.w3.org/ns/did/v1",
  "id": "did:ziwei:abc123...",
  "publicKey": [{
    "id": "did:ziwei:abc123...#keys-1",
    "type": "Ed25519VerificationKey2018",
    "controller": "did:ziwei:abc123...",
    "publicKeyBase58": "..."
  }],
  "authentication": ["did:ziwei:abc123...#keys-1"],
  "environmentFingerprint": {
    "hardware": "sha256:...",
    "container": "sha256:...",
    "network": "sha256:...",
    "software": "sha256:..."
  },
  "created": "2026-02-01T00:00:00Z"
}
```

#### 4.2.3 身份验证与状态机模块

智能体每次启动时，必须向治理平台提交当前环境指纹，平台与链上记录进行比对：

1. **指纹匹配**：验证通过 → 身份状态保持"正常"
2. **指纹失配**：验证失败 → 身份状态变更为"待验证"
3. **待验证状态**：智能体被限制操作，需触发人工审批

**状态机转换**：

```
[正常状态] --(指纹失配)--> [待验证状态] --(人工审批通过)--> [正常状态]
                          |                                    |
                          --(人工审批拒绝/超时)-----------------> [已吊销状态]
```

#### 4.2.4 人工审批与恢复模块

当智能体身份进入"待验证"状态时：

1. 治理平台通过企业 IM（飞书/钉钉/企微）推送审批请求给管理员
2. 审批请求包含：智能体 DID、当前环境信息、原始注册环境信息、差异对比
3. 管理员可以：
   - **批准**：确认环境变更合法，恢复为"正常"状态
   - **拒绝**：确认存在安全风险，吊销该 DID
4. 所有审批记录上链存证，不可篡改

### 4.3 本发明的技术效果

1. **防冒充能力大幅提升**：即使攻击者窃取私钥，若部署环境不同，指纹不匹配，无法冒充
2. **零信任架构**：不信任任何环境，每次启动都验证，环境即信任根
3. **治理闭环**：完整的"检测→降级→审批→恢复/吊销"流程
4. **司法可追溯**：所有状态变更和审批记录上链，可作为法律证据

---

## 五、具体实施方式

### 5.1 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    紫微智能体治理平台                         │
│                                                              │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │   天枢模块       │    │   区块链网络      │              │
│  │                  │    │                  │              │
│  │ ┌──────────────┐ │    │ ┌──────────────┐ │              │
│  │ │ 环境指纹采集 │ │    │ │ DID 注册     │ │              │
│  │ └──────────────┘ │    │ └──────────────┘ │              │
│  │ ┌──────────────┐ │    │ ┌──────────────┐ │              │
│  │ │ DID 管理器  │ │◄──►│ │ DID 文档存储 │ │              │
│  │ └──────────────┘ │    │ └──────────────┘ │              │
│  │ ┌──────────────┐ │    │ ┌──────────────┐ │              │
│  │ │ 状态机引擎  │ │    │ │ 审批记录存储 │ │              │
│  │ └──────────────┘ │    │ └──────────────┘ │              │
│  └──────────────────┘    └──────────────────┘              │
│            │                                               │
│            ▼                                               │
│  ┌──────────────────┐                                      │
│  │  企业 IM 通知    │  （飞书/钉钉/企业微信）               │
│  └──────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI 智能体                                 │
│                                                              │
│  - 配置 HTTP_PROXY 指向谛听                                  │
│  - 启动时向天枢注册 DID                                      │
│  - 运行时验证环境指纹                                        │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 核心流程

#### 流程 1：智能体首次注册

```
1. 智能体启动
2. 采集当前环境指纹（硬件、容器、网络、软件）
3. 生成公私钥对
4. 向天枢发送注册请求（包含公钥、环境指纹）
5. 天枢生成 DID，写入区块链 DID 文档
6. 返回 DID 给智能体
7. 智能体本地安全存储私钥和 DID
```

**关键代码示例（Python）**：

```python
# 天枢 - DID 注册服务
class DIDRegistrationService:
    def __init__(self, blockchain_client, db_client):
        self.blockchain = blockchain_client
        self.db = db_client
    
    async def register_agent(
        self,
        agent_id: str,
        public_key: str,
        environment_fingerprint: dict
    ) -> str:
        # 1. 生成 DID
        did = self._generate_did(agent_id, public_key)
        
        # 2. 构建 DID 文档（包含环境指纹）
        did_document = {
            "id": did,
            "publicKey": [{
                "id": f"{did}#keys-1",
                "type": "Ed25519VerificationKey2018",
                "controller": did,
                "publicKeyBase58": public_key
            }],
            "authentication": [f"{did}#keys-1"],
            "environmentFingerprint": environment_fingerprint,
            "status": "active",  # 正常状态
            "created": datetime.utcnow().isoformat()
        }
        
        # 3. 写入区块链
        tx_id = await self.blockchain.write_did_document(did, did_document)
        
        # 4. 存储到数据库
        await self.db.save_did_record(
            agent_id=agent_id,
            did=did,
            tx_id=tx_id,
            status="active",
            created_at=datetime.utcnow()
        )
        
        return did
```

#### 流程 2：智能体启动时验证

```
1. 智能体启动
2. 采集当前环境指纹
3. 向天枢发送验证请求（包含 DID、当前指纹）
4. 天枢从区块链获取 DID 文档
5. 比对环境指纹
6. 判定结果：
   - 匹配 → 返回"正常"状态
   - 不匹配 → 返回"待验证"状态，触发审批流程
```

**关键代码示例（Python）**：

```python
# 天枢 - 环境指纹验证服务
class EnvironmentVerificationService:
    def __init__(self, blockchain_client, db_client):
        self.blockchain = blockchain_client
        self.db = db_client
    
    async def verify_environment(
        self,
        did: str,
        current_fingerprint: dict
    ) -> VerificationResult:
        # 1. 从区块链获取 DID 文档
        did_document = await self.blockchain.read_did_document(did)
        
        if not did_document:
            return VerificationResult(
                valid=False,
                reason="DID not found",
                status="unknown"
            )
        
        # 2. 获取注册时的环境指纹
        registered_fingerprint = did_document.get("environmentFingerprint")
        
        # 3. 比对关键字段
        is_match = self._compare_fingerprints(
            registered_fingerprint,
            current_fingerprint
        )
        
        if is_match:
            return VerificationResult(
                valid=True,
                status="active",
                reason="Environment fingerprint matched"
            )
        else:
            # 4. 指纹不匹配，触发状态变更
            await self._trigger_status_change(
                did=did,
                old_status="active",
                new_status="pending_verification",
                reason="Environment fingerprint mismatch"
            )
            
            return VerificationResult(
                valid=False,
                status="pending_verification",
                reason="Environment fingerprint mismatch - manual approval required"
            )
    
    def _compare_fingerprints(
        self,
        registered: dict,
        current: dict
    ) -> bool:
        """比对环境指纹的各个维度"""
        # 硬件特征
        if registered.get("hardware") != current.get("hardware"):
            return False
        # 容器特征
        if registered.get("container") != current.get("container"):
            return False
        # 网络特征
        if registered.get("network") != current.get("network"):
            return False
        # 软件特征
        if registered.get("software") != current.get("software"):
            return False
        return True
```

#### 流程 3：人工审批

```
1. 天枢检测到"待验证"状态的智能体
2. 构建审批请求，推送到企业 IM
3. 管理员收到通知（包含差异对比）
4. 管理员回复"approve"或"deny"
5. 天枢接收审批结果
6. 执行状态变更：
   - approve → 状态变更为"active"，更新环境指纹
   - deny → 状态变更为"revoked"
7. 审批记录写入区块链存证
```

### 5.3 实施注意事项

1. **环境指纹的隐私保护**：环境指纹应进行哈希处理后上链，避免原始硬件信息泄露
2. **误报处理**：在容器迁移、扩容等场景下，可能触发误报，需要设计"白名单"机制
3. **审批时效**：设置审批超时时间，超时后自动进入"受限"状态
4. **多因素认证**：高风险场景下，可以要求管理员使用生物识别（指纹、面容）审批

---

## 六、优点与效果

### 6.1 技术优点

1. **独创性**：全球首次将环境指纹与区块链 DID 进行生命周期级绑定
2. **闭环性**：完整的"检测→降级→审批→恢复/吊销"治理闭环
3. **可落地性**：基于成熟的开源技术（Matrix 协议、Hyperledger Fabric）
4. **可扩展性**：支持多云、多容器平台

### 6.2 预期效果

1. 智能体身份冒充风险降低 99% 以上
2. 满足金融、政务等强监管场景的合规要求
3. 为企业提供司法级审计证据

---

## 七、附图说明

- **图 1**：系统架构图
- **图 2**：智能体注册流程图
- **图 3**：环境指纹验证流程图
- **图 4**：状态机转换图
- **图 5**：人工审批流程图

---

## 八、权利要求书

### 独立权利要求

1. **一种基于环境指纹与区块链 DID 绑定的智能体身份防冒充方法，其特征在于，包括以下步骤**：
   - 采集智能体的运行环境特征，生成环境指纹；
   - 为智能体生成去中心化标识符 DID，并将所述环境指纹写入区块链上的 DID 文档，形成绑定关系；
   - 智能体每次启动时，向治理平台提交当前环境指纹；
   - 治理平台比对当前环境指纹与区块链上存储的环境指纹；
   - 若指纹匹配，智能体保持正常状态；若指纹不匹配，智能体进入待验证状态，触发人工审批流程。

2. **一种实现权利要求 1 所述方法的系统，其特征在于，包括**：
   - 环境指纹采集模块，用于采集智能体的运行环境特征并生成环境指纹；
   - DID 管理模块，用于生成 DID 并将环境指纹写入区块链；
   - 验证模块，用于比对当前环境指纹与链上存储的环境指纹；
   - 状态机模块，用于管理智能体的身份状态转换；
   - 审批模块，用于在待验证状态下推送审批请求并执行状态变更。

---

**交底人**：尹克浩  
**日期**：2026年2月  
**版本**：V1.0
