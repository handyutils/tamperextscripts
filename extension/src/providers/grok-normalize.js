// Converts grok.com conversation data into the normalized shape. The tree comes
// from response-node (parentResponseId links); text comes from load-responses.
// Only the newest branch is kept, root to leaf.

const ROLE_BY_SENDER = { human: "user", assistant: "assistant" };

export function normalizeGrokConversation(meta, tree, loaded) {
  const byId = new Map(loaded.responses.map((r) => [r.responseId, r]));
  const nodes = new Map(tree.responseNodes.map((n) => [n.responseId, n]));

  // Leaves are nodes that no other node names as its parent.
  const parents = new Set(tree.responseNodes.map((n) => n.parentResponseId).filter(Boolean));
  const leaves = tree.responseNodes.filter((n) => !parents.has(n.responseId));
  const newest = (ids) => ids.reduce((best, id) => (timeOf(byId.get(id)) > timeOf(byId.get(best)) ? id : best));
  let cur = leaves.length ? newest(leaves.map((n) => n.responseId)) : null;

  const branch = [];
  const seen = new Set();
  while (cur && nodes.has(cur) && !seen.has(cur)) {
    seen.add(cur);
    branch.push(byId.get(cur));
    cur = nodes.get(cur).parentResponseId || null;
  }
  branch.reverse();

  const messages = branch
    .filter(Boolean)
    .map((r) => ({
      role: ROLE_BY_SENDER[r.sender],
      text: typeof r.message === "string" ? r.message.trim() : "",
      createTime: r.createTime ? Math.floor(Date.parse(r.createTime) / 1000) : null,
    }))
    .filter((m) => m.role && m.text);

  return {
    id: meta.conversation?.conversationId ?? "",
    title: meta.conversation?.title || "Untitled conversation",
    createTime: meta.conversation?.createTime ? Math.floor(Date.parse(meta.conversation.createTime) / 1000) : null,
    messages,
  };
}

function timeOf(response) {
  return response?.createTime ? Date.parse(response.createTime) : 0;
}
