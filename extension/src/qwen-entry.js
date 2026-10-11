// Userscript entry for chat.qwen.ai. Bundled into a standalone .user.js.
import { mountWidget } from "./widget.js";
import { qwenAdapter } from "./providers/qwen.js";

mountWidget(qwenAdapter);
