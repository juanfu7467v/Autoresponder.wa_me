import makeWASocket, { useMemoryAuthState } from "@whiskeysockets/baileys";
import { loadSession, saveSession } from "./sessionManager.js";

export async function createClient(botId) {
  // 🔹 Auth en memoria (obligatorio para iniciar)
  const { state, saveCreds } = useMemoryAuthState();

  // 🔹 Intentamos recuperar la sesión guardada
  const stored = await loadSession(botId);

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      Object.assign(state.creds, parsed.creds || {});
      Object.assign(state.keys, parsed.keys || {});
      console.log("Sesion cargada correctamente:", botId);
    } catch (e) {
      console.log("Error al parsear sesión, generando nueva:", e);
    }
  }

  const socket = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  // 🔹 Guardar sesión automáticamente
  socket.ev.on("creds.update", async () => {
    await saveSession(botId, {
      creds: state.creds,
      keys: state.keys,
    });
  });

  return socket;
}
