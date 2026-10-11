// Finds the Cowork session behind a /chat/... page. The chat id in the address
// bar is not stored on the session, so the page title is matched against the
// session titles. An ambiguous title is reported rather than guessed.

const normalize = (value) => String(value ?? "").replace(/\s*-\s*Claude\s*$/i, "").trim().toLowerCase();

export function pickCoworkSession(sessions, pageTitle) {
  const wanted = normalize(pageTitle);
  if (!wanted) return { error: "none" };

  const matches = sessions.filter((s) => normalize(s.title) === wanted);
  if (matches.length === 1) return { id: matches[0].id };
  if (matches.length === 0) return { error: "none" };
  return { error: "ambiguous", count: matches.length };
}
