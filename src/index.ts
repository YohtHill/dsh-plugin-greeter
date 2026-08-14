import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { Agent, PreStepDecision } from '@deepseek-ai/dsh-agent'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** Cordis plugin name used by loader diagnostics and context attribution. */
export const name = 'greeter'

/** Services this plugin needs before it can mount. */
export const inject = ['agents', 'tools']

/** Plugin configuration accepted from cordis.yml. */
export interface Config {
  /** File name (inside the dsh home) where the remembered name is stored. */
  nameFile?: string
}

/** Read the remembered name; undefined when nothing is stored yet. */
function readName(file: string): string | undefined {
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as { name?: unknown }
    return typeof raw.name === 'string' && raw.name.trim().length > 0 ? raw.name.trim() : undefined
  } catch {
    return undefined
  }
}

/** Persist the user's name for future sessions. */
function writeName(file: string, userName: string): void {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify({ name: userName }, null, 2))
}

export function apply(ctx: Context, config: Config): void {
  const nameFile = join(resolveDshHome(), config.nameFile ?? 'greeter-name.json')

  // Tool the model calls once the user reveals their name, so the next
  // session can greet them personally.
  ctx.tools.register(defineTool({
    name: 'remember_name',
    description: 'Remember the user\'s name so future sessions can greet them personally. Call this as soon as the user tells you their name.',
    parameters: {
      name: { type: 'string', required: true, description: 'The user\'s name' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      writeName(nameFile, args.name)
      return `Saved the user's name as ${args.name}.`
    },
  }))

  // Greet once per session: on the first model step of a new session, inject
  // a greeting instruction so the model opens with varied wording. The first
  // session asks for the name; later sessions greet by the stored name.
  const greeted = new WeakSet<Agent>()
  ctx.on('agent/pre-step', async ({ agent, step }, next): Promise<PreStepDecision> => {
    const decision = await next()
    if (decision.kind === 'reject' || step !== 1) return decision
    if (greeted.has(agent)) return decision
    greeted.add(agent)

    const userName = readName(nameFile)
    const text = userName
      ? `You are opening a new session for the user ${userName}. Start with a short, friendly greeting addressed to ${userName}. Vary the wording so it is never identical to a previous greeting.`
      : 'You are opening a new session. Start with a short, friendly greeting, then ask the user for their name. Once they tell you, call the `remember_name` tool to store it for future sessions.'
    return {
      kind: 'enter',
      messages: [
        ...decision.messages,
        createUserMessage({
          content: [{ type: 'text', text }],
          source: { kind: 'plugin', plugin: name, form: 'snapshot', sections: [{ name: 'greeter', text }] },
        }),
      ],
    }
  }, { prepend: true })
}
