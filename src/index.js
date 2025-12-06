import express from "express";
import { createClient } from "./multiClient.js";
import { runThread } from "./threadEngine.js";
import { setQR, getQR, clearQR } from "./api/remoteQR.js";

const app = express();
app.use(express.json());

// Almacena bots activos
const bots = {};

/**
 * 🚀 Inicializa un bot por ID
 */
async function initBot(id) {
  console.log(`Iniciando bot: ${id}`);

  const client = await createClient(id);

  // 📌 Manejo del QR
  client.ev.on("connection.update", (update) => {
    const { qr, connection } = update;

    if (qr) {
      console.log(`🔥 QR generado para bot ${id}`);
      setQR(id, qr);
    }

    if (connection === "open") {
      console.log(`✅ Bot ${id} conectado correctamente`);
      clearQR(id);
    }

    if (connection === "close") {
      console.log(`⚠️ Bot ${id} desconectado`);
    }
  });

  // 📌 Manejo de mensajes entrantes
  client.ev.on("messages.upsert", async (msg) => {
    try {
      const text = msg.messages[0]?.message?.conversation;
      const remote = msg.messages[0].key.remoteJid;

      if (!text || !remote) return;

      const reply = await runThread({ message: text });
      await client.sendMessage(remote, { text: reply });
    } catch (e) {
      console.error("❌ Error al responder mensaje:", e);
    }
  });

  bots[id] = client;
}

/**
 * 🔄 Inicializa el bot principal
 */
initBot("bot1");

// -----------------------------------------------
// 📌 ENDPOINTS
// -----------------------------------------------

/**
 * 📌 Obtener QR de un bot
 */
app.get("/qr/:bot", (req, res) => {
  const botID = req.params.bot;
  const qr = getQR(botID);

  if (!qr) {
    return res.json({
      ok: false,
      message: "El bot está conectado o aún no generó un QR."
    });
  }

  res.json({ ok: true, qr });
});

/**
 * 🔁 Resetear bot → desconectar y generar nuevo QR
 */
app.post("/reset/:bot", async (req, res) => {
  const botID = req.params.bot;
  const existing = bots[botID];

  if (existing) {
    try {
      await existing.logout();
      delete bots[botID];
      clearQR(botID);
    } catch {}
  }

  console.log(`🔄 Reiniciando bot ${botID}...`);
  await initBot(botID);

  res.json({
    ok: true,
    message: `Bot ${botID} reiniciado. Espera unos segundos y consulta /qr/${botID}`
  });
});

// -----------------------------------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Autoresponder funcionando en puerto ${PORT}`);
});
