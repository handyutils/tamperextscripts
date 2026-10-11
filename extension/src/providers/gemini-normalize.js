// Pure helpers for gemini.google.com. The site answers with Google's batchexecute
// format: positional arrays, so paths are documented where they are used.

// Turns come newest first. turn[2][0][0] is the user prompt, turn[3][0][0][1][0]
// the answer, and turn[4][0] the time in seconds.
export function normalizeGeminiConversation(meta, turns) {
  const messages = [];
  for (const turn of [...turns].reverse()) {
    const time = turn?.[4]?.[0] ?? null;
    const user = turn?.[2]?.[0]?.[0];
    const answer = turn?.[3]?.[0]?.[0]?.[1]?.[0];
    if (typeof user === "string" && user.trim()) messages.push({ role: "user", text: user.trim(), createTime: time });
    if (typeof answer === "string" && answer.trim()) messages.push({ role: "assistant", text: answer.trim(), createTime: time });
  }
  return { id: meta.id ?? "", title: meta.title || "Untitled conversation", createTime: null, messages };
}

// The payload is a JSON string inside the "wrb.fr" frame: frame[0][2].
export function parseBatchResponse(text) {
  const line = text.split("\n").find((l) => l.includes("wrb.fr"));
  if (!line) return null;
  const payload = JSON.parse(line)[0]?.[2];
  return payload ? JSON.parse(payload) : null;
}

// The page embeds the request token in its html as "SNlM0e":"...".
export function extractAtToken(html) {
  return /"SNlM0e":"([^"]+)"/.exec(html)?.[1] ?? null;
}
