// Converts a claude.ai conversation (tree response) into the normalized shape
// the serializers use. Only the active branch is kept: the path from
// current_leaf_message_uuid back to the root, in chronological order.

const ROLE_BY_SENDER = { human: "user", assistant: "assistant" };

export function normalizeClaudeConversation(raw) {
  const byUuid = new Map((raw.chat_messages ?? []).map((m) => [m.uuid, m]));

  const branch = [];
  const seen = new Set();
  let cur = byUuid.get(raw.current_leaf_message_uuid);
  while (cur && !seen.has(cur.uuid)) {
    seen.add(cur.uuid);
    branch.push(cur);
    cur = byUuid.get(cur.parent_message_uuid);
  }
  branch.reverse();

  const messages = branch
    .map((m) => ({
      role: ROLE_BY_SENDER[m.sender],
      text: textOf(m.content),
      createTime: m.created_at ? Math.floor(Date.parse(m.created_at) / 1000) : null,
    }))
    .filter((m) => m.role && m.text);

  return {
    id: raw.uuid ?? "",
    title: raw.name || "Untitled conversation",
    createTime: raw.created_at ? Math.floor(Date.parse(raw.created_at) / 1000) : null,
    messages,
  };
}

// Only "text" blocks are visible conversation content. Thinking, tool use,
// and tool results are internal and are skipped.
function textOf(blocks) {
  return (blocks ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text.trim())
    .filter(Boolean)
    .join("\n\n");
}
