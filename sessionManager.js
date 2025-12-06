import axios from "axios";

const BASE = "https://base-datos-consulta-pe.fly.dev";

export async function loadSession(botId) {
  try {
    const res = await axios.get(`${BASE}/historial/session_${botId}`);
    return res.data[0]?.session_string || null;
  } catch {
    return null;
  }
}

export async function saveSession(botId, creds) {
  await axios.post(`${BASE}/guardar-post/session_${botId}`, {
    id: botId,
    session_string: JSON.stringify(creds)
  });
}
