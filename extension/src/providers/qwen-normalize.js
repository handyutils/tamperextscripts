// Converts a chat.qwen.ai chat (/api/v2/chats/{id} data) into the normalized
// shape. The messages form a tree; only the active branch (currentId back to
// the root via parentId) is kept. reasoning_content is not part of the answer.

const ROLES = new Set(["user", "assistant"]);

export function normalizeQwenConversation(data) {
  const history = data.chat?.history ?? {};
  const byId = history.messages ?? {};

  const branch = [];
  const seen = new Set();
  let cur = byId[history.currentId ?? data.currentId];
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    branch.push(cur);
    cur = byId[cur.parentId];
  }
  branch.reverse();

  const messages = branch
    .filter((msg) => ROLES.has(msg.role))
    .map((msg) => ({
      role: msg.role,
      text: typeof msg.content === "string" ? msg.content.trim() : "",
      createTime: msg.timestamp ?? null,
    }))
    .filter((msg) => msg.text);

  return {
    id: data.id ?? "",
    title: data.title || "Untitled conversation",
    createTime: data.created_at ?? null,
    messages,
  };
}
