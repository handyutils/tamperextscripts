// Converts a raw ChatGPT backend conversation payload into a plain,
// deterministic structure. This is the only module that knows the shape of
// the backend "mapping" tree; serializers consume the normalized result.

const VISIBLE_ROLES = new Set(["user", "assistant"]);

export const DEFAULT_TITLE = "Untitled conversation";

export function normalizeConversation(raw) {
  const mapping = raw.mapping ?? {};
  const messages = activeBranch(mapping, raw.current_node)
    .map((node) => toMessage(node.message))
    .filter(Boolean);

  return {
    id: raw.conversation_id ?? raw.id ?? "",
    title: raw.title || DEFAULT_TITLE,
    createTime: raw.create_time ?? null,
    messages,
  };
}

// Walks from the current leaf back to the root, then reverses, so the result
// is the branch the user actually sees, in chronological order.
function activeBranch(mapping, currentNode) {
  const branch = [];
  const seen = new Set();
  let id = currentNode;
  while (id && mapping[id] && !seen.has(id)) {
    seen.add(id);
    branch.push(mapping[id]);
    id = mapping[id].parent;
  }
  return branch.reverse();
}

function toMessage(message) {
  if (!message) return null;
  if (message.metadata?.is_visually_hidden_from_conversation) return null;

  const role = message.author?.role;
  if (!VISIBLE_ROLES.has(role)) return null;

  return {
    role,
    text: partsToText(message.content),
    createTime: message.create_time ?? null,
  };
}

function partsToText(content) {
  const parts = content?.parts ?? [];
  return parts
    .map((part) => {
      if (typeof part === "string") return part;
      if (typeof part?.text === "string") return part.text;
      return "[non-text content]";
    })
    .join("");
}
