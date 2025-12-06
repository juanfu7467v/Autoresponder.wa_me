import { workerData, parentPort } from "worker_threads";

function processMessage({ message }) {
  return `Hola 👋 recibí tu mensaje: ${message}`;
}

const response = processMessage(workerData);
parentPort.postMessage(response);
