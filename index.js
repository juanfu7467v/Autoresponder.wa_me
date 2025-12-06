import express from "express";
import { createClient } from "./multiClient.js";
import { runThread } from "./threadEngine.js";
import { setQR, getQR } from "./api/remoteQR.js";

const app = express();
app.use(express.json());

const bots = {};

// 🚀 inicializar bot
async function initBot(id) {
  const client = await createClient(id);

  client.ev.on("connection.update", ({ qr }) => {
    if (qr) setQR(id, qr);
  });

  client.ev.on("messages.upsert", async msg => {
    const text = msg.messages[0]?.message?.conversation;
    if (!text) return;

    const reply = await runThread({ message: text });
    await client.sendMessage(msg.messages[0].key.remoteJid, { text: reply });
  });

  bots[id] = client;
}

initBot("bot1");
initBot("bot2");

// 📌 Obtener QR
app.get("/qr/:bot", (req, res) => {
  res.json({ qr: getQR(req.params.bot) });
});

app.listen(3000, () =>
  console.log("🚀 Autoresponder funcionando en puerto 3000")
);
