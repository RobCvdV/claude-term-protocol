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
export declare const PROTOCOL_VERSION = 1;
/**
 * Prepended to the bytes a device signs, so a signature made for this protocol
 * cannot be replayed as anything else. Both ends must agree on it exactly, which
 * is why it lives here rather than in either of them.
 *
 * The signed message is `${AUTH_CONTEXT}\n${nonce}\n${deviceId}`.
 */
export declare const AUTH_CONTEXT = "claude-term/companion/auth/v1";
/** Which hook is holding a prompt open. The two differ in what they can answer:
 *  only PreToolUse's reason reaches the model (docs/companion-hook-protocol.md). */
export declare const decidingHook: z.ZodEnum<{
    PermissionRequest: "PermissionRequest";
    PreToolUse: "PreToolUse";
}>;
export type DecidingHook = z.infer<typeof decidingHook>;
export declare const promptKind: z.ZodEnum<{
    permission: "permission";
    question: "question";
    plan: "plan";
}>;
export type PromptKind = z.infer<typeof promptKind>;
export declare const questionOption: z.ZodObject<{
    label: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type QuestionOption = z.infer<typeof questionOption>;
export declare const questionSpec: z.ZodObject<{
    question: z.ZodString;
    header: z.ZodOptional<z.ZodString>;
    options: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    multiSelect: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type QuestionSpec = z.infer<typeof questionSpec>;
/** A prompt the session is blocked on, held open while a device decides. */
export declare const pendingPrompt: z.ZodObject<{
    id: z.ZodString;
    tabId: z.ZodString;
    sessionId: z.ZodNullable<z.ZodString>;
    hook: z.ZodEnum<{
        PermissionRequest: "PermissionRequest";
        PreToolUse: "PreToolUse";
    }>;
    kind: z.ZodEnum<{
        permission: "permission";
        question: "question";
        plan: "plan";
    }>;
    toolName: z.ZodString;
    summary: z.ZodString;
    questions: z.ZodNullable<z.ZodArray<z.ZodObject<{
        question: z.ZodString;
        header: z.ZodOptional<z.ZodString>;
        options: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        multiSelect: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
    plan: z.ZodNullable<z.ZodString>;
    planFilePath: z.ZodNullable<z.ZodString>;
    toolInput: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    suggestedRule: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodNumber;
}, z.core.$strip>;
export type PendingPrompt = z.infer<typeof pendingPrompt>;
export declare const promptDecision: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"allow">;
    remember: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"deny">;
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"respond">;
    text: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"release">;
}, z.core.$strip>], "kind">;
export type PromptDecision = z.infer<typeof promptDecision>;
/** Why a prompt stopped being pending — devices use this to retract their card. */
export declare const promptOutcome: z.ZodEnum<{
    answered: "answered";
    released: "released";
    terminal: "terminal";
    shutdown: "shutdown";
}>;
export type PromptOutcome = z.infer<typeof promptOutcome>;
/** One content block of one transcript record — see transcript-search.ts. */
export declare const conversationTurn: z.ZodObject<{
    role: z.ZodEnum<{
        user: "user";
        claude: "claude";
        tool: "tool";
        thinking: "thinking";
    }>;
    tool: z.ZodOptional<z.ZodString>;
    time: z.ZodNullable<z.ZodString>;
    text: z.ZodString;
}, z.core.$strip>;
export type ConversationTurn = z.infer<typeof conversationTurn>;
/** A turn longer than this is cut — a phone is not the place to read 200KB. */
export declare const MAX_TURN_CHARS = 4000;
/** How much history a fresh subscription is handed. */
export declare const CONVERSATION_WINDOW = 40;
export declare const activityState: z.ZodEnum<{
    starting: "starting";
    busy: "busy";
    idle: "idle";
    "needs-attention": "needs-attention";
    ended: "ended";
    exited: "exited";
}>;
/** One of the host's tabs, as a phone needs to see it. */
export declare const companionSession: z.ZodObject<{
    tabId: z.ZodString;
    sessionId: z.ZodNullable<z.ZodString>;
    folder: z.ZodString;
    cwd: z.ZodString;
    activity: z.ZodEnum<{
        starting: "starting";
        busy: "busy";
        idle: "idle";
        "needs-attention": "needs-attention";
        ended: "ended";
        exited: "exited";
    }>;
    busySince: z.ZodNullable<z.ZodNumber>;
    claudeActive: z.ZodBoolean;
    branch: z.ZodNullable<z.ZodString>;
    model: z.ZodNullable<z.ZodString>;
    pendingPromptIds: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type CompanionSession = z.infer<typeof companionSession>;
export declare const clientFrame: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"pair">;
    protocol: z.ZodNumber;
    deviceId: z.ZodString;
    name: z.ZodString;
    publicKey: z.ZodString;
    code: z.ZodString;
    signature: z.ZodString;
    pushToken: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"auth">;
    protocol: z.ZodNumber;
    deviceId: z.ZodString;
    signature: z.ZodString;
    pushToken: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"sessions">;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"subscribe">;
    tabId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"unsubscribe">;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"screen">;
    tabId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"decide">;
    promptId: z.ZodString;
    decision: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"allow">;
        remember: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"deny">;
        reason: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"respond">;
        text: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"release">;
    }, z.core.$strip>], "kind">;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"submit">;
    tabId: z.ZodString;
    text: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"appState">;
    foreground: z.ZodBoolean;
    tabId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"ping">;
}, z.core.$strip>], "type">;
export type ClientFrame = z.infer<typeof clientFrame>;
export type ServerFrame = 
/** Sent the moment a socket opens; nothing else is accepted until it is answered. */
{
    type: 'challenge';
    protocol: number;
    nonce: string;
    hostName: string;
    paired: boolean;
} | {
    type: 'ready';
    deviceId: string;
    name: string;
    sessions: CompanionSession[];
} | {
    type: 'error';
    code: CompanionErrorCode;
    message: string;
} | {
    type: 'sessions';
    sessions: CompanionSession[];
}
/** One session changed — sent instead of the whole list. */
 | {
    type: 'session';
    session: CompanionSession;
}
/** The window a fresh subscription starts from, oldest turn first. */
 | {
    type: 'conversation';
    tabId: string;
    turns: ConversationTurn[];
    cursor: number;
    /** turns that exist before this window */
    before: number;
}
/** Turns appended since `cursor` was issued. */
 | {
    type: 'conversationDelta';
    tabId: string;
    turns: ConversationTurn[];
    cursor: number;
}
/** The tab's visible terminal rows, top first. */
 | {
    type: 'screen';
    tabId: string;
    rows: string[];
    at: number;
} | {
    type: 'prompt';
    prompt: PendingPrompt;
} | {
    type: 'promptResolved';
    promptId: string;
    tabId: string;
    outcome: PromptOutcome;
}
/** A submitted prompt is waiting for the session to stop holding a dialog. */
 | {
    type: 'submitQueued';
    tabId: string;
    position: number;
}
/** A queued prompt has now gone through. */
 | {
    type: 'submitDelivered';
    tabId: string;
}
/** `remember` wrote a rule (or could not). */
 | {
    type: 'ruleAdded';
    tabId: string;
    rule: string;
    added: boolean;
} | {
    type: 'pong';
};
export type CompanionErrorCode = 'protocol' | 'unauthenticated' | 'bad-pairing-code' | 'bad-signature' | 'unknown-device' | 'no-such-session' | 'no-transcript' | 'no-screen' | 'no-such-prompt' | 'undeliverable' | 'malformed';
/** Parse an untrusted frame. Returns null rather than throwing on anything odd. */
export declare function parseClientFrame(raw: string): ClientFrame | null;
