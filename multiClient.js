import makeWASocket from "@whiskeysockets/baileys";
import { loadSession, saveSession } from "./sessionManager.js";

export async function createClient(botId) {
  const session = await loadSession(botId);

  const socket = makeWASocket({
    auth: session || {},
    printQRInTerminal: false,
  });

  socket.ev.on("creds.update", async creds => {
    await saveSession(botId, creds);
  });

  return socket;
}
