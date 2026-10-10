// Converts chat.mistral.ai data (chat.byId and message.all) into the normalized
// shape. Keeps user and assistant text, ordered by turn then time.

const ROLE = { user: "user", assistant: "assistant" };

export function normalizeMistralConversation(chat, items) {
  const messages = [...items]
    .sort((a, b) => (a.turn ?? 0) - (b.turn ?? 0) || Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .map((m) => ({
      role: ROLE[m.role],
      text: typeof m.content === "string" ? m.content.trim() : "",
      createTime: m.createdAt ? Math.floor(Date.parse(m.createdAt) / 1000) : null,
    }))
    .filter((m) => m.role && m.text);

  return {
    id: chat.id ?? "",
    title: chat.title || "Untitled conversation",
    createTime: chat.updatedAt ? Math.floor(Date.parse(chat.updatedAt) / 1000) : null,
    messages,
  };
}
