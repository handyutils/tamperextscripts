// Documentation content. The search box and the navigation both read from this
// list, so every section added here is searchable automatically.

export const REPO = "https://github.com/handyutils/tamperextscripts";
export const REGISTRY_INDEX =
  "https://raw.githubusercontent.com/handyutils/tamperextscripts/master/registry/index.json";
export const EXTENSION_VERSION = "0.1.0";
export const EXTENSION_ZIP = `downloads/tamperextscripts-${EXTENSION_VERSION}.zip`;

export const sections = [
  {
    id: "overview",
    title: "Overview",
    body: [
      "tamperextscripts is a Chrome extension for modern Chromium browsers (Manifest V3). It does two things.",
      "It exports conversations from ChatGPT and Claude to Markdown, JSON, HTML, or plain text. It also runs your own userscripts, the same way Tampermonkey does, from a community registry.",
      "Everything runs locally in your browser. Nothing is sent to a third-party server.",
    ],
  },
  {
    id: "download",
    title: "Download",
    body: [
      `The latest packaged extension is ${EXTENSION_VERSION}. Download the zip, unzip it, then load it as described in Install.`,
    ],
    action: { label: `Download tamperextscripts ${EXTENSION_VERSION} (.zip)`, href: EXTENSION_ZIP },
  },
  {
    id: "install",
    title: "Install the extension",
    steps: [
      "Download the zip above and unzip it to a folder you will keep, for example Documents/tamperextscripts.",
      "Open chrome://extensions and turn on Developer mode (top right).",
      "Click Load unpacked and choose the unzipped folder.",
      "Open the extension's Details page and turn on Allow User Scripts. Chrome 138 or newer needs this switch before any userscript can run.",
      "Reload the extension card. Open the extension's options page to install scripts.",
    ],
    note: "Keep the unzipped folder in place. Chrome loads the extension from it, so moving or deleting it breaks the extension.",
  },
  {
    id: "exporters",
    title: "Chat exporters",
    body: [
      "On a ChatGPT or Claude conversation page, an Export button appears in the bottom-right corner. Open it to choose a format.",
      "Formats: Markdown, JSON, HTML, plain text, and copy to clipboard. Export all saves every conversation in one JSON file, with a list of any that failed.",
      "Only the active branch is exported, and only text you can see. Thinking, tool calls, and hidden messages are left out.",
      "The ChatGPT exporter is built into the extension. The Claude exporter is a separate userscript: install the file from the repository folder community-scripts-registry/claudechatsexporter with the options page, or with Tampermonkey.",
    ],
    note: "Status: the ChatGPT and Claude exporters are in beta. They use each site's own web API, which is undocumented and can change. Report problems on GitHub.",
  },
  {
    id: "userscripts",
    title: "Userscripts",
    body: [
      "Install your own scripts from the options page: choose a .user.js file or paste the source, then press Install.",
      "Supported: the metadata headers @name, @namespace, @version, @match, @include (glob patterns), @exclude, @grant, and @run-at. Scripts run on pages that match their rules.",
      "GM functions: GM_getValue, GM_setValue, GM_xmlhttpRequest, and GM_info. A function is only available when the script declares the matching @grant.",
    ],
    note: "Not supported yet: @require, @resource, regex @include, and menu commands.",
  },
  {
    id: "registry",
    title: "Community registry",
    body: [
      "The registry is a list of community scripts that the options page can offer. Each entry pins its script by SHA-256, so a changed file is refused.",
      "You always see the source before it is installed, and you press Install yourself.",
    ],
    registry: true,
  },
  {
    id: "security",
    title: "Security and privacy",
    body: [
      "Userscripts can read and change any page they match. Install only scripts you have read or trust.",
      "The extension requests the storage and userScripts permissions, and access to all sites so that scripts and GM_xmlhttpRequest can work. The reasons are in the project specification.",
      "Conversation data is only sent to the site it came from, and only when you export. Nothing goes to analytics or telemetry.",
      "To report a vulnerability, open a private security advisory on GitHub rather than a public issue.",
    ],
  },
  {
    id: "faq",
    title: "FAQ",
    faq: [
      ["Does it work in Firefox or Safari?", "Not yet. It targets Chrome and other Chromium browsers that support Manifest V3 and the userScripts API."],
      ["Why does my script not run?", "Check that Allow User Scripts is on for the extension, that the script's @match rule covers the page, and that the script is enabled in the options page."],
      ["Can I use my Tampermonkey scripts?", "Yes, if they only use the supported headers and GM functions. Copy the script source into the install box."],
      ["Where are my scripts stored?", "In the extension's local storage in this browser profile. Nothing is synced or uploaded."],
    ],
  },
  {
    id: "contribute",
    title: "Contribute",
    body: [
      `Source, issues, and specifications are on GitHub: ${REPO}.`,
      "Contributions to the registry are welcome. Host the script at an https URL, compute its SHA-256, and open a pull request that adds an entry to registry/index.json.",
    ],
  },
];
