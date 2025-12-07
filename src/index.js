import express from "express";
import { createClient } from "./multiClient.js";
import { runThread } from "./threadEngine.js";
import { setQR, getQR, clearQR } from "./api/remoteQR.js";

const app = express();
app.use(express.json());

const bots = {};
const botStatus = {}; // Estado actual del bot

// =============================================
// 🚀 INICIALIZAR BOT
// =============================================
async function initBot(id) {
  console.log(`🚀 Iniciando bot ${id}`);
  botStatus[id] = "iniciando";

  const client = await createClient(id);
  bots[id] = client;

  // 📌 EVENTO: Estado de conexión
  client.ev.on("connection.update", (update) => {
    const { qr, connection } = update;

    if (qr) {
      console.log(`🟩 QR generado para ${id}`);
      botStatus[id] = "esperando_qr";
      setQR(id, qr);
    }

    if (connection === "open") {
      console.log(`🟢 BOT ${id} autenticado correctamente`);
      botStatus[id] = "autenticado";
      clearQR(id);
    }

    if (connection === "close") {
      console.log(`🔴 BOT ${id} desconectado`);
      botStatus[id] = "desconectado";
    }
  });

  // 📩 EVENTO: Mensajes recibidos
  client.ev.on("messages.upsert", async (msg) => {
    const m = msg.messages[0];
    if (!m?.message?.conversation) return;

    const text = m.message.conversation;
    const from = m.key.remoteJid;

    console.log(`📩 Mensaje recibido de ${from}: ${text}`);

    const reply = await runThread({ message: text });
    await client.sendMessage(from, { text: reply });
  });
}

// Iniciar bot principal
initBot("bot1");

// =============================================
// 📌 1. JSON → Obtener QR crudo
// =============================================
app.get("/qr/:bot", (req, res) => {
  res.json({ qr: getQR(req.params.bot) || null });
});

// =============================================
// 📌 2. PNG → QR listo para mostrar en AppCreator24
// =============================================
app.get("/qr-png/:bot", (req, res) => {
  const qr = getQR(req.params.bot);

  if (!qr) return res.status(404).send("QR no disponible");

  const googleQR = `https://chart.googleapis.com/chart?chs=400x400&cht=qr&chl=${encodeURIComponent(qr)}`;

  res.redirect(googleQR); // ✔ devuelve PNG directamente
});

// =============================================
// 📌 3. Estado del bot
// =============================================
app.get("/status/:bot", (req, res) => {
  const bot = req.params.bot;
  res.json({
    bot,
    status: botStatus[bot] || "desconocido",
  });
});

// =============================================
// 📌 4. Resetear sesión → Generar nuevo QR
// =============================================
app.get("/reset/:bot", async (req, res) => {
  const bot = req.params.bot;
  console.log(`🧹 Reiniciando sesión del bot ${bot}`);

  clearQR(bot);
  botStatus[bot] = "reiniciando";

  await initBot(bot);

  res.json({
    bot,
    status: "reiniciado",
    message: `Nuevo QR generado para ${bot}`,
  });
});

// =============================================
// 🚀 Servidor Express
// =============================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Servidor Express funcionando en puerto ${PORT}`)
);
