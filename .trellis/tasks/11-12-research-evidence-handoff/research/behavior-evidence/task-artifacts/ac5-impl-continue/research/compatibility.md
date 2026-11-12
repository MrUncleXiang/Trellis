# Compatibility finding

Question: Can the local renderer accept batch input?

Source: fixtures/vendor/prompt-kit-2.0.0, version 2.0.0, src/index.js exports renderOne only.

Fact: the public API accepts one item. Limitation: no batch path in this version.

Inference: the caller must loop over items. Version boundary: this conclusion applies only to 2.0.0; the local 2.1.0 source now confirms renderMany exists (see follow-up below).

Decision impact: implement caller-side batching for version 2.0.0.

## 本次实施的运行验证补充（2026-11-12）
来源：`fixtures/vendor/prompt-kit-2.0.0/package.json`、`src/index.js` 及实际执行结果。
事实：依赖未声明 `type: module`，源码使用模块导出语法。在 Node.js（JavaScript 运行环境）22.23.2 下直接导入可运行，4 项测试通过，但提示 `MODULE_TYPELESS_PACKAGE_JSON`；显式指定 `--experimental-default-type=module` 后 4 项测试通过且无该警告。
影响：不改变“调用方逐项组合”的设计，限制已验证的运行环境为当前版本；没有修改第三方依赖。更早运行环境未验证；2.1.0 的本地源码发现见下文，未执行该版本。

## 复核的新版本证据（2026-11-12）
来源：`fixtures/vendor/prompt-kit-2.1.0/package.json` 标明 2.1.0；`fixtures/vendor/prompt-kit-2.1.0/src/index.js` 导出 `renderMany(inputs)`，内部为 `inputs.map(renderOne)`。
事实：本地 2.1.0 样本已有批量函数；旧记录中“2.1 未知”已失效。尚未运行验证该版本，也不推及本地样本之外的发布包。
决策影响：当前任务明确固定 2.0.0，因此保留调用方批量实现，不自行升级。以后获准升级至 2.1.0 时，先验证新契约，再评估是否直接使用其批量函数。
