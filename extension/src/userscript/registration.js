// Maps a stored userscript record to chrome.userScripts registration objects.
// Pure: the service worker calls this and then registers the results.
//
// Tampermonkey runs a script on the union of its @match and @include rules.
// chrome.userScripts cannot express a union in one registration, so @match and
// @include become two registrations, and the @include one excludes the pages
// that @match already covers. That way a page never runs the script twice.
//
// Returns { registrations, warnings }. registrations is empty when the script
// has nothing to match. warnings lists rules the API cannot express yet, so the
// dashboard can show them instead of dropping them silently.

import { buildUserScriptCode } from "./runtime-code.js";

const RUN_AT = {
  "document-start": "document_start",
  "document-end": "document_end",
  "document-idle": "document_idle",
};

const ANY_PAGE = "*://*/*";

export function toRegistrations(record) {
  const { meta } = record;
  const warnings = [];

  const globIncludes = [];
  for (const rule of meta.includes) {
    if (isRegexRule(rule)) {
      warnings.push(`Regex @include is not supported yet: ${rule}`);
    } else {
      globIncludes.push(rule);
    }
  }

  const runAt = RUN_AT[meta.runAt] ?? "document_end";
  const js = [{ code: buildUserScriptCode(record) }];
  const registrations = [];

  if (meta.matches.length > 0) {
    const registration = { id: `us-${record.id}`, matches: meta.matches, js, runAt, world: "USER_SCRIPT" };
    if (meta.excludes.length > 0) registration.excludeGlobs = meta.excludes;
    registrations.push(registration);
  }

  if (globIncludes.length > 0) {
    const registration = {
      id: `us-${record.id}-include`,
      matches: [ANY_PAGE],
      includeGlobs: globIncludes,
      js,
      runAt,
      world: "USER_SCRIPT",
    };
    if (meta.matches.length > 0) registration.excludeMatches = meta.matches;
    if (meta.excludes.length > 0) registration.excludeGlobs = meta.excludes;
    registrations.push(registration);
  }

  return { registrations, warnings };
}

function isRegexRule(rule) {
  return rule.length > 2 && rule.startsWith("/") && rule.endsWith("/");
}
