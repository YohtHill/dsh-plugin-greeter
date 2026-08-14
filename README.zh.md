# dsh-plugin-greeter

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）插件：每次会话开始时向你问候，并记住你的名字，让每次问候都更贴心。

**中文** | [English](README.md)

## 功能特性

- 👋 **每次会话都问候** — 每次都用**全新措辞**、**跟随你使用的语言**（模型即兴生成，不会重复）。
- 🧑 **第一次先问你名字** — 首个会话会询问你的名字，并通过 `remember_name` 工具持久化保存。
- 💾 **跨会话记住你** — 名字存储在 dsh home（`~/.dsh/greeter-store.json`），之后的会话都会**按名字**问候你。
- ✨ **主动问候** — 新建会话时 agent 会**立刻主动跟你打招呼**，不用先发消息。（设置 `proactive: false` 可改为只在收到你的消息后才问候。）
- 🎨 **说一句话就能换风格** — 说 *"以后用工程风问候我"* 或 *"改用俏皮风格"*，插件会自动帮你改好——不用改配置、不用重启。

## 演示

**新建会话立即主动问候** — 打开新会话，agent 立刻主动跟你打招呼，不用先打字：

![会话开始时的问候](docs/demo-greeting.gif)

**说一句话就能换风格** — 说 *"以后用俏皮的风格问候我"*，插件自动帮你保存：

![聊天切换风格](docs/demo-switch-style.png)

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

1. **新建会话**——agent 会立刻主动跟你打招呼，不用先打字。
2. （可选）再发消息，agent 从那里继续。
3. **第一次会话会主动问你的名字**，并通过 `remember_name` 工具记住；之后的会话都会**按名字**问候你。

> 主动问候每次新建会话会消耗一次模型调用。如果希望只在收到你的消息后才问候，设 `proactive: false`（见可选配置）。

**切换风格就是聊一句话的事。** 在任意会话里说：

> *"以后用俏皮的风格问候我"* / *"greet me like an engineer from now on"* / *"回到随机风格吧"*

插件会调用它的 `set_greeting_style` 工具保存你的选择，从**下一个**会话生效。可选风格：`minimal`、`warm`、`practical`、`engineering`、`playful`、`calm`，或 `random`（随机）。

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

- 通过 `defineTool` 注册 `remember_name` 工具；用户一说出名字，模型就调用它，插件把名字写入存储文件。名字会经过清洗（去掉换行与引号、最长 50 字符），永远不会被当作指令执行。
- 监听 `agent/pre-step` 瀑布，在每次新会话的第一个模型步骤注入问候指令（上下文注入）。每次会话会随机抽取一个**语气提示**（俏皮、真诚、简洁等），因此即使输入完全相同，问候语也会不同。
- 每次会话都会重新读取存储文件，因此直接编辑或删除它即可立即生效。从 `0.1.9` 之前的版本升级时，会一次性把 `greeter-name.json` 迁移为 `greeter-store.json`，旧文件保留为 `greeter-name.json.migrated` 备份——确认新问候正常后可自行删除。

### 可选配置

无需任何配置——默认是**自适应**的（跟随你的语言、每次即兴生成全新问候）。最简单的自定义方式就是**直接在聊天里说**（见[使用方法](#使用方法)，插件会替你保存选择）。如果你更习惯改 YAML，编辑 **profile 补丁文件**（`web` profile 是 `~/.dsh/profiles/web/cordis.patch.yml`），加上 `config` 块：

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
- `proactive` — 新建会话时是否立刻主动问候（默认 `true`）；设 `false` 则只在收到你的消息后才问候。

配置会通过 Schemastery schema 校验——配置非法会**加载时立即报错**，而不是被静默忽略。

## 兼容性

本插件钩住了 dsh 的内部 agent 管道（`agent/pre-step` 上下文注入与消息 source 格式）。已在 dsh `0.1.0-rc.6` 一代的版本上验证；如果 dsh 改动这些内部接口，插件可能停止问候，直到更新。插件本身**不捆绑任何依赖**——它直接使用 dsh 自带的能力，安装不会给你的 profile 增加任何依赖树负担。

### 插件 ↔ dsh 版本矩阵

| dsh 版本 | dsh-plugin-greeter |
| --- | --- |
| `0.1.0-rc.6` | ✅ 已验证（当前版本） |
| `0.1.0-rc.5` | ✅ 已验证（`0.1.x` 至 `0.1.8` 各版本） |
| `< 0.1.0-rc.5` | ⚠️ 未测试——rc 系列期间内部接口变动较大 |

### 包管理器说明

- 本仓库**以 npm 为主**：`package-lock.json` 是依赖的唯一事实来源，构建/测试/lint 命令（`npm run build`、`npm test`、`npm run lint`）都基于 npm。安装请用 `npm install --legacy-peer-deps`（dsh peer 依赖是 pre-1.0 的 `rc` 区间，npm 严格解析会拒绝）。
- `pnpm` 仅用于[本地挂载调试](#开发调试本地无需发布)流程——因为 DeepSeek Harness 本体是 pnpm workspace；构建或测试本插件并不需要 pnpm。

## Token 用量与成本

插件唯一固定的模型成本是**主动问候**：每次新会话一次简短生成（约 130 输出 token）。其输入（约 8.6K token）是共享的系统提示词，dsh 会**跨会话前缀缓存**（约 99% 缓存命中），因此按 DeepSeek 缓存输入计价，每次会话的边际成本约 **0.001 美元（约 7 厘人民币）**。日常任务回合的成本与普通 dsh 会话完全相同。

想**零额外开销**？设 `proactive: false`——问候会搭在你第一条消息上，不再单独调用。问候指令本身保持精简（约 50 token）以最小化开销。

## 发布

```sh
npm login
npm publish
```

然后在 GitHub 仓库添加 **`dsh-plugin`** topic，方便社区发现。

## 许可证

MIT
