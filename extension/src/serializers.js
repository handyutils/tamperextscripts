// Pure, deterministic serializers. Each takes a normalized conversation
// (see conversation.js) and returns a string. No DOM, no network, no I/O.

const ROLE_LABELS = { user: "User", assistant: "Assistant" };
const MAX_FILENAME_LENGTH = 120;

export function toMarkdown(conversation) {
  const sections = conversation.messages.map(
    (m) => `**${roleLabel(m.role)}**\n\n${m.text}`,
  );
  return [`# ${conversation.title}`, ...sections].join("\n\n---\n\n") + "\n";
}

export function toJson(conversation) {
  return JSON.stringify(conversation, null, 2) + "\n";
}

export function toText(conversation) {
  const sections = conversation.messages.map(
    (m) => `${roleLabel(m.role)}:\n${m.text}`,
  );
  return [conversation.title, ...sections].join("\n\n") + "\n";
}

export function toHtml(conversation) {
  const title = escapeHtml(conversation.title);
  const messages = conversation.messages
    .map(
      (m) =>
        `<section class="message ${escapeHtml(m.role)}">` +
        `<h2>${escapeHtml(roleLabel(m.role))}</h2>` +
        `<pre>${escapeHtml(m.text)}</pre>` +
        `</section>`,
    )
    .join("\n");

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    `<title>${title}</title>`,
    "</head>",
    "<body>",
    `<h1>${title}</h1>`,
    messages,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

// Stable, filesystem-safe name: "<title> - <id>.<ext>".
export function toFilename(conversation, extension) {
  const title = sanitize(conversation.title) || "Untitled conversation";
  const base = (conversation.id ? `${title} - ${conversation.id}` : title).slice(0, MAX_FILENAME_LENGTH);
  return `${base}.${extension}`;
}

function roleLabel(role) {
  return ROLE_LABELS[role] ?? role;
}

function sanitize(value) {
  return String(value ?? "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
