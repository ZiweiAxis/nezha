# 专利技术交底书

## 专利 #2：面向智能体操作审计的哈希批处理上链存证与快速验真方法

---

## 一、发明名称
**《一种面向智能体操作审计的哈希批处理上链存证与快速验真方法》**

---

## 二、技术领域
本发明属于区块链应用与人工智能审计技术领域，具体涉及一种智能体操作行为的审计存证方法，特别涉及将操作指纹进行 Merkle 树批处理后上链，实现高性能、可快速验真的司法级审计系统。

---

## 三、背景技术

### 3.1 现有技术问题

AI 智能体在企业场景中执行各种操作（API 调用、文件操作、数据库访问等），这些操作需要被完整记录和审计，以满足合规要求和责任追溯。然而，现有审计方案存在以下问题：

1. **存储成本高**：所有操作日志直接存储在链上，区块链存储成本高昂，无法承载亿级操作量
2. **性能瓶颈**：每条操作记录都单独上链，TPS（每秒交易数）受限，无法满足大规模智能体的审计需求
3. **验真困难**：需要逐条比对链上哈希与本地记录，验真效率低
4. **隐私风险**：原始操作数据上链后，任何人都可查看，存在数据隐私风险

### 3.2 现有技术方案

现有技术中已有审计哈希上链的相关方案：

- **单条哈希直写**：每条操作记录生成哈希后直接写入区块链，如浪潮云专利方案
- **文件哈希上链**：将审计文件的哈希写入区块链，如执法记录仪方案
- **交易哈希记录**：记录区块链自身的交易哈希，如 nChain 专利方案

**现有技术的缺陷**：
- 均为"单条哈希直写链上"，TPS 瓶颈明显
- 无 Merkle 树批处理机制，无法实现高效聚合
- 无分离架构设计（链上存指纹 vs 本地存原文）
- 无轻量级验真路径

---

## 四、发明内容

### 4.1 本发明要解决的技术问题

本发明要解决的技术问题是：如何实现高性能、低成本、可快速验真的智能体操作审计存证，在承载亿级操作量的同时，确保任何人无法篡改审计记录，且验真时间控制在 3 秒以内。

### 4.2 本发明的技术方案

**核心思路**：采用"操作指纹 → Merkle 树批处理 → 链上根哈希"的三阶审计架构，原数据本地存储，仅将 Merkle 树根哈希写入区块链，实现存储成本与验真效率的平衡。

**具体方案包括**：

#### 4.2.1 操作指纹生成模块

1. 智能体的每操作生成一条 Trace 记录：
   - Trace ID（全局唯一）
   - 智能体 DID
   - 操作类型（API/文件/命令/数据库）
   - 操作内容（URL、文件路径、SQL 等）
   - 时间戳
   - 操作结果

2. 为每条 Trace 生成 SHA3-256 哈希（操作指纹）：
   ```
   Fingerprint = SHA256(TraceID || AgentDID || Operation || Timestamp || Result)
   ```

#### 4.2.2 Merkle 树批处理模块

1. 将 N 条操作指纹打包成一个批次（Batch）
2. 构建 Merkle 树：
   - 叶子节点：各操作指纹
   - 中间节点：两个子节点的哈希拼接后再哈希
   - 根节点：最终的 Merkle 根哈希
3. Merkle 树结构示意：

```
                    Root Hash
                       │
           ┌───────────┴───────────┐
           │                       │
      Hash(0,1)               Hash(2,3)
        │                         │
   ┌───┴───┐                 ┌───┴───┐
   │       │                 │       │
  H0      H1                H2      H3
   │       │                 │       │
  FP0     FP1               FP2     FP3
```

4. 将 Merkle 根哈希写入区块链：
   - 写入内容：批次 ID、根哈希、开始时间、结束时间、Trace 数量
   - 写入频率：可配置（如每分钟或每 1000 条操作）

#### 4.2.3 分离存储架构

1. **链上存储**（低成本）：
   - Merkle 根哈希
   - 批次元数据
   - 智能体 DID
   - 时间戳

2. **本地存储**（高容量）：
   - 完整的 Trace 记录
   - 操作原始数据
   - 便于查询和分析

**优势**：
- 链上仅存储 32 字节的根哈希，大幅降低存储成本
- 原始数据保留在本地，支持详细查询
- 隐私数据不上链，避免泄露风险

#### 4.2.4 快速验真模块

1. **验真请求**：用户提交需验真的 Trace ID
2. **路径重构**：系统根据 Trace ID 找到对应的叶子节点，重构从叶子到根的 Merkle 路径
3. **链上比对**：将重构的根哈希与链上存储的根哈希比对
4. **验真结果**：若一致，返回"真"；若不一致，返回"假"

**验真流程**：

```
用户请求验真（Trace ID: 12345）
    │
    ▼
查找本地 Trace 记录（ID: 12345）
    │
    ▼
获取操作指纹 FP12345
    │
    ▼
获取同批次的所有指纹，重构 Merkle 路径
    │
    ▼
计算路径根哈希 Root'
    │
    ▼
从区块链获取存储的根哈希 Root
    │
    ▼
比对 Root' vs Root
    │
    ▼
返回验真结果（真/假）
```

**验真时间**：O(log N)，100 万条记录仅需约 20 次哈希计算，验真时间 < 3 秒

### 4.3 本发明的技术效果

1. **高吞吐量**：批处理上链，TPS 可达 2000+，承载亿级操作
2. **低成本**：链上仅存根哈希，存储成本降低 99% 以上
3. **快速验真**：3 秒内完成验真，支持大规模审计
4. **隐私保护**：原始数据不上链，避免隐私泄露
5. **司法级证据**：任何人无法篡改（包括平台、企业、紫微自己）

---

## 五、具体实施方式

### 5.1 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    谛听 - 智能体审计与防火墙                   │
│                                                              │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │   操作拦截模块   │    │   指纹生成模块   │              │
│  │                  │    │                  │              │
│  │ - HTTP 拦截     │───►│ - SHA3-256 哈希  │              │
│  │ - 文件拦截      │    │ - Trace 生成     │              │
│  │ - 命令拦截      │    │                  │              │
│  └──────────────────┘    └────────┬─────────┘              │
│                                   │                         │
│                                   ▼                         │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │   本地存储模块   │    │  Merkle 树模块   │              │
│  │                  │    │                  │              │
│  │ - Trace 存储    │◄───│ - 批次管理      │              │
│  │ - 查询接口      │    │ - 树构建        │              │
│  │ - 日志轮转      │    │ - 根哈希计算    │              │
│  └──────────────────┘    └────────┬─────────┘              │
│                                   │                         │
│                                   ▼                         │
│                         ┌──────────────────┐              │
│                         │   区块链模块     │              │
│                         │                  │              │
│                         │ - 根哈希上链    │              │
│                         │ - 批次存证      │              │
│                         └──────────────────┘              │
│                                                              │
│  ┌──────────────────┐                                      │
│  │   验真服务模块   │                                      │
│  │                  │                                      │
│  │ - 路径重构      │                                      │
│  │ - 链上比对      │                                      │
│  │ - 结果返回      │                                      │
│  └──────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 核心流程

#### 流程 1：操作指纹生成

```
1. 智能体发起操作（如调用 API）
2. 谛听拦截操作
3. 生成 Trace 记录：
   - TraceID = uuid()
   - AgentDID = "did:ziwei:..."
   - Operation = "HTTP DELETE"
   - URL = "https://api.example.com/users/123"
   - Timestamp = now()
   - Result = "success"
4. 生成操作指纹：
   Fingerprint = SHA3-256(TraceID || AgentDID || Operation || URL || Timestamp || Result)
5. 存储 Trace 到本地数据库
6. 将指纹添加到当前批次
```

**关键代码示例（Go）**：

```go
// 谛听 - 操作指纹生成
type FingerprintGenerator struct{}

func (f *FingerprintGenerator) Generate(trace *AuditTrace) string {
    // 构建待哈希数据
    data := fmt.Sprintf(
        "%s:%s:%s:%s:%d:%s",
        trace.TraceID,
        trace.AgentDID,
        trace.Operation,
        trace.URL,
        trace.Timestamp.Unix(),
        trace.Result,
    )
    
    // SHA3-256 哈希
    hash := sha3.New256()
    hash.Write([]byte(data))
    return hex.EncodeToString(hash.Sum(nil))
}

// 生成 Trace 记录
func (s *AuditService) RecordOperation(req *InterceptRequest) *AuditTrace {
    trace := &AuditTrace{
        TraceID:     generateTraceID(),
        AgentDID:    req.AgentDID,
        Operation:   req.Method,
        URL:         req.URL.String(),
        Body:        req.Body,
        RiskScore:   req.RiskScore,
        Decision:    req.Decision,
        Timestamp:   time.Now(),
    }
    
    // 生成指纹
    trace.Fingerprint = s.fingerprintGen.Generate(trace)
    
    // 存储到本地
    s.db.Save(trace)
    
    // 添加到当前批次
    s.batchManager.Add(trace.Fingerprint)
    
    return trace
}
```

#### 流程 2：Merkle 树构建与上链

```
1. 批次管理器检测达到阈值（如 1000 条指纹）
2. 触发 Merkle 树构建
3. 构建完整的 Merkle 树
4. 计算根哈希
5. 将根哈希写入区块链：
   - BatchID
   - RootHash
   - StartTime
   - EndTime
   - TraceCount
6. 清空当前批次，开始新的批次
```

**关键代码示例（Go）**：

```go
// Merkle 树构建器
type MerkleTree struct {
    Root     []byte
    Leaves   [][]byte
    Tree     [][]byte
}

func NewMerkleTree(fingerprints [][]byte) *MerkleTree {
    mt := &MerkleTree{
        Leaves: fingerprints,
    }
    
    if len(fingerprints) == 0 {
        return mt
    }
    
    // 构建树
    mt.build()
    
    return mt
}

func (mt *MerkleTree) build() {
    // 初始化：叶子节点
    currentLevel := mt.Leaves
    
    for len(currentLevel) > 1 {
        var nextLevel [][]byte
        
        for i := 0; i < len(currentLevel); i += 2 {
            if i+1 < len(currentLevel) {
                // 两个子节点
                combined := append(currentLevel[i], currentLevel[i+1]...)
                parent := sha3.Sum256(combined)
                nextLevel = append(nextLevel, parent[:])
            } else {
                // 奇数个节点，复制最后一个
                combined := append(currentLevel[i], currentLevel[i]...)
                parent := sha3.Sum256(combined)
                nextLevel = append(nextLevel, parent[:])
            }
        }
        
        mt.Tree = append(mt.Tree, currentLevel)
        currentLevel = nextLevel
    }
    
    // 根节点
    mt.Root = currentLevel[0]
    mt.Tree = append(mt.Tree, currentLevel)
}

// 写入区块链
func (bm *BatchManager) CommitToBlockchain() error {
    fingerprints := bm.GetCurrentFingerprints()
    
    // 构建 Merkle 树
    tree := NewMerkleTree(fingerprints)
    
    // 链上交易
    txData := BatchTransaction{
        BatchID:     bm.batchID,
        RootHash:    hex.EncodeToString(tree.Root),
        StartTime:   bm.startTime,
        EndTime:     time.Now(),
        TraceCount:  len(fingerprints),
    }
    
    txID, err := bm.blockchain.Commit(txData)
    if err != nil {
        return err
    }
    
    // 保存批次信息
    bm.db.SaveBatch(&Batch{
        BatchID:    bm.batchID,
        RootHash:   txData.RootHash,
        TxID:       txID,
        TraceCount: len(fingerprints),
    })
    
    // 开始新批次
    bm.StartNewBatch()
    
    return nil
}
```

#### 流程 3：快速验真

```
1. 用户提交验真请求（Trace ID）
2. 系统从本地数据库获取 Trace 记录
3. 获取 Trace 所属的批次信息
4. 从区块链获取该批次的根哈希
5. 获取同批次的所有指纹
6. 重构 Merkle 路径
7. 计算路径根哈希
8. 比对链上根哈希
9. 返回验真结果
```

**关键代码示例（Go）**：

```go
// 验真服务
type VerificationService struct {
    db          *Database
    blockchain  *BlockchainClient
}

type VerificationResult struct {
    TraceID    string
    IsValid    bool
    Message    string
    VerifiedAt time.Time
}

func (vs *VerificationService) Verify(traceID string) (*VerificationResult, error) {
    // 1. 获取本地 Trace
    trace, err := vs.db.GetTrace(traceID)
    if err != nil {
        return nil, fmt.Errorf("trace not found: %w", err)
    }
    
    // 2. 获取批次信息
    batch, err := vs.db.GetBatch(trace.BatchID)
    if err != nil {
        return nil, fmt.Errorf("batch not found: %w", err)
    }
    
    // 3. 从区块链获取根哈希
    chainRootHash, err := vs.blockchain.GetRootHash(batch.TxID)
    if err != nil {
        return nil, fmt.Errorf("failed to get chain root: %w", err)
    }
    
    // 4. 重构 Merkle 路径
    path, err := vs.reconstructMerklePath(trace)
    if err != nil {
        return nil, fmt.Errorf("failed to reconstruct path: %w", err)
    }
    
    // 5. 计算根哈希
    calculatedRoot := path.CalculateRoot()
    
    // 6. 比对
    isValid := (calculatedRoot == chainRootHash)
    
    return &VerificationResult{
        TraceID:    traceID,
        IsValid:    isValid,
        Message:    "Verified successfully" if isValid else "Verification failed - data may be tampered",
        VerifiedAt: time.Now(),
    }, nil
}

// 重构 Merkle 路径
func (vs *VerificationService) reconstructMerklePath(trace *AuditTrace) (*MerklePath, error) {
    // 获取同批次的所有指纹
    fingerprints, err := vs.db.GetBatchFingerprints(trace.BatchID)
    if err != nil {
        return nil, err
    }
    
    // 找到当前指纹的索引
    index := -1
    for i, fp := range fingerprints {
        if fp == trace.Fingerprint {
            index = i
            break
        }
    }
    
    if index == -1 {
        return nil, fmt.Errorf("fingerprint not found in batch")
    }
    
    // 重构路径
    return NewMerklePath(fingerprints, index), nil
}
```

### 5.3 实施注意事项

1. **批次大小**：根据 TPS 和存储成本平衡，建议 1000-10000 条/批次
2. **上链频率**：根据实时性要求，可配置每分钟或每小时上链一次
3. **容错机制**：链上交易失败时，本地缓存批次数据，重试上链
4. **跨链支持**：可适配多条区块链（Hyperledger Fabric、长安链、以太坊）

---

## 六、优点与效果

### 6.1 技术优点

1. **原创性**：全球首次将 Merkle 树批处理应用于智能体审计存证
2. **高性能**：批处理上链，TPS 可达 2000+
3. **低成本**：链上存储降低 99%
4. **快速验真**：3 秒内完成，支持亿级操作
5. **隐私保护**：原始数据分离存储，不上链

### 6.2 预期效果

1. 审计存储成本降低 99% 以上
2. 验真时间 < 3 秒
3. 满足金融、政务等场景的司法审计要求

---

## 七、附图说明

- **图 1**：三阶审计架构图
- **图 2**：Merkle 树结构图
- **图 3**：上链流程图
- **图 4**：验真流程图

---

## 八、权利要求书

### 独立权利要求

1. **一种面向智能体操作审计的哈希批处理上链存证方法，其特征在于，包括以下步骤**：
   - 采集智能体的操作记录，生成 Trace；
   - 为每条 Trace 生成操作指纹（哈希）；
   - 将 N 条操作指纹打包成批次，构建 Merkle 树；
   - 计算 Merkle 根哈希，将根哈希写入区块链；
   - 将完整的 Trace 记录本地存储。

2. **一种快速验真方法，其特征在于，包括以下步骤**：
   - 接收验真请求（Trace ID）；
   - 从本地获取 Trace 记录和所属批次；
   - 从区块链获取该批次的 Merkle 根哈希；
   - 重构从操作指纹到根的 Merkle 路径；
   - 比对重构的根哈希与链上根哈希，返回验真结果。

3. **一种实现权利要求 1 所述方法的系统，其特征在于，包括**：
   - 操作拦截模块，用于拦截智能体操作并生成 Trace；
   - 指纹生成模块，用于生成操作指纹；
   - 批次管理模块，用于管理指纹批次；
   - Merkle 树模块，用于构建 Merkle 树并计算根哈希；
   - 区块链模块，用于将根哈希写入区块链；
   - 验真模块，用于重构 Merkle 路径并验真。

---

**交底人**：尹克浩  
**日期**：2026年2月  
**版本**：V1.0
