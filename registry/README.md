# Community script registry

`index.json` lists community userscripts that the tamperextscripts dashboard can offer.
Each entry pins its script by SHA-256, so a changed or tampered file is refused.

Entry format:

```json
{
  "id": "unique-id",
  "name": "Script name",
  "version": "1.0.0",
  "description": "What it does",
  "url": "https://raw.githubusercontent.com/.../script.user.js",
  "sha256": "64 lowercase hex characters of the script file",
  "license": "GPL-3.0-only"
}
```

To add a script, host the file at an https URL, compute its hash
(`shasum -a 256 script.user.js`), and add an entry. Review the script first.
