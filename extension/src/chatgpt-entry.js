// Userscript entry for ChatGPT. Bundled into a standalone .user.js.
import { mountWidget } from "./widget.js";
import { chatgptAdapter } from "./providers/chatgpt.js";

mountWidget(chatgptAdapter);
