// Converts a claude.ai Cowork session (session record plus event list) into the
// normalized shape. Events arrive newest first; sequence_num gives the order.
// Only visible text is kept: user prompts and assistant text blocks. Tool calls,
// tool results, thinking, and system or control events are skipped.

export function normalizeCoworkSession(rawSession, events) {
  // The session endpoint wraps the record in a response_shape object.
  const session = rawSession.response_shape ?? rawSession;
  const messages = [...events]
    .sort((a, b) => Number(a.sequence_num) - Number(b.sequence_num))
    .map(toMessage)
    .filter((m) => m && m.text);

  return {
    id: session.id ?? "",
    title: session.title || session.post_turn_summary?.title || "Untitled conversation",
    createTime: session.created_at ? Math.floor(Date.parse(session.created_at) / 1000) : null,
    messages,
  };
}

function toMessage(event) {
  if (event.event_type !== "user" && event.event_type !== "assistant") return null;
  const content = event.payload?.message?.content;
  const text =
    typeof content === "string"
      ? content.trim()
      : (content ?? [])
          .filter((b) => b.type === "text" && typeof b.text === "string")
          .map((b) => b.text.trim())
          .filter(Boolean)
          .join("\n\n");
  const stamp = event.payload?.timestamp;
  return {
    role: event.event_type,
    text,
    createTime: stamp ? Math.floor(Date.parse(stamp) / 1000) : null,
  };
}
