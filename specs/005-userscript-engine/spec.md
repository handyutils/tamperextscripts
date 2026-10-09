# Feature Specification: Userscript Engine and Lifecycle Safety

**Feature ID:** 005
**Status:** proposed
**Target milestone:** M2

## Goal

Implement the smallest reliable userscript runtime needed by the exporter and
future custom scripts, with explicit handling for modern Chromium tab and
service-worker lifecycle events.

## Requirements

1. Parse `@name`, `@namespace`, `@version`, `@match`, `@include`, `@exclude`,
   `@run-at`, `@grant`, and `@require` only when each is implemented and tested.
2. Match URLs deterministically and reject unsupported origins before injection.
3. Support `document-start` injection for approved scripts.
4. Keep registration and execution state separate from tab-scoped state.
5. Invalidate tab state on tab removal, navigation, and extension context
   invalidation.
6. Treat `No tab with id`, `Receiving end does not exist`, and equivalent
   lifecycle errors as bounded stale-request outcomes.
7. Unexpected errors MUST remain visible through the diagnostic logger and test
   result.
8. Every message request MUST have a correlation ID and bounded completion path.
9. The engine MUST not poll all tabs continuously.
10. The engine MUST survive service-worker suspension and restart.

## Acceptance criteria

- Metadata and matching tests pass for supported fields and reject unsupported
  behavior clearly.
- A browser regression test closes, reloads, and navigates tabs during in-flight
  requests with zero unhandled rejections.
- A worker restart does not create duplicate registrations.
- An unrelated page receives no userscript injection.


## Implementation notes (tamperextscripts manager)

Status update: implemented as a rewrite (not a port of the Manifest V2 2.9
source) in `extension/src/userscript/`, with a service worker
(`background.js`) and dashboard (`options.html`). Unit tests cover parsing,
matching, storage, registration mapping, GM bridge checks, and registry
verification (`npm test` in `extension/`).

### Permission rationale (required by the constitution)

- `userScripts`: needed to register scripts into the USER_SCRIPT world.
  Chrome requires the user to enable "Allow User Scripts" for the extension.
- `storage`: saves installed scripts and their GM values locally.
- `host_permissions: <all_urls>`: user scripts declare their own pages, and
  `GM_xmlhttpRequest` must reach hosts a script names. Narrowing this would
  break the core behavior, so the dashboard warns that scripts can read and
  change any page they match.

### Behavior and limits

- `@match` and `@include` together run on the union of pages. Glob `@include`
  is supported; regex `@include` is reported as a warning and not applied.
- `@exclude` is a glob list.
- GM API: `GM_getValue`, `GM_setValue`, `GM_xmlhttpRequest`, and `GM_info`.
  Only functions named in `@grant` are exposed. Other GM functions are not
  implemented yet.
- `@require` and `@resource` are not supported yet.
- Community scripts come from `registry/index.json`. Each entry pins its
  source by SHA-256; a mismatch is refused. The user still reviews and presses
  Install.
