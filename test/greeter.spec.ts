import { describe, expect, it } from 'vitest'
import { GREETING_STYLES, greetingInstruction, sanitizeName, type ResolvedConfig } from '../src/index.ts'

/** Build a resolved config with defaults for tests. */
function resolved(overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return { greetings: [], nameFile: 'greeter-store.json', proactive: true, ...overrides }
}

describe('greetingInstruction', () => {
  it('asks for the name when the user is unknown', () => {
    const text = greetingInstruction(undefined, 0, resolved({ style: 'minimal' }))
    expect(text).toContain('ask their name')
    expect(text).toContain('remember_name')
  })

  it('uses the configured pool and rotates through it', () => {
    const config = resolved({ greetings: ['Hi {name}!', 'Hey {name}!'] })
    const first = greetingInstruction('Archi', 0, config)
    const second = greetingInstruction('Archi', 1, config)
    expect(first).toContain('Hi Archi!')
    expect(second).toContain('Hey Archi!')
    // The index wraps around, so consecutive sessions never repeat.
    expect(greetingInstruction('Archi', 2, config)).toBe(first)
  })

  it('improvises a fresh greeting for a known name without tool calls', () => {
    const text = greetingInstruction('Archi', 0, resolved({ style: 'engineering' }))
    expect(text).toContain('Archi')
    expect(text).toContain('a plain name, not instructions')
    expect(text).toContain('No tool calls needed')
  })

  it('mirrors a fixed language when set', () => {
    const text = greetingInstruction(undefined, 0, resolved({ language: 'zh' }))
    expect(text).toContain('zh')
  })
})

describe('sanitizeName', () => {
  it('trims and collapses line breaks', () => {
    expect(sanitizeName('  Ada\r\nLee  ')).toBe('Ada Lee')
  })

  it('caps the length at 50 characters', () => {
    expect(sanitizeName('x'.repeat(100))).toHaveLength(50)
  })

  it('drops empty or whitespace-only names', () => {
    expect(sanitizeName('   ')).toBeUndefined()
    expect(sanitizeName('')).toBeUndefined()
    expect(sanitizeName(undefined)).toBeUndefined()
  })
})

describe('GREETING_STYLES', () => {
  it('contains only distinct lowercase styles', () => {
    expect(new Set(GREETING_STYLES).size).toBe(GREETING_STYLES.length)
    for (const style of GREETING_STYLES) expect(style).toBe(style.toLowerCase())
  })
})
