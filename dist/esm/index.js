import { z } from 'zod';
/**
 * Everything on the wire between the host and a companion device, defined once.
 * Types are inferred from the schemas so validation and TypeScript cannot drift
 * apart — the previous companion app hand-maintained the same shapes in three
 * places and validated none of them.
 *
 * Deliberately free of app imports so this file can be lifted into its own
 * package when the mobile app arrives.
 */
/** Bumped when a change is not backwards compatible; the host refuses mismatches. */
export const PROTOCOL_VERSION = 1;
/**
 * Prepended to the bytes a device signs, so a signature made for this protocol
 * cannot be replayed as anything else. Both ends must agree on it exactly, which
 * is why it lives here rather than in either of them.
 *
 * The signed message is `${AUTH_CONTEXT}\n${nonce}\n${deviceId}`.
 */
export const AUTH_CONTEXT = 'claude-term/companion/auth/v1';
/** Which hook is holding a prompt open. The two settings hooks differ in what
 *  they can answer: only PreToolUse's reason reaches the model
 *  (docs/companion-hook-protocol.md). `mod` is claude-term's own Claude Code mod,
 *  which can answer anything and has no time limit. */
export const decidingHook = z.enum(['PermissionRequest', 'PreToolUse', 'mod']);
export const promptKind = z.enum(['permission', 'question', 'plan']);
export const questionOption = z.object({
    label: z.string(),
    description: z.string().optional()
});
export const questionSpec = z.object({
    question: z.string(),
    header: z.string().optional(),
    options: z.array(questionOption),
    multiSelect: z.boolean().optional()
});
/** A prompt the session is blocked on, held open while a device decides. */
export const pendingPrompt = z.object({
    id: z.string(),
    tabId: z.string(),
    sessionId: z.string().nullable(),
    hook: decidingHook,
    kind: promptKind,
    toolName: z.string(),
    /** one line naming what is being asked about (the command, the file, …) */
    summary: z.string(),
    questions: z.array(questionSpec).nullable(),
    plan: z.string().nullable(),
    planFilePath: z.string().nullable(),
    /** the untouched `tool_input`, for anything the fields above don't cover */
    toolInput: z.record(z.string(), z.unknown()),
    /** a rule that would stop this being asked again, when one is safe to offer */
    suggestedRule: z.string().nullable(),
    createdAt: z.number(),
    /** a permission asked again after its first ask went unanswered for too long;
     *  allow runs the call once, nothing is remembered */
    reasked: z.boolean().optional()
});
export const promptDecision = z.discriminatedUnion('kind', [
    /** approve — the tool runs. `remember` also writes the suggested rule, so
     *  Claude Code stops asking; ignored when the prompt offered none. */
    z.object({ kind: z.literal('allow'), remember: z.boolean().optional() }),
    /** reject. `reason` only reaches the model on a PreToolUse-parked prompt. */
    z.object({ kind: z.literal('deny'), reason: z.string().optional() }),
    /** answer a question, or send plan feedback — `text` reaches the model */
    z.object({ kind: z.literal('respond'), text: z.string() }),
    /** stop holding it; the terminal's own dialog is already on screen */
    z.object({ kind: z.literal('release') })
]);
/** Why a prompt stopped being pending — devices use this to retract their card. */
export const promptOutcome = z.enum([
    'answered',
    /** handed back to the terminal, by a device or because none was listening */
    'released',
    /** the user answered in the terminal: the CLI closed the connection */
    'terminal',
    /** the host is shutting down */
    'shutdown',
    /** unanswered too long; a permission comes back as a new, reasked prompt */
    'expired'
]);
/** One content block of one transcript record — see transcript-search.ts. */
export const conversationTurn = z.object({
    role: z.enum(['user', 'claude', 'tool', 'thinking']),
    /** set when the turn is a tool call */
    tool: z.string().optional(),
    time: z.string().nullable(),
    text: z.string()
});
/** A turn longer than this is cut — a phone is not the place to read 200KB. */
export const MAX_TURN_CHARS = 4_000;
/** How much history a fresh subscription is handed. */
export const CONVERSATION_WINDOW = 40;
export const activityState = z.enum([
    'starting',
    'busy',
    'idle',
    'needs-attention',
    'ended',
    'exited'
]);
/** One of the host's tabs, as a phone needs to see it. */
export const companionSession = z.object({
    tabId: z.string(),
    sessionId: z.string().nullable(),
    /** the folder the tab lives in, for a list row */
    folder: z.string(),
    cwd: z.string(),
    activity: activityState,
    busySince: z.number().nullable(),
    claudeActive: z.boolean(),
    branch: z.string().nullable(),
    model: z.string().nullable(),
    /** ids of prompts this session is currently blocked on */
    pendingPromptIds: z.array(z.string())
});
// ---------------------------------------------------------------- device → host
export const clientFrame = z.discriminatedUnion('type', [
    /** Enrol using a code the host is showing right now. */
    z.object({
        type: z.literal('pair'),
        protocol: z.number(),
        deviceId: z.string().min(8).max(128),
        name: z.string().min(1).max(64),
        /** Ed25519 public key, base64 SPKI */
        publicKey: z.string().min(1).max(512),
        code: z.string().min(1).max(32),
        /** proof the device holds the matching private key */
        signature: z.string().min(1).max(512),
        pushToken: z.string().max(256).optional()
    }),
    /** Answer the host's challenge with a key it already trusts. */
    z.object({
        type: z.literal('auth'),
        protocol: z.number(),
        deviceId: z.string().min(8).max(128),
        signature: z.string().min(1).max(512),
        pushToken: z.string().max(256).optional()
    }),
    z.object({ type: z.literal('sessions') }),
    /** Follow a session's conversation. One session at a time, per device. */
    z.object({ type: z.literal('subscribe'), tabId: z.string() }),
    z.object({ type: z.literal('unsubscribe') }),
    /** What is on that tab's screen right now — a snapshot, not a stream. */
    z.object({ type: z.literal('screen'), tabId: z.string() }),
    z.object({ type: z.literal('decide'), promptId: z.string(), decision: promptDecision }),
    /** Send a new prompt to a session's prompt box. */
    z.object({ type: z.literal('submit'), tabId: z.string(), text: z.string().min(1).max(32_000) }),
    /** Lets the host suppress a push for a session the device is already looking at. */
    z.object({
        type: z.literal('appState'),
        foreground: z.boolean(),
        tabId: z.string().nullable().optional()
    }),
    z.object({ type: z.literal('ping') })
]);
/** Parse an untrusted frame. Returns null rather than throwing on anything odd. */
export function parseClientFrame(raw) {
    if (raw.length > 64_000)
        return null;
    try {
        const result = clientFrame.safeParse(JSON.parse(raw));
        return result.success ? result.data : null;
    }
    catch {
        return null;
    }
}
