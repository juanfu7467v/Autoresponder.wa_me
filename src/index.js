import express from "express";
import QRCode from "qrcode";
import { createClient } from "./multiClient.js";
import { runThread } from "./threadEngine.js";
import { setQR, getQR, clearQR } from "./api/remoteQR.js";

const app = express();
app.use(express.json());

const bots = {};
const botStatus = {};
const botAudit = {}; // auditoría completa

// ======================================================
// 🚀 INICIALIZAR BOT
// ======================================================
async function initBot(id) {
  console.log(`🚀 Iniciando bot ${id}`);

  const client = await createClient(id);
  bots[id] = client;

  botStatus[id] = "iniciando";
  botAudit[id] = {
    ultimo_qr: null,
    ultimo_estado: "iniciando",
    mensajes_recibidos: 0,
    ultima_actualizacion: new Date().toISOString(),
  };

  // 📌 QR Y ESTADO
  client.ev.on("connection.update", (update) => {
    const { qr, connection } = update;

    if (qr) {
      console.log(`🟩 QR generado para ${id}`);
      botStatus[id] = "esperando_qr";
      botAudit[id].ultimo_qr = new Date().toISOString();
      botAudit[id].ultima_actualizacion = new Date().toISOString();
      setQR(id, qr);
    }

    if (connection === "open") {
      console.log(`🟢 BOT ${id} AUTENTICADO`);
      botStatus[id] = "autenticado";
      botAudit[id].ultimo_estado = "autenticado";
      clearQR(id);
    }

    if (connection === "close") {
      console.log(`🔴 BOT ${id} DESCONECTADO`);
      botStatus[id] = "desconectado";
      botAudit[id].ultimo_estado = "desconectado";
    }
  });

  // 📩 MENSAJES
  client.ev.on("messages.upsert", async (msg) => {
    botAudit[id].mensajes_recibidos++;
    botAudit[id].ultima_actualizacion = new Date().toISOString();

    const m = msg.messages[0];
    if (!m?.message?.conversation) return;

    const text = m.message.conversation;
    const from = m.key.remoteJid;

    const reply = await runThread({ message: text });
    await client.sendMessage(from, { text: reply });
  });

  return client;
}

// Inicializa bot principal
initBot("bot1");

// ======================================================
// 📌 1. DEVOLVER QR EN PNG REAL
// ======================================================
app.get("/qr/:bot.png", async (req, res) => {
  const qr = getQR(req.params.bot);

  if (!qr) return res.status(404).send("QR no disponible aún.");

  const pngBuffer = await QRCode.toBuffer(qr, { type: "png", width: 300 });
  res.setHeader("Content-Type", "image/png");
  res.send(pngBuffer);
});

// ======================================================
// 📌 2. QR EN BASE64 (opcional para apps)
// ======================================================
app.get("/qr/:bot/base64", async (req, res) => {
  const qr = getQR(req.params.bot);
  if (!qr) return res.json({ base64: null });

  const png = await QRCode.toDataURL(qr);
  res.json({ base64: png });
});

// ======================================================
// 📌 3. Estado actual
// ======================================================
app.get("/status/:bot", (req, res) => {
  res.json({
    bot: req.params.bot,
    status: botStatus[req.params.bot] || "desconocido",
  });
});

// ======================================================
// 📌 4. Auditoría completa del bot
// ======================================================
app.get("/audit/:bot", (req, res) => {
  res.json(botAudit[req.params.bot] || {});
});

// ======================================================
// 📌 5. Resetear sesión
// ======================================================
app.get("/reset/:bot", async (req, res) => {
  const bot = req.params.bot;

  console.log(`🧹 Reiniciando sesión del bot ${bot}`);

  clearQR(bot);
  botStatus[bot] = "reiniciando";

  await initBot(bot);

  res.json({
    bot,
    status: "reiniciado",
    message: `Nuevo QR generado para ${bot}.`,
  });
});

// ======================================================
// 🚀 Servidor Express
// ======================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Servidor Express escuchando en puerto ${PORT}`)
);
