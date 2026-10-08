"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientFrame = exports.companionSession = exports.sessionDoing = exports.activityState = exports.CONVERSATION_WINDOW = exports.MAX_TURN_CHARS = exports.conversationTurn = exports.promptOutcome = exports.promptDecision = exports.pendingPrompt = exports.questionSpec = exports.questionOption = exports.promptKind = exports.decidingHook = exports.AUTH_CONTEXT = exports.PROTOCOL_VERSION = void 0;
exports.parseClientFrame = parseClientFrame;
const zod_1 = require("zod");
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
exports.PROTOCOL_VERSION = 1;
/**
 * Prepended to the bytes a device signs, so a signature made for this protocol
 * cannot be replayed as anything else. Both ends must agree on it exactly, which
 * is why it lives here rather than in either of them.
 *
 * The signed message is `${AUTH_CONTEXT}\n${nonce}\n${deviceId}`.
 */
exports.AUTH_CONTEXT = "claude-term/companion/auth/v1";
/** Which hook is holding a prompt open. The two settings hooks differ in what
 *  they can answer: only PreToolUse's reason reaches the model
 *  (docs/companion-hook-protocol.md). `mod` is claude-term's own Claude Code mod,
 *  which can answer anything and has no time limit. */
exports.decidingHook = zod_1.z.enum(["PermissionRequest", "PreToolUse", "mod"]);
exports.promptKind = zod_1.z.enum(["permission", "question", "plan"]);
exports.questionOption = zod_1.z.object({
    label: zod_1.z.string(),
    description: zod_1.z.string().optional(),
});
exports.questionSpec = zod_1.z.object({
    question: zod_1.z.string(),
    header: zod_1.z.string().optional(),
    options: zod_1.z.array(exports.questionOption),
    multiSelect: zod_1.z.boolean().optional(),
});
/** A prompt the session is blocked on, held open while a device decides. */
exports.pendingPrompt = zod_1.z.object({
    id: zod_1.z.string(),
    tabId: zod_1.z.string(),
    sessionId: zod_1.z.string().nullable(),
    hook: exports.decidingHook,
    kind: exports.promptKind,
    toolName: zod_1.z.string(),
    /** one line naming what is being asked about (the command, the file, …) */
    summary: zod_1.z.string(),
    questions: zod_1.z.array(exports.questionSpec).nullable(),
    plan: zod_1.z.string().nullable(),
    planFilePath: zod_1.z.string().nullable(),
    /** the untouched `tool_input`, for anything the fields above don't cover */
    toolInput: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    /** a rule that would stop this being asked again, when one is safe to offer */
    suggestedRule: zod_1.z.string().nullable(),
    createdAt: zod_1.z.number(),
    /** a permission asked again after its first ask went unanswered for too long;
     *  allow runs the call once, nothing is remembered */
    reasked: zod_1.z.boolean().optional(),
});
exports.promptDecision = zod_1.z.discriminatedUnion("kind", [
    /** approve — the tool runs. `remember` also writes the suggested rule, so
     *  Claude Code stops asking; ignored when the prompt offered none. */
    zod_1.z.object({ kind: zod_1.z.literal("allow"), remember: zod_1.z.boolean().optional() }),
    /** reject. `reason` only reaches the model on a PreToolUse-parked prompt. */
    zod_1.z.object({ kind: zod_1.z.literal("deny"), reason: zod_1.z.string().optional() }),
    /** answer a question, or send plan feedback — `text` reaches the model */
    zod_1.z.object({ kind: zod_1.z.literal("respond"), text: zod_1.z.string() }),
    /** stop holding it; the terminal's own dialog is already on screen */
    zod_1.z.object({ kind: zod_1.z.literal("release") }),
]);
/** Why a prompt stopped being pending — devices use this to retract their card. */
exports.promptOutcome = zod_1.z.enum([
    "answered",
    /** handed back to the terminal, by a device or because none was listening */
    "released",
    /** the user answered in the terminal: the CLI closed the connection */
    "terminal",
    /** the host is shutting down */
    "shutdown",
    /** unanswered too long; a permission comes back as a new, reasked prompt */
    "expired",
]);
/** One content block of one transcript record — see transcript-search.ts. */
exports.conversationTurn = zod_1.z.object({
    role: zod_1.z.enum(["user", "claude", "tool", "thinking"]),
    /** set when the turn is a tool call */
    tool: zod_1.z.string().optional(),
    time: zod_1.z.string().nullable(),
    text: zod_1.z.string(),
});
/** A turn longer than this is cut — a phone is not the place to read 200KB. */
exports.MAX_TURN_CHARS = 4_000;
/** How much history a fresh subscription is handed. */
exports.CONVERSATION_WINDOW = 40;
exports.activityState = zod_1.z.enum([
    "starting",
    "busy",
    "idle",
    "needs-attention",
    "ended",
    "exited",
]);
/** What a busy session is doing right now, as its terminal shows it. */
exports.sessionDoing = zod_1.z.object({
    /** the spinner's word ("Tinkering"), or the text drawn in its place */
    word: zod_1.z.string(),
    /** requesting, thinking, responding, tool-input, tool-use — kept open for new ones */
    mode: zod_1.z.string(),
    /** the tool running now, and what it runs on (the command, the file, …) */
    tool: zod_1.z.string().nullable(),
    detail: zod_1.z.string().nullable(),
    /** tool calls finished so far this turn */
    steps: zod_1.z.number(),
});
/** One of the host's tabs, as a phone needs to see it. */
exports.companionSession = zod_1.z.object({
    tabId: zod_1.z.string(),
    sessionId: zod_1.z.string().nullable(),
    /** the folder the tab lives in, for a list row */
    folder: zod_1.z.string(),
    cwd: zod_1.z.string(),
    activity: exports.activityState,
    busySince: zod_1.z.number().nullable(),
    claudeActive: zod_1.z.boolean(),
    branch: zod_1.z.string().nullable(),
    model: zod_1.z.string().nullable(),
    /** ids of prompts this session is currently blocked on */
    pendingPromptIds: zod_1.z.array(zod_1.z.string()),
    /** while a turn runs; absent otherwise, and from hosts older than 0.6 */
    doing: exports.sessionDoing.nullable().optional(),
});
// ---------------------------------------------------------------- device → host
exports.clientFrame = zod_1.z.discriminatedUnion("type", [
    /** Enrol using a code the host is showing right now. */
    zod_1.z.object({
        type: zod_1.z.literal("pair"),
        protocol: zod_1.z.number(),
        deviceId: zod_1.z.string().min(8).max(128),
        name: zod_1.z.string().min(1).max(64),
        /** Ed25519 public key, base64 SPKI */
        publicKey: zod_1.z.string().min(1).max(512),
        code: zod_1.z.string().min(1).max(32),
        /** proof the device holds the matching private key */
        signature: zod_1.z.string().min(1).max(512),
        pushToken: zod_1.z.string().max(256).optional(),
    }),
    /** Answer the host's challenge with a key it already trusts. */
    zod_1.z.object({
        type: zod_1.z.literal("auth"),
        protocol: zod_1.z.number(),
        deviceId: zod_1.z.string().min(8).max(128),
        signature: zod_1.z.string().min(1).max(512),
        pushToken: zod_1.z.string().max(256).optional(),
    }),
    zod_1.z.object({ type: zod_1.z.literal("sessions") }),
    /** Follow a session's conversation. One session at a time, per device. */
    zod_1.z.object({ type: zod_1.z.literal("subscribe"), tabId: zod_1.z.string() }),
    zod_1.z.object({ type: zod_1.z.literal("unsubscribe") }),
    /** What is on that tab's screen right now — a snapshot, not a stream. */
    zod_1.z.object({ type: zod_1.z.literal("screen"), tabId: zod_1.z.string() }),
    zod_1.z.object({
        type: zod_1.z.literal("decide"),
        promptId: zod_1.z.string(),
        decision: exports.promptDecision,
    }),
    /** Send a new prompt to a session's prompt box. */
    zod_1.z.object({
        type: zod_1.z.literal("submit"),
        tabId: zod_1.z.string(),
        text: zod_1.z.string().min(1).max(32_000),
    }),
    /** Lets the host suppress a push for a session the device is already looking at. */
    zod_1.z.object({
        type: zod_1.z.literal("appState"),
        foreground: zod_1.z.boolean(),
        tabId: zod_1.z.string().nullable().optional(),
    }),
    zod_1.z.object({ type: zod_1.z.literal("ping") }),
]);
/** Parse an untrusted frame. Returns null rather than throwing on anything odd. */
function parseClientFrame(raw) {
    if (raw.length > 64_000)
        return null;
    try {
        const result = exports.clientFrame.safeParse(JSON.parse(raw));
        return result.success ? result.data : null;
    }
    catch {
        return null;
    }
}
