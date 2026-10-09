// Userscript entry for grok.com. Bundled into a standalone .user.js.
import { mountWidget } from "./widget.js";
import { grokAdapter } from "./providers/grok.js";

mountWidget(grokAdapter);
