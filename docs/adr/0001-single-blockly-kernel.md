# ADR-0001：单一积木内核

- 状态：已接受
- 日期：2026-08-07

使用 `scratch-blocks` 2.1.x 提供儿童化积木编辑能力，并使用其声明的 Blockly 12 依赖。项目不再额外安装另一套 Blockly，不引入 Scratch VM。所有积木 API 只允许在 `@kids-code/block-adapter` 内使用。
