// Converts chat.deepseek.com session data into the normalized shape. Walks from
// current_message_id back to the root via parent_id, so only the visible branch
// is kept. Only REQUEST (user) and RESPONSE (assistant) fragments are text.

const ROLE = { USER: "user", ASSISTANT: "assistant" };
const TEXT_FRAGMENT = { USER: "REQUEST", ASSISTANT: "RESPONSE" };

export function normalizeDeepSeekConversation(session, messages) {
  const byId = new Map(messages.map((m) => [m.message_id, m]));

  const branch = [];
  const seen = new Set();
  let cur = byId.get(session.current_message_id);
  while (cur && !seen.has(cur.message_id)) {
    seen.add(cur.message_id);
    branch.push(cur);
    cur = byId.get(cur.parent_id);
  }
  branch.reverse();

  const out = branch
    .filter((m) => ROLE[m.role])
    .map((m) => ({
      role: ROLE[m.role],
      text: (m.fragments ?? [])
        .filter((f) => f.type === TEXT_FRAGMENT[m.role] && typeof f.content === "string")
        .map((f) => f.content.trim())
        .filter(Boolean)
        .join("\n\n"),
      createTime: m.inserted_at ? m.inserted_at : null,
    }))
    .filter((m) => m.text);

  return {
    id: session.id ?? "",
    title: session.title || "Untitled conversation",
    createTime: session.updated_at ?? null,
    messages: out,
  };
}
