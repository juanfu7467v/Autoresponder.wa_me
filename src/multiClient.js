import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from "@whiskeysockets/baileys";

import pino from "pino";

export async function createClient(id) {
  console.log(`🟢 Inicializando cliente ${id}...`);

  // 🗂 Carpeta para guardar la sesión del bot
  const { state, saveCreds } = await useMultiFileAuthState(`auth/${id}`);

  // 🔍 Obtener versión oficial de WhatsApp
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    auth: state,
  });

  // Guardar credenciales
  sock.ev.on("creds.update", saveCreds);

  // Manejo de desconexiones
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log(`❌ Cliente ${id} desconectado. ¿Reintentar?: ${shouldReconnect}`);

      if (shouldReconnect) createClient(id);
    }
  });

  return sock;
}
