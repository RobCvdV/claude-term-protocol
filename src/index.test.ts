import { describe, expect, it } from 'vitest'
import {
  clientFrame,
  CONVERSATION_WINDOW,
  MAX_TURN_CHARS,
  parseClientFrame,
  pendingPrompt,
  promptDecision,
  PROTOCOL_VERSION
} from './index'

const auth = {
  type: 'auth',
  protocol: PROTOCOL_VERSION,
  deviceId: 'device-1234',
  signature: 'c2ln'
}

describe('parseClientFrame', () => {
  it('accepts a well-formed frame', () => {
    expect(parseClientFrame(JSON.stringify(auth))).toEqual(auth)
  })

  it('rejects anything it does not recognise, rather than throwing', () => {
    for (const raw of [
      '',
      'not json',
      '{}',
      '[]',
      'null',
      JSON.stringify({ type: 'nope' }),
      JSON.stringify({ ...auth, type: 'auth', deviceId: 'short' })
    ]) {
      expect(parseClientFrame(raw), raw).toBeNull()
    }
  })

  it('refuses a frame too large to be a real one', () => {
    const huge = JSON.stringify({ type: 'submit', tabId: 't1', text: 'x'.repeat(70_000) })
    expect(parseClientFrame(huge)).toBeNull()
  })

  it('drops unknown properties instead of passing them through', () => {
    const parsed = parseClientFrame(JSON.stringify({ ...auth, extra: 'ignored' }))
    expect(parsed).not.toHaveProperty('extra')
  })

  it('bounds the fields an attacker controls', () => {
    const long = (n: number): string => 'a'.repeat(n)
    expect(
      clientFrame.safeParse({ ...auth, deviceId: long(200) }).success
    ).toBe(false)
    expect(clientFrame.safeParse({ type: 'submit', tabId: 't', text: '' }).success).toBe(false)
  })
})

describe('promptDecision', () => {
  it('covers the four things a device can do about a prompt', () => {
    for (const decision of [
      { kind: 'allow' },
      { kind: 'allow', remember: true },
      { kind: 'deny' },
      { kind: 'deny', reason: 'no thanks' },
      { kind: 'respond', text: 'Spaces' },
      { kind: 'release' }
    ]) {
      expect(promptDecision.safeParse(decision).success, JSON.stringify(decision)).toBe(true)
    }
  })

  it('requires the text a response is made of', () => {
    expect(promptDecision.safeParse({ kind: 'respond' }).success).toBe(false)
  })
})

describe('pendingPrompt', () => {
  it('round-trips a permission prompt', () => {
    const prompt = {
      id: 'p1',
      tabId: 't1',
      sessionId: 's1',
      hook: 'PermissionRequest',
      kind: 'permission',
      toolName: 'Bash',
      summary: 'mkdir out',
      questions: null,
      plan: null,
      planFilePath: null,
      toolInput: { command: 'mkdir out' },
      suggestedRule: 'Bash(mkdir *)',
      createdAt: 1
    }
    expect(pendingPrompt.parse(prompt)).toEqual(prompt)
  })

  it('round-trips a permission the mod asked again', () => {
    const prompt = {
      id: 'p2',
      tabId: 't1',
      sessionId: 's1',
      hook: 'mod',
      kind: 'permission',
      toolName: 'Bash',
      summary: 'mkdir out',
      questions: null,
      plan: null,
      planFilePath: null,
      toolInput: { command: 'mkdir out' },
      suggestedRule: null,
      createdAt: 1,
      reasked: true
    }
    expect(pendingPrompt.parse(prompt)).toEqual(prompt)
  })

  it('insists the nullable fields are present, so a client need not guess', () => {
    expect(pendingPrompt.safeParse({ id: 'p1', tabId: 't1' }).success).toBe(false)
  })
})

describe('constants', () => {
  it('are the ones both ends agree on', () => {
    expect(PROTOCOL_VERSION).toBe(1)
    expect(MAX_TURN_CHARS).toBe(4_000)
    expect(CONVERSATION_WINDOW).toBe(40)
  })
})
