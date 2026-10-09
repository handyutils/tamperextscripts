// Userscript entry for claude.ai. Bundled into a standalone .user.js.
import { mountWidget } from "./widget.js";
import { claudeAdapter } from "./providers/claude.js";

mountWidget(claudeAdapter);
