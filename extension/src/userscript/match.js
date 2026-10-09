// Decides whether a script should run on a URL. Supports the three rule kinds
// userscripts use: Chrome match patterns (@match), globs or /regex/ (@include),
// and globs or /regex/ that veto a run (@exclude).

export function urlMatchesScript(meta, url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (meta.excludes.some((rule) => urlMatchesRule(rule, url, parsed, true))) {
    return false;
  }

  return (
    meta.matches.some((rule) => matchPattern(rule, parsed)) ||
    meta.includes.some((rule) => urlMatchesRule(rule, url, parsed, false))
  );
}

function urlMatchesRule(rule, url, parsed, isExclude) {
  if (isRegexRule(rule)) return regexFor(rule).test(url);
  // @exclude and @include are glob-style, but a bare "*" glob used as an
  // exclude should behave the same as a match pattern.
  if (isExclude) return globFor(rule).test(url) || matchPattern(rule, parsed);
  return globFor(rule).test(url);
}

function isRegexRule(rule) {
  return rule.length > 2 && rule.startsWith("/") && rule.endsWith("/");
}

function regexFor(rule) {
  return new RegExp(rule.slice(1, -1));
}

function globFor(rule) {
  const escaped = rule.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}

// Chrome match pattern: "<all_urls>" or "scheme://host/path" where scheme may
// be "*" (http or https), host may start with "*.", and path may contain "*".
function matchPattern(pattern, parsed) {
  if (pattern === "<all_urls>") {
    return ["http:", "https:", "file:", "ftp:"].includes(parsed.protocol);
  }

  const match = /^(\*|https?|file|ftp):\/\/([^/]*)(\/.*)$/.exec(pattern);
  if (!match) return false;
  const [, scheme, host, path] = match;

  const schemeOk =
    scheme === "*" ? parsed.protocol === "http:" || parsed.protocol === "https:" : parsed.protocol === `${scheme}:`;
  if (!schemeOk) return false;

  const hostOk =
    host === "*" ||
    (host.startsWith("*.")
      ? parsed.hostname === host.slice(2) || parsed.hostname.endsWith(`.${host.slice(2)}`)
      : parsed.hostname === host);
  if (!hostOk) return false;

  return globFor(path).test(`${parsed.pathname}${parsed.search}`);
}
