# dsh-plugin-greeter

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) plugin that greets you at the start of every session — and remembers your name so every greeting feels personal.

**English** | [中文](README.zh.md)

## Features

- 👋 **Greets every session** — a friendly greeting with **fresh wording every time**, in the **same language you use** (the model improvises, so it never repeats).
- 🧑 **Learns your name** — on the first session it asks for your name, then persists it via the `remember_name` tool.
- 💾 **Remembers across sessions** — the name is stored in your dsh home (`~/.dsh/greeter-name.json`), so later sessions greet you **by name**.

## Install

Once published to npm:

```sh
dsh plugin --profile web add dsh-plugin-greeter
```

The package declares `dsh.bundle.patch`, so `dsh plugin add` recognizes it as a bundle layer and it becomes part of the profile's patch stack automatically — no manual configuration required.

## Development (local, no publish needed)

From a DeepSeek Harness checkout, mount it as an overlay on any profile:

```sh
pnpm dsh web --patch /path/to/dsh-plugin-greeter/cordis.patch.yml
```

Or point the patch at your local source while iterating:

```yaml
- insert:
    - id: greeter
      name: '/absolute/path/to/dsh-plugin-greeter/src/index.ts'
```

> On Windows the `name` must be a `file:///` URL (drive-letter paths are not valid ESM specifiers).

## Build

```sh
npm install
npm run build    # emits lib/ (JS + type declarations)
```

## How it works

- Registers a `remember_name` tool via `defineTool`; the model calls it as soon as the user reveals their name, and the plugin persists it to the store file.
- Listens on the `agent/pre-step` waterfall and, on the first model step of each new session, injects a greeting instruction (context injection). Each session picks a **random tone cue** (playful, sincere, punchy, …), so the greeting differs even for identical user input.
- The store file is read fresh on every session, so editing or deleting it takes effect immediately.

### Configuration (optional)

```yaml
- insert:
    - id: greeter
      name: 'dsh-plugin-greeter'
      config:
        language: zh              # greeting language; omit to let the model choose
        greetings:                # custom phrase pool; one is picked per session
          - '早上好，{name}！今天想让我帮你做什么？'
          - '嗨，{name}，欢迎回来！👋'
          - 'Hey {name} 👋 ready when you are.'
        nameFile: 'my-name.json'  # custom storage filename inside the dsh home
```

By default the greeting is **adaptive**: the model improvises fresh, conversational wording every session and mirrors the language you write in (English in → English greeting). The options below are optional overrides:

- `language` — force a fixed greeting language (e.g. `zh`, `en`, `ja`) instead of mirroring the user.
- `greetings` — an explicit pool of greeting phrases; the plugin **rotates** through them so consecutive sessions never repeat. Use `{name}` as a placeholder for the user's name.
- `nameFile` — custom storage filename inside the dsh home.

The config is validated with a Schemastery schema — invalid values **fail plugin load loudly** instead of being silently ignored.

## Publishing

```sh
npm login
npm publish
```

Then add the **`dsh-plugin`** topic to your GitHub repository so the community can find it.

## License

MIT

