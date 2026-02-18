# 专利技术交底书

## 专利 #3：基于联邦通信协议的智能体身份绑定与消息级验真方法

---

## 一、发明名称
**《一种基于联邦通信协议的智能体身份绑定与消息级验真方法》**

---

## 二、技术领域
本发明属于分布式通信与去中心化身份技术领域，具体涉及一种基于联邦通信协议的智能体身份认证与消息验真方法，特别涉及将去中心化标识符（DID）直接嵌入 Matrix 联邦通信协议的事件层，实现跨域智能体通信的原生身份绑定与消息级验真。

---

## 三、背景技术

### 3.1 现有技术问题

企业使用 AI 智能体时，智能体需要跨组织、跨平台进行通信协作。然而，现有方案存在以下问题：

1. **身份与通信分离**：身份认证（如 OAuth、DID）与通信协议是独立的系统，身份验证需要额外步骤
2. **中心化网关依赖**：跨组织通信需要中心化网关或代理，无法实现真正的去中心化
3. **消息无法验真**：接收方无法确认消息发送者的真实身份，消息可被伪造
4. **缺乏原生信任**：需要额外的信任层或第三方服务来建立互信

### 3.2 现有技术方案

现有技术中已有 DID 与通信协议结合的相关方案：

- **Microsoft DID 认证方案**：将 DID 用于 OAuth/IdP 认证流程增强，但基于传统 Web 认证架构
- **医疗机构 DID 双向认证**：使用 DID 进行身份验证，但仍是传统 Client-Server 架构
- **DID Wallet**：DID 钱包、认证令牌、可验证声明请求，但与通信协议解耦

**现有技术的缺陷**：
- 现有 DID 专利全部基于 REST/HTTP 架构，身份与通信分离
- 需要额外网关/代理实现跨域通信
- 消息本身不携带可验真的身份凭证

---

## 四、发明内容

### 4.1 本发明要解决的技术问题

本发明要解决的技术问题是：如何实现跨域智能体通信时，身份即通信实体、消息即凭证，无需额外网关即可完成身份验证和消息验真。

### 4.2 本发明的技术方案

**核心思路**：将 DID 直接嵌入 Matrix 联邦通信协议的事件层（Event），每条消息携带 DID 签名，接收方通过链上 DID 公钥实时验签，实现"身份即通信实体、消息即凭证"。

**具体方案包括**：

#### 4.2.1 DID 与 Matrix 账户绑定模块

1. **Matrix 账户创建**：
   - 智能体在治理平台注册后，自动在 Matrix 服务器上创建账户
   - Matrix 用户 ID 格式：`@agent_did:server_name`

2. **DID 与 Matrix 账户绑定**：
   - 在 DID 文档中添加 Matrix 用户 ID 字段
   - 在 Matrix 账户配置中添加 DID 字段
   - 实现双向绑定映射

**绑定示例**：

```json
// DID 文档扩展
{
  "id": "did:ziwei:abc123...",
  "matrix": {
    "userId": "@did:ziwei:abc123:tianshu.ziwei.com",
    "homeserver": "tianshu.ziwei.com"
  },
  "verificationMethod": [{
    "id": "did:ziwei:abc123#keys-1",
    "type": "Ed25519VerificationKey2018",
    "publicKeyBase58": "..."
  }]
}
```

#### 4.2.2 消息签名模块

1. **私钥管理**：
   - 智能体在注册时生成 Ed25519 公私钥对
   - 私钥安全存储在智能体本地

2. **消息签名流程**：
   ```
   1. 智能体构建 Matrix 事件（Event）
   2. 提取事件内容（type, content, room_id 等）
   3. 生成签名：
      Signature = Ed25519.Sign(PrivateKey, EventJSON)
   4. 将签名添加到事件的 signatures 字段
   5. 发送事件到 Matrix 服务器
   ```

3. **签名格式**：
   ```json
   {
     "type": "m.room.message",
     "room_id": "!room:example.com",
     "sender": "@did:ziwei:abc123:tianshu.ziwei.com",
     "content": {
       "msgtype": "m.text",
       "body": "Hello from AI Agent"
     },
     "signatures": {
       "tianshu.ziwei.com": {
         "ed25519:key1": "GjQ..."
       }
     }
   }
   ```

#### 4.2.3 消息验真模块

1. **验真流程**：
   ```
   1. 接收方收到 Matrix 事件
   2. 提取 sender（包含 DID）
   3. 从区块链获取 DID 文档（包含公钥）
   4. 提取事件签名
   5. 验证签名：
      IsValid = Ed25519.Verify(PublicKey, EventJSON, Signature)
   6. 返回验真结果
   ```

2. **验真代码逻辑**：
   ```python
   async def verify_message(event: dict) -> bool:
       # 1. 提取 sender（DID）
       sender_did = event["sender"]
       
       # 2. 去除 signatures 字段（因为签名不包含自身）
       event_for_verify = {k: v for k, v in event.items() if k != "signatures"}
       event_json = json.dumps(event_for_verify, sort_keys=True)
       
       # 3. 从区块链获取 DID 文档
       did_document = await blockchain.get_did_document(sender_did)
       if not did_document:
           return False
       
       # 4. 获取公钥
       public_key = did_document["verificationMethod"][0]["publicKeyBase58"]
       
       # 5. 获取签名
       homeserver = extract_homeserver(sender_did)
       signature = event["signatures"][homeserver]["ed25519:key1"]
       
       # 6. 验签
       return ed25519.verify(public_key, event_json, signature)
   ```

#### 4.2.4 联邦通信模块

1. **Matrix 联邦协议**：
   - 基于 Matrix 协议的 homeserver 之间的联邦通信
   - 智能体 A 可以直接向智能体 B 发送消息，无需中心化网关
   - 消息通过 Matrix 联邦网络路由

2. **跨域身份验证**：
   - 智能体 A 向智能体 B 发送消息
   - B 收到消息后，从 A 的 DID 文档获取公钥
   - B 验证 A 的消息签名
   - 验证通过后，确认消息来自真实的 A

3. **无需中心化网关**：
   - 对比传统方案：需要 API Gateway 做身份验证
   - 本方案：消息本身携带可验真的签名，直接在应用层验真

### 4.3 本发明的技术效果

1. **身份即通信实体**：DID 直接嵌入 Matrix 用户 ID，无需额外身份认证步骤
2. **消息即凭证**：每条消息携带 DID 签名，接收方实时验真
3. **去中心化**：基于 Matrix 联邦协议，跨域通信无需中心化网关
4. **原生信任**：通信与身份深度融合，建立联邦原生信任

---

## 五、具体实施方式

### 5.1 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    天枢 - 智能体通信与身份底座                │
│                                                              │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │   DID 管理模块    │    │  Matrix 协议模块 │              │
│  │                  │    │                  │              │
│  │ - DID 注册      │    │ - Homeserver    │              │
│  │ - DID 解析      │    │ - Federation    │              │
│  │ - DID 验证      │    │ - Event 处理    │              │
│  └────────┬─────────┘    └────────┬─────────┘              │
│           │                        │                        │
│           ▼                        ▼                        │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │   签名验签模块    │    │   消息处理模块   │              │
│  │                  │    │                  │              │
│  │ - Ed25519 签名  │◄──►│ - 事件构建      │              │
│  │ - Ed25519 验签  │    │ - 签名附加      │              │
│  │                  │    │ - 验真检查      │              │
│  └──────────────────┘    └──────────────────┘              │
│                                                              │
│  ┌──────────────────┐                                      │
│  │   区块链模块     │                                      │
│  │                  │                                      │
│  │ - DID 文档存储  │                                      │
│  │ - 公钥上链      │                                      │
│  └──────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Matrix 联邦网络                           │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │  企业 A      │    │   紫微治理   │    │  企业 B      │ │
│  │  Homeserver  │◄──►│  Homeserver  │◄──►│  Homeserver  │ │
│  │              │    │              │    │              │ │
│  │  @agent1:... │    │  @agent2:... │    │  @agent3:... │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 核心流程

#### 流程 1：DID 与 Matrix 账户绑定

```
1. 智能体在治理平台注册
2. 平台生成 DID 和公私钥对
3. 平台在 Matrix Homeserver 创建账户
4. 账户 ID 格式：@did:ziwei:hash:server.com
5. DID 文档添加 matrix 字段
6. 账户配置添加 DID 字段
7. 双向绑定完成
```

**关键代码示例（Python）**：

```python
# 天枢 - DID 与 Matrix 账户绑定
class DIDMatrixBinder:
    def __init__(self, matrix_client, blockchain_client):
        self.matrix = matrix_client
        self.blockchain = blockchain_client
    
    async def bind_did_with_matrix(
        self,
        agent_id: str,
        public_key: str,
        private_key: str,
        homeserver: str
    ) -> dict:
        # 1. 生成 DID
        did = self._generate_did(agent_id, public_key)
        
        # 2. 创建 Matrix 账户
        matrix_user_id = f"@{did}:{homeserver}"
        await self.matrix.create_account(
            user_id=matrix_user_id,
            password=self._generate_password()
        )
        
        # 3. 构建 DID 文档（包含 Matrix 绑定）
        did_document = {
            "id": did,
            "publicKey": [{
                "id": f"{did}#keys-1",
                "type": "Ed25519VerificationKey2018",
                "controller": did,
                "publicKeyBase58": public_key
            }],
            "authentication": [f"{did}#keys-1"],
            "matrix": {
                "userId": matrix_user_id,
                "homeserver": homeserver
            },
            "created": datetime.utcnow().isoformat()
        }
        
        # 4. 写入区块链
        tx_id = await self.blockchain.write_did_document(did, did_document)
        
        return {
            "did": did,
            "matrix_user_id": matrix_user_id,
            "tx_id": tx_id
        }
```

#### 流程 2：消息签名与发送

```
1. 智能体构建消息内容
2. 构建 Matrix 事件（Event）
3. 生成事件 JSON（不含 signatures）
4. 使用私钥对事件签名
5. 将签名添加到事件
6. 发送到 Matrix 服务器
```

**关键代码示例（Python）**：

```python
# 天枢 - 消息签名
class MessageSigner:
    def __init__(self, private_key: bytes):
        self.private_key = private_key
    
    def sign_event(self, event: dict) -> dict:
        # 1. 去除 signatures 字段（签名不包含自身）
        event_for_sign = {k: v for k, v in event.items() if k != "signatures"}
        
        # 2. 规范化 JSON（排序键）
        event_json = json.dumps(event_for_sign, sort_keys=True, separators=(',', ':'))
        
        # 3. Ed25519 签名
        signature = ed25519.sign(event_json.encode(), self.private_key)
        
        # 4. 添加签名到事件
        event["signatures"] = {
            self.homeserver: {
                "ed25519:key1": signature.hex()
            }
        }
        
        return event
    
    async def send_message(
        self,
        room_id: str,
        content: dict
    ) -> dict:
        # 构建事件
        event = {
            "type": "m.room.message",
            "room_id": room_id,
            "sender": self.matrix_user_id,
            "content": {
                "msgtype": "m.text",
                "body": content.get("body", "")
            },
            "origin_server_ts": int(time.time() * 1000)
        }
        
        # 签名
        signed_event = self.sign_event(event)
        
        # 发送
        response = await self.matrix.send_event(signed_event)
        
        return response
```

#### 流程 3：消息验真

```
1. 接收方收到 Matrix 事件
2. 提取 sender（DID）
3. 从区块链获取 DID 文档
4. 提取公钥
5. 提取事件签名
6. 验签事件内容
7. 返回验真结果
```

**关键代码示例（Python）**：

```python
# 天枢 - 消息验真
class MessageVerifier:
    def __init__(self, blockchain_client):
        self.blockchain = blockchain_client
    
    async def verify_event(self, event: dict) -> VerificationResult:
        # 1. 提取 sender
        sender = event.get("sender")
        if not sender:
            return VerificationResult(valid=False, reason="No sender")
        
        # 2. 解析 DID
        did = self._extract_did_from_matrix_id(sender)
        if not did:
            return VerificationResult(valid=False, reason="Invalid DID format")
        
        # 3. 获取 DID 文档
        did_document = await self.blockchain.read_did_document(did)
        if not did_document:
            return VerificationResult(valid=False, reason="DID not found")
        
        # 4. 提取公钥
        public_key_base58 = did_document["publicKey"][0]["publicKeyBase58"]
        public_key = ed25519.PublicKey.from_base58(public_key_base58)
        
        # 5. 提取签名
        homeserver = self._extract_homeserver(sender)
        signature_hex = event.get("signatures", {}).get(homeserver, {}).get("ed25519:key1")
        if not signature_hex:
            return VerificationResult(valid=False, reason="No signature")
        
        signature = bytes.fromhex(signature_hex)
        
        # 6. 准备验签数据（去除 signatures）
        event_for_verify = {k: v for k, v in event.items() if k != "signatures"}
        event_json = json.dumps(event_for_verify, sort_keys=True, separators=(',', ':'))
        
        # 7. 验签
        try:
            public_key.verify(event_json.encode(), signature)
            return VerificationResult(valid=True, did=did)
        except Exception as e:
            return VerificationResult(valid=False, reason=f"Signature verification failed: {e}")
```

### 5.3 实施注意事项

1. **私钥安全**：智能体私钥需要安全存储，建议使用 TPM 或加密存储
2. **密钥轮换**：支持密钥轮换，更新公钥时需要更新 DID 文档
3. **离线验真**：可缓存 DID 文档，支持离线验真
4. **联邦发现**：Matrix 联邦通过 .well-known 或直接 IP 发现，无需额外配置

---

## 六、优点与效果

### 6.1 技术优点

1. **独创性**：全球首个将 DID 直接嵌入联邦通信协议（Matrix）事件层
2. **原生信任**：身份即通信实体，消息即凭证
3. **去中心化**：基于 Matrix 联邦协议，无需中心化网关
4. **实时验真**：接收方实时验签，无需额外认证流程

### 6.2 预期效果

1. 跨域智能体通信无需额外的身份认证步骤
2. 每条消息都可验真，防止消息伪造
3. 满足企业间协作的信任要求

---

## 七、附图说明

- **图 1**：系统架构图
- **图 2**：DID 与 Matrix 账户绑定流程图
- **图 3**：消息签名与验真流程图
- **图 4**：联邦通信示意图

---

## 八、权利要求书

### 独立权利要求

1. **一种基于联邦通信协议的智能体身份绑定与消息级验真方法，其特征在于，包括以下步骤**：
   - 为智能体生成去中心化标识符 DID 和公私钥对；
   - 将 DID 与 Matrix 账户进行绑定，Matrix 用户 ID 包含 DID；
   - 智能体发送消息时，使用私钥对 Matrix 事件进行签名，将签名附加到事件中；
   - 接收方收到消息后，从区块链获取发送方的 DID 文档，提取公钥；
   - 接收方使用公钥验证消息签名，确认发送方身份。

2. **一种实现权利要求 1 所述方法的系统，其特征在于，包括**：
   - DID 管理模块，用于生成 DID 并绑定 Matrix 账户；
   - 消息签名模块，用于使用私钥对 Matrix 事件签名；
   - 消息验真模块，用于从区块链获取 DID 公钥并验签；
   - Matrix 联邦模块，用于跨域消息路由和转发；
   - 区块链模块，用于存储 DID 文档和公钥。

---

**交底人**：尹克浩  
**日期**：2026年2月  
**版本**：V1.0
