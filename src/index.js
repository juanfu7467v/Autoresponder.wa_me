import express from "express";
import { createClient } from "./multiClient.js";
import { runThread } from "./threadEngine.js";
import { setQR, getQR, clearQR } from "./api/remoteQR.js";

const app = express();
app.use(express.json());

const bots = {};

// 🔥 INICIALIZAR UN BOT
async function initBot(id) {
  console.log(`🚀 Iniciando bot ${id}`);

  const client = await createClient(id);

  // 📌 Capturar QR
  client.ev.on("connection.update", (update) => {
    const { qr } = update;
    if (qr) {
      console.log(`🟩 QR generado para ${id}`);
      setQR(id, qr);
    }
  });

  // 📩 Mensajes entrantes
  client.ev.on("messages.upsert", async (msg) => {
    const m = msg.messages[0];
    if (!m?.message?.conversation) return;

    const text = m.message.conversation;
    const from = m.key.remoteJid;

    const reply = await runThread({ message: text });
    await client.sendMessage(from, { text: reply });
  });

  bots[id] = client;
}

// Iniciar bot principal
initBot("bot1");

// 📌 Obtener QR
app.get("/qr/:bot", (req, res) => {
  res.json({ qr: getQR(req.params.bot) });
});

// 📌 RESET → borrar QR + reiniciar sesión (para escanear de nuevo)
app.get("/reset/:bot", async (req, res) => {
  const bot = req.params.bot;

  console.log(`🧹 Reiniciando sesión del bot ${bot}`);
  clearQR(bot);

  await initBot(bot);

  res.json({ status: "ok", message: `Bot ${bot} reiniciado. Escanea el nuevo QR.` });
});

// Servidor Express
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Servidor Express escuchando en puerto ${PORT}`)
);
