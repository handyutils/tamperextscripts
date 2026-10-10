// Userscript entry for chat.deepseek.com. Bundled into a standalone .user.js.
import { mountWidget } from "./widget.js";
import { deepseekAdapter } from "./providers/deepseek.js";

mountWidget(deepseekAdapter);
