// Almacén en memoria
const qrStore = {};

// Guardar QR
export function setQR(bot, qr) {
  qrStore[bot] = qr;
}

// Obtener QR
export function getQR(bot) {
  return qrStore[bot] || null;
}

// Eliminar QR
export function clearQR(bot) {
  delete qrStore[bot];
}
