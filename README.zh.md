# dsh-plugin-greeter

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）插件：每次会话开始时向你问候，并记住你的名字，让每次问候都更贴心。

**中文** | [English](README.md)

## 功能特性

- 👋 **每次会话都问候** — 助手以友好的问候语开场，且**每次话术都不同**（由模型生成变化措辞，不会逐字重复）。
- 🧑 **第一次先问你名字** — 首个会话会询问你的名字，并通过 `remember_name` 工具持久化保存。
- 💾 **跨会话记住你** — 名字存储在 dsh home（`~/.dsh/greeter-name.json`），之后的会话都会**按名字**问候你。

## 安装

发布到 npm 后：

```sh
dsh plugin --profile web add dsh-plugin-greeter
```

该包声明了 `dsh.bundle.patch`，因此 `dsh plugin add` 会自动将其识别为 bundle 补丁层并加入 profile 的补丁栈——无需手动配置。

## 开发调试（本地，无需发布）

在 DeepSeek Harness 仓库中，把它作为 overlay 挂到任意 profile：

```sh
pnpm dsh web --patch /path/to/dsh-plugin-greeter/cordis.patch.yml
```

或者迭代开发时直接把 patch 指向本地源码：

```yaml
- insert:
    - id: greeter
      name: '/absolute/path/to/dsh-plugin-greeter/src/index.ts'
```

> 在 Windows 上，`name` 必须使用 `file:///` URL（盘符路径不是合法的 ESM 模块说明符）。

## 构建

```sh
npm install
npm run build    # 生成 lib/（JS + 类型声明）
```

## 工作原理

- 通过 `defineTool` 注册 `remember_name` 工具；用户一说出名字，模型就调用它，插件把名字写入 `~/.dsh/greeter-name.json`。
- 监听 `agent/pre-step` 瀑布，在每次新会话的第一个模型步骤注入问候指令（上下文注入）。模型据此用变化、个性化的措辞开场。
- 每次会话都会重新读取名字文件，因此直接编辑或删除它即可立即生效。

### 可选配置

```yaml
- insert:
    - id: greeter
      name: 'dsh-plugin-greeter'
      config:
        nameFile: 'my-name.json'   # 自定义 dsh home 内的存储文件名
```

## 发布

```sh
npm login
npm publish
```

然后在 GitHub 仓库添加 **`dsh-plugin`** topic，方便社区发现。

## 许可证

MIT
