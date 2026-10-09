# tamperextscripts Roadmap

## Vision

`tamperextscripts` is a focused GPL-3.0 successor for reliable userscript
execution and agentic-development exports on modern Chromium. The first
product is the ChatGPT exporter workflow currently proven in the user's live
Tampermonkey setup: Setting, Copy Text, Screenshot, Markdown, HTML, JSON, and
Export All.

The project is derived from the public GPL-licensed Tampermonkey source up to
version 2.9. It is not a port of proprietary Tampermonkey 5.x code.

## Current state

- Repository: `handyutils/tamperextscripts`
- Baseline: legacy Tampermonkey 2.9-era source
- Build model: shell-based legacy extension packaging
- Browser target: modern Chromium, including Chrome 153
- Working reference: the user's existing Tampermonkey ChatGPT exporter
- First upstream symptom to reproduce: stale-tab errors and startup/injection
  stalls associated with Chromium 153 and Tampermonkey 5.5

## Milestones

### M0 — Documentation and provenance foundation

Status: in progress

- Establish the roadmap, constitution, specifications, and agent agreement.
- Record the GPL/proprietary boundary.
- Define the first testable product slice.
- Specification set: `specs/003-identity-provenance/spec.md`.

### M1 — Modern extension shell and developer tooling

Status: planned

- Create a distinct extension identity and branding.
- Add a Manifest V3 build that loads in a disposable Chromium profile.
- Introduce a reproducible build command, local watch/dev server, structured
  redacted logging, browser test harness, verification reporter, and CI gate.
- Keep the legacy source available as provenance/reference while new code is
  isolated in focused modules.
- Specification set: `specs/002-developer-tooling/spec.md`,
  `specs/004-mv3-runtime-shell/spec.md`, and
  `specs/007-security-hardening/spec.md`.

Exit condition: a clean checkout produces a loadable MV3 unpacked extension
without modifying the user's live Chrome profile.

### M2 — Lifecycle-safe runtime

Status: planned

- Implement document-start userscript registration and matching.
- Centralize tab messaging and treat missing tabs as normal lifecycle events.
- Handle service-worker startup and suspension without indefinite callers.
- Add deterministic unit tests and a browser regression test for reload/close
  races.
- Specification set: `specs/005-userscript-engine/spec.md`.

Exit condition: repeated tab open, reload, navigation, and close cycles produce
no unhandled stale-tab errors and do not block unrelated tabs.

### M3 — ChatGPT export workflow

Status: in progress (Screenshot pending)

- Port the working custom script behavior behind a dedicated exporter module.
- Support Markdown, JSON, HTML, plain text, screenshots, and bulk export.
- Preserve conversation titles and stable file naming.
- Scope execution to supported ChatGPT origins.
- Specification set: `specs/006-chatgpt-exporter/spec.md`.

Exit condition: each visible export action works in a disposable Chromium
profile and has a browser-level regression test where DOM behavior matters.

### M4 — Script management essentials

Status: planned

- Add a minimal script list and enable/disable controls.
- Add import/export of user scripts in a portable format.
- Add only the GM APIs required by migrated exporter scripts.
- Document unsupported legacy APIs explicitly.
- Specification set: `specs/008-compatibility-migration/spec.md`.

Exit condition: the user's exporter scripts can be migrated without requiring
Tampermonkey to remain installed in the dedicated profile.

### M5 — Upstream collaboration and release hygiene

Status: planned

- Publish a minimized Chromium 153 stale-tab/startup reproduction.
- Share measured behavior and logs with the Tampermonkey maintainers.
- Add contributor documentation, release notes, and reproducible artifacts.
- Decide whether the project is a successor, compatibility layer, or focused
  exporter based on actual adoption and maintenance capacity.
- Specification set: `specs/009-release-upstream/spec.md`.

## Scope boundaries

The first release does not attempt to reproduce every Tampermonkey feature,
support every browser, or copy current proprietary Tampermonkey implementation
details. Sync backends, marketplace distribution, broad GM API parity, and
legacy browser support come after the core export workflow is reliable.

## Spec index

- `specs/001-mv3-exporter-runtime/spec.md` — first implementation milestone
- `specs/002-developer-tooling/spec.md` — debugging, logging, build, test, and CI infrastructure
- `specs/README.md` — complete specification index and dependency order
- `specs/003-identity-provenance/spec.md` — distinct GPL identity and source boundary
- `specs/004-mv3-runtime-shell/spec.md` — modern Chromium extension shell
- `specs/005-userscript-engine/spec.md` — metadata, injection, and lifecycle safety
- `specs/006-chatgpt-exporter/spec.md` — Markdown/JSON/HTML/text/screenshot/bulk export
- `specs/007-security-hardening/spec.md` — permissions, redaction, and secure output
- `specs/008-compatibility-migration/spec.md` — custom script import and supported GM APIs
- `specs/009-release-upstream/spec.md` — release, CI, and upstream collaboration
