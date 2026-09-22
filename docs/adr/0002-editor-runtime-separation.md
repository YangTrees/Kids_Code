# ADR-0002：编辑态与运行态分离

- 状态：已接受
- 日期：2026-08-07

编辑器保存可持久化的 ProjectModel。运行时只能读取运行前生成的深只读快照，并维护独立 RuntimeModel。停止时丢弃 RuntimeModel，由 ProjectModel 重建舞台。
