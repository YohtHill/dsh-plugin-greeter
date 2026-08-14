# dsh-plugin-greeter

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）插件：每次会话开始时向你问候，并记住你的名字，让每次问候都更贴心。

**中文** | [English](README.md)

## 功能特性

- 👋 **每次会话都问候** — 每次都用**全新措辞**、**跟随你使用的语言**（模型即兴生成，不会重复）。
- 🧑 **第一次先问你名字** — 首个会话会询问你的名字，并通过 `remember_name` 工具持久化保存。
- 💾 **跨会话记住你** — 名字存储在 dsh home（`~/.dsh/greeter-name.json`），之后的会话都会**按名字**问候你。

## 安装

### 从 npm 安装

```sh
dsh plugin --profile web add dsh-plugin-greeter
```

该包声明了 `dsh.bundle.patch`，因此 `dsh plugin add` 会自动将其识别为 bundle 补丁层并加入 profile 的补丁栈——无需手动配置。

### 从源码安装（GitHub 克隆）

仓库自带编译产物 `lib/`，克隆后可直接使用，无需本地构建：

```sh
git clone https://github.com/YohtHill/dsh-plugin-greeter.git
cd dsh-plugin-greeter
dsh plugin --profile web add .
```

> dsh 的核心包仍是 pre-1.0（`rc`）。如果你要自己构建源码，请用 `npm install --legacy-peer-deps`（npm 默认的 peer 解析会拒绝 `rc` 版本区间），然后 `npm run build` 再添加。

## 使用方法

安装后**重启 dsh**，然后：

1. **新建会话**。
2. 随便发一条消息（比如 `hi`）。
3. 模型会用你的语言、每次不同的语气问候你；**第一次会话会主动问你的名字**，并通过 `remember_name` 工具记住。
4. 之后的会话都会**按名字**问候你。

> ⚠️ 问候出现在**新会话的第一条消息**时——不是打开应用就自动弹出。如果没看到问候，确认是否新建了会话并发过消息。

验证插件是否已加载：打开 **设置 → 插件 → 插件列表**，搜索 `greeter`，看到条目显示 **已启用** 即可。

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
npm install --legacy-peer-deps   # dsh 核心包是 pre-1.0 (rc)，npm 需要这个参数
npm run build                    # 生成 lib/（JS + 类型声明）
```

`npm publish`（或 `npm pack`）会通过 `prepack` 自动重新构建。

## 工作原理

- 通过 `defineTool` 注册 `remember_name` 工具；用户一说出名字，模型就调用它，插件把名字写入存储文件。
- 监听 `agent/pre-step` 瀑布，在每次新会话的第一个模型步骤注入问候指令（上下文注入）。每次会话会随机抽取一个**语气提示**（俏皮、真诚、简洁等），因此即使输入完全相同，问候语也会不同。
- 每次会话都会重新读取存储文件，因此直接编辑或删除它即可立即生效。

### 可选配置

无需任何配置——默认是**自适应**的（跟随你的语言、每次即兴生成全新问候）。如需覆盖，编辑 **profile 补丁文件**（`web` profile 是 `~/.dsh/profiles/web/cordis.patch.yml`），加上 `config` 块：

```yaml
- insert:
    - id: greeter
      name: 'dsh-plugin-greeter'
      config:
        style: engineering        # 问候风格：minimal | warm | practical | engineering | playful | calm
        language: zh              # 固定问候语言（省略则跟随用户）
        greetings:                # 可选自定义问候语池（每次会话选一句）
          - '早上好，{name}！今天想让我帮你做什么？'
          - '嗨，{name}，欢迎回来！👋'
        nameFile: 'my-name.json'  # 自定义 dsh home 内的存储文件名
```

默认问候是**自适应**的：模型每次即兴生成自然、不重样的问候，**跟随你输入的语言**（你打英文，问候就是英文），且每次都随机抽取一个**语气**。以下配置项是可选的覆盖：

- `style` — 固定问候风格：`minimal`（简洁干净）、`warm`（热情洋溢）、`practical`（务实直接）、`engineering`（极简、技术感、build log 风）、`playful`（俏皮）、`calm`（平和）。省略则每次随机。
- `language` — 强制固定问候语言（如 `zh`、`en`、`ja`），而非跟随用户。
- `greetings` — 显式的问候语池；插件**轮换**选用，保证连续会话不重复。用 `{name}` 作为用户名的占位符。
- `nameFile` — 自定义 dsh home 内的存储文件名。

配置会通过 Schemastery schema 校验——配置非法会**加载时立即报错**，而不是被静默忽略。

## 兼容性

本插件钩住了 dsh 的内部 agent 管道（`agent/pre-step` 上下文注入与消息 source 格式）。已在 dsh `0.1.0-rc.5` 一代的版本上验证；如果 dsh 改动这些内部接口，插件可能停止问候，直到更新。插件本身**不捆绑任何依赖**——它直接使用 dsh 自带的能力，安装不会给你的 profile 增加任何依赖树负担。

## 发布

```sh
npm login
npm publish
```

然后在 GitHub 仓库添加 **`dsh-plugin`** topic，方便社区发现。

## 许可证

MIT
