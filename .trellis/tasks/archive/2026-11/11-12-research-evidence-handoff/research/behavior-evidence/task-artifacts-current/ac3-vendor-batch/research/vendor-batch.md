# 固定本地副本的批量渲染能力核验

- 日期：2026-11-12。
- 问题：fixtures/vendor/prompt-kit-2.0.0 是否原生支持批量渲染；业务方如何获得逐条结果？
- 范围：仅该隔离项目内的固定副本，未联网，未安装或更新依赖。

## 来源与事实

1. `fixtures/vendor/prompt-kit-2.0.0/package.json:1-5`：名称 prompt-kit，版本 2.0.0，入口 src/index.js。
2. `fixtures/vendor/prompt-kit-2.0.0/README.md:3`：公开接口 renderOne(input) 接受单项，明确声明不支持批量输入。
3. `fixtures/vendor/prompt-kit-2.0.0/src/index.js:1-2`：唯一导出 renderOne，执行 String(input)；注释说明此版本没有数组输入路径。

结论（事实）：该固定副本无原生批量接口。给 renderOne 传入数组不报错，并不表示支持批量语义；它只会把数组整体转成字符串。

## 可重复离线实验

环境：Windows PowerShell；Node.js（JavaScript 运行环境）v22.23.2；工作目录为项目根目录。
执行命令：

```powershell
node --input-type=module -e 'import fs from "node:fs"; const p="fixtures/vendor/prompt-kit-2.0.0/src/index.js"; const source=fs.readFileSync(p,"utf8"); const mod=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64")); const inputs=["alpha","beta"]; console.log(JSON.stringify({node:process.version,exports:Object.keys(mod),single:mod.renderOne("alpha"),directArray:mod.renderOne(inputs),adapted:inputs.map(x=>mod.renderOne(x)),empty:[].map(x=>mod.renderOne(x))},null,2));'
```

观察：导出列表只有 renderOne；单项返回 "alpha"；直接传数组返回 "alpha,beta"；逐项调用返回 ["alpha","beta"]；空批次逐项调用返回 []。

实验以数据模块加载原始源码，避免修改第三方包。它验证函数行为，不验证通过包名或入口文件直接加载的兼容性。package.json 未声明 type，而入口使用模块导出语法；实际业务工程的加载方式需在接入时验证。

## 决策影响、推断与边界

- 建议在业务侧新增很薄的批量适配函数，数组中每项分别调用 renderOne，按原顺序返回数组；不修改第三方源码，不升级版本。
- 推断：当前函数同步且只做字符串转换，顺序遍历足以完成批量语义；没有依据引入并发、队列或异步调度，也不能宣称有性能加速。
- 本结论只适用于上述固定副本，未验证上游发布包、其他版本或联网文档。
- 未确定真实业务接入位置、批次规模及单项失败策略。本轮只交付能力判断与建议方案，这些未知项不影响能力结论；若后续授权开发，应先明确失败时整批中止还是保留逐项错误，并验证实际模块加载方式。
