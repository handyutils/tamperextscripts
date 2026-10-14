// Pure helpers for LinkedIn profile links. A profile is /in/<slug>/ on linkedin.com.
// Every form (with query, hash, or a sub-page such as /details/) reduces to one
// canonical URL, so the same person is never copied twice.

const PROFILE_PATH = /^\/in\/([^/?#]+)/;

export function canonicalProfileUrl(href) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return null;
  const slug = PROFILE_PATH.exec(url.pathname)?.[1];
  if (!slug) return null;
  return `https://www.linkedin.com/in/${slug}/`;
}

export function collectProfiles(hrefs) {
  const seen = new Set();
  const out = [];
  for (const href of hrefs) {
    const canonical = canonicalProfileUrl(href);
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical);
      out.push(canonical);
    }
  }
  return out;
}

export function formatList(urls) {
  return urls.join("\n");
}
