import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
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
  /** Greeting language, e.g. 'zh', 'en', 'ja'. Omit to let the model choose. */
  language?: string
  /** Custom greeting phrases; one is chosen per session. Use {name} for the user's name. */
  greetings?: string[]
  /** File name (inside the dsh home) where the remembered name is stored. */
  nameFile?: string
}

/** Schemastery validation for {@link Config}; invalid values fail plugin load. */
export const Config: z<Config> = z.object({
  language: z.string(),
  greetings: z.array(String),
  nameFile: z.string(),
})

/** Configuration with defaults applied. */
interface ResolvedConfig {
  language?: string
  greetings: string[]
  nameFile: string
}

/** Durable store content (name + greeting rotation position). */
interface Store {
  name?: string
  greetingIndex?: number
}

/** Read the store; undefined when nothing is stored yet. */
function readStore(file: string): Store | undefined {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Store
  } catch {
    return undefined
  }
}

/** Persist the store. */
function writeStore(file: string, data: Store): void {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(data, null, 2))
}

/**
 * Build the greeting instruction injected on the first step of a new session.
 * With a stored name and a configured pool, the exact phrase is chosen by
 * rotation; otherwise the model composes a varied greeting in the configured
 * language.
 */
function greetingInstruction(userName: string | undefined, greetingIndex: number, config: ResolvedConfig): string {
  const languagePhrase = config.language ? ` in ${config.language}` : ''
  if (userName === undefined) {
    return `You are opening a new session. Start with a short, friendly greeting${languagePhrase}, then ask the user for their name. Once they tell you, call the \`remember_name\` tool to store it for future sessions.`
  }
  if (config.greetings.length > 0) {
    const template = config.greetings[greetingIndex % config.greetings.length]!
    const greeting = template.replaceAll('{name}', userName)
    return `Open this session by delivering exactly this greeting to the user ${userName}: "${greeting}"`
  }
  return `You are opening a new session for the user ${userName}. Start with a short, friendly greeting addressed to ${userName}${languagePhrase}. Vary the wording so it is never identical to a previous greeting.`
}

export function apply(ctx: Context, config: Config): void {
  const resolved: ResolvedConfig = {
    ...(config.language !== undefined ? { language: config.language } : {}),
    greetings: config.greetings ?? [],
    nameFile: config.nameFile ?? 'greeter-name.json',
  }
  const storeFile = join(resolveDshHome(), resolved.nameFile)

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
      writeStore(storeFile, { ...readStore(storeFile), name: args.name })
      return `Saved the user's name as ${args.name}.`
    },
  }))

  // Greet once per session: on the first model step of a new session, inject
  // a greeting instruction so the model opens with the configured wording.
  const greeted = new WeakSet<Agent>()
  ctx.on('agent/pre-step', async ({ agent, step }, next): Promise<PreStepDecision> => {
    const decision = await next()
    if (decision.kind === 'reject' || step !== 1) return decision
    if (greeted.has(agent)) return decision
    greeted.add(agent)

    const store = readStore(storeFile)
    const userName = store?.name
    const greetingIndex = store?.greetingIndex ?? 0
    if (userName !== undefined && resolved.greetings.length > 0) {
      // Advance the rotation so the next session uses a different phrase.
      writeStore(storeFile, { ...store, name: userName, greetingIndex: (greetingIndex + 1) % resolved.greetings.length })
    }
    const text = greetingInstruction(userName, greetingIndex, resolved)
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
