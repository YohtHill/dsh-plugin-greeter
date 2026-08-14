# dsh-plugin-greeter

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) plugin that greets you at the start of every session:

- **First session** — opens with a friendly greeting and asks for your name.
- **Remembers your name** — once you tell it, the model calls the `remember_name` tool and the name is stored in your dsh home (`~/.dsh/greeter-name.json`).
- **Every session after** — greets you **by name**, with **different wording each time**.

## Install

Once published to npm:

```sh
dsh plugin --profile web add dsh-plugin-greeter
```

The package declares `dsh.bundle.patch`, so `dsh plugin add` recognizes it as a bundle layer and it becomes part of the profile's patch stack automatically.

## Development (local, no publish needed)

From this repository checkout, mount it as an overlay on any profile:

```sh
pnpm dsh web --patch ./path/to/cordis.patch.yml
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

- Registers a `remember_name` tool via `defineTool` that persists the user's name to `~/.dsh/greeter-name.json`.
- Listens on the `agent/pre-step` waterfall and, on the first model step of each new session, injects a greeting instruction (context injection). The model then opens with varied, personal wording.
- Configuration (optional):

  ```yaml
  - insert:
      - id: greeter
        name: 'dsh-plugin-greeter'
        config:
          nameFile: 'my-name.json'   # custom storage filename in the dsh home
  ```

## Publishing

```sh
npm login
npm publish
```

Then add the **`dsh-plugin`** topic to your GitHub repository so the community can find it.

## License

MIT
