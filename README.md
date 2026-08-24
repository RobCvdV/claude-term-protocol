# claude-term-protocol

The wire protocol between [claude-term](https://github.com/RobCvdV/claude-term)
and its mobile companion, defined once so the two ends cannot drift apart.

Types are **inferred from zod schemas** rather than written alongside them, so
validation and TypeScript are the same statement. Both ends parse untrusted
frames with `parseClientFrame`, which returns `null` rather than throwing.

```ts
import { parseClientFrame, PROTOCOL_VERSION } from 'claude-term-protocol'

const frame = parseClientFrame(raw)
if (!frame) return // not something we recognise
```

## Consuming it

Pinned to a tag, since a protocol change should be a deliberate move on both
sides:

```json
{ "dependencies": { "claude-term-protocol": "github:RobCvdV/claude-term-protocol#v0.1.0" } }
```

`zod` is a peer dependency — the host and the app each bring their own.

## Changing it

`PROTOCOL_VERSION` is checked on connect and a mismatch is refused, so bump it
for anything a peer could not have understood before. Adding an optional field,
or a new frame type a peer can ignore, does not need a bump.
