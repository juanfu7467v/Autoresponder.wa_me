let qrStore = {};

export function setQR(botId, qr) {
  qrStore[botId] = qr;
}

export function getQR(botId) {
  return qrStore[botId] || null;
}
