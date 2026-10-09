# Feature Specification: ChatGPT Exporter

**Feature ID:** 006
**Status:** in progress (Screenshot pending; see extension/README.md)
**Target milestone:** M3

## Goal

Replace the working Tampermonkey-dependent ChatGPT exporter with a focused,
local-first extension workflow.

## Supported actions

The first release MUST provide:

- Setting;
- Copy Text;
- Screenshot;
- Markdown;
- HTML;
- JSON;
- Export All.

## Requirements

1. The adapter MUST isolate ChatGPT DOM selectors from serializers.
2. Serializers MUST be pure, deterministic modules.
3. Markdown, HTML, JSON, and text exports MUST preserve message order and role.
4. HTML output MUST escape untrusted conversation content.
5. Filenames MUST be stable, sanitized, and derived from title plus identifier.
6. Screenshot export MUST report unavailable capture permissions clearly.
7. Export All MUST process items one at a time with progress and per-item
   results.
8. A disappearing or changed conversation MUST not abort unrelated exports.
9. Conversation content MUST remain local and MUST NOT be sent to telemetry.
10. The UI MUST expose actionable failure states instead of silent timeouts.

## Acceptance criteria

- All seven actions appear on a synthetic fixture conversation.
- Each output format passes deterministic fixture assertions.
- Export All continues after one isolated stale/unavailable item.
- The exporter runs only on supported ChatGPT origins.
- A disposable-profile browser test covers the complete visible workflow.

