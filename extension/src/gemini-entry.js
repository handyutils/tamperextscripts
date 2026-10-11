// Userscript entry for gemini.google.com. Bundled into a standalone .user.js.
import { mountWidget } from "./widget.js";
import { geminiAdapter } from "./providers/gemini.js";

mountWidget(geminiAdapter);
