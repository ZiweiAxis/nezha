# 紫微（Ziwei）PRD — 权威引用与范围摘要

**版本**：v1.0  
**日期**：2026-02-16  
**用途**：根目录 PRD 的**权威引用**文档，供 BMAD 工作流、实现就绪检查与工具链统一引用；本文件不替代下述文档，仅声明其共同构成根 PRD。

---

## 1. PRD 构成（权威来源）

本仓库根目录的「产品需求与范围」由以下文档共同构成，引用时请以这些路径为准：

| 文档 | 路径 | 用途 |
|------|------|------|
| **产品简报** | `_bmad-output/planning-artifacts/product-brief-ziwei-2026-02-13.md` | 愿景、问题与场景、用户、成功指标、范围与边界 |
| **平台规划梳理** | `_bmad-output/planning-artifacts/紫微平台规划梳理.md` | 平台复合体、子模块职责、缺口与下一步 |
| **技术方案** | `docs/open/technical/紫微智能体治理基础设施-技术方案.md` | 能力细节、接口、天枢/谛听/太白职责、DID/链/协议 |

实现就绪与 Epic 覆盖校验时，以**产品简报 + 技术方案**提取的 FR/NFR 及 **platform-epics-and-submodule-mapping** 为准。

---

## 2. 范围摘要（与产品简报一致）

- **定位**：紫微为企业级 AI 智能体的**治理基础设施**；平台为**天枢 + 谛听 + 太白**复合体，功能下沉至各子模块。
- **MVP 范围**：身份与 DID、通信与 Matrix、策略与审批、审计与存证、企业 IM 集成、太白接入规范、链与 DID 贯通（E-P1～E-P7）；详见 `platform-epics-and-submodule-mapping.md`。
- **边界**：子项目（diting、tianshu、taibai）各有独立 PRD/架构/Epics，根 PRD 不替代子项目 PRD，仅定义平台级能力与映射。

---

*本文件为 BMAD 偏差纠正方案（2026-02-16）D1 交付物；与 correct-course 及实现就绪报告建议一致。*
