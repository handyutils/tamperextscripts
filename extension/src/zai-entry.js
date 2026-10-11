// Userscript entry for chat.z.ai. Bundled into a standalone .user.js.
import { mountWidget } from "./widget.js";
import { zaiAdapter } from "./providers/zai.js";

mountWidget(zaiAdapter);
