// Asks every open LinkedIn tab for its address. A tab that runs this script
// answers with its current location, so only tabs that are open right now reply.
// `bus` is { send(message), on(handler) -> unsubscribe }; the browser version wraps
// a BroadcastChannel, and tests pass a fake.

import { collectProfiles } from "./profile-urls.js";

export async function gatherProfiles(bus, ownHref, { timeoutMs = 700, newId = () => crypto.randomUUID() } = {}) {
  const id = newId();
  const hrefs = [ownHref];

  const off = bus.on((message) => {
    if (message?.t === "here" && message.id === id && typeof message.url === "string") {
      hrefs.push(message.url);
    }
  });
  bus.send({ t: "whois", id });

  await new Promise((resolve) => setTimeout(resolve, timeoutMs));
  off();
  return collectProfiles(hrefs);
}
