// Userscript entry for chat.mistral.ai. Bundled into a standalone .user.js.
import { mountWidget } from "./widget.js";
import { mistralAdapter } from "./providers/mistral.js";

mountWidget(mistralAdapter);
