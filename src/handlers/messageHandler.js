import { handleWhitelistRemove } from "../commands/messageHandlers.js";

export async function handleMessages(message, client) {
  await handleWhitelistRemove(message, client);
}
