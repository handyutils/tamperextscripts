// Converts a chat.z.ai chat (tree in /api/v1/chats/{id}, bodies from POST
// /messages/batch) into the normalized shape. Only the active branch is kept
// (history.currentId back to the root via parentId). An assistant message's
// visible answer is its "text" content blocks; reasoning and tool calls are not.

export function normalizeZaiConversation(chat, bodies) {
  const history = chat.chat?.history ?? {};

  const branch = [];
  const seen = new Set();
  let cur = bodies[history.currentId];
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    branch.push(cur);
    cur = bodies[cur.parentId ?? cur.parent_id];
  }
  branch.reverse();

  const messages = branch
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, text: textOf(m), createTime: m.timestamp ?? null }))
    .filter((m) => m.text);

  return {
    id: chat.id ?? "",
    title: chat.title || "Untitled conversation",
    createTime: chat.created_at ?? null,
    messages,
  };
}

function textOf(message) {
  if (typeof message.content === "string") return message.content.trim();
  return (message.content_blocks ?? [])
    .filter((b) => b.type === "text" && typeof b.content === "string")
    .map((b) => b.content.trim())
    .filter(Boolean)
    .join("\n\n");
}
