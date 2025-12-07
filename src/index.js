import express from "express";
import cors from "cors";
import { createClient } from "./multiClient.js";
import { runThread } from "./threadEngine.js";
import { setQR, getQR, clearQR } from "./api/remoteQR.js";

const app = express();
app.use(express.json());

// 🔥 ACTIVAR CORS PARA QUE TU APP PUEDA CARGAR EL QR DESDE CUALQUIER WEB
app.use(cors({
  origin: "*",
  methods: "GET,POST",
  allowedHeaders: "Content-Type"
}));

const bots = {};
const botStatus = {}; // ← guarda el estado de cada bot

// =====================================================
// 🚀 INICIALIZAR BOT
// =====================================================
async function initBot(id) {
  console.log(`🚀 Iniciando bot ${id}`);

  const client = await createClient(id);

  bots[id] = client;
  botStatus[id] = "iniciando";

  // 📌 EVENTO: actualización de conexión
  client.ev.on("connection.update", (update) => {
    const { qr, connection } = update;

    if (qr) {
      console.log(`🟩 QR generado para ${id}`);
      botStatus[id] = "esperando_qr";
      setQR(id, qr);
    }

    if (connection === "open") {
      console.log(`🟢 BOT ${id} AUTENTICADO`);
      botStatus[id] = "autenticado";
      clearQR(id);
    }

    if (connection === "close") {
      console.log(`🔴 BOT ${id} DESCONECTADO`);
      botStatus[id] = "desconectado";
    }
  });

  // 📩 RECEPCIÓN DE MENSAJES
  client.ev.on("messages.upsert", async (msg) => {
    const m = msg.messages[0];
    if (!m?.message?.conversation) return;

    const text = m.message.conversation;
    const from = m.key.remoteJid;

    const reply = await runThread({ message: text });
    await client.sendMessage(from, { text: reply });
  });
}

// 🚀 Iniciar bot principal
initBot("bot1");

// =====================================================
// 📌 ENDPOINTS PÚBLICOS
// =====================================================

// 1️⃣ Obtener QR
app.get("/qr/:bot", (req, res) => {
  res.json({
    qr: getQR(req.params.bot) || null,
  });
});

// 2️⃣ Estado del bot
app.get("/status/:bot", (req, res) => {
  const bot = req.params.bot;
  res.json({
    bot,
    status: botStatus[bot] || "desconocido",
  });
});

// 3️⃣ Reiniciar y generar nuevo QR
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

// =====================================================
// 🚀 Servidor Express
// =====================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Servidor Express escuchando en puerto ${PORT}`)
);
