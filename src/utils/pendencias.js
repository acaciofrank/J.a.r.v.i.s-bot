/**
 * Sistema de pendências de pagamento por grupo
 *
 * @author Jovem
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databasePath = path.resolve(__dirname, "..", "..", "database");
const PENDENCIAS_FILE = "pendencias";

function getFilePath() {
  return path.resolve(databasePath, `${PENDENCIAS_FILE}.json`);
}

function readPendencias() {
  const fullPath = getFilePath();
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, JSON.stringify({}));
  }
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function writePendencias(data) {
  fs.writeFileSync(getFilePath(), JSON.stringify(data, null, 2), "utf8");
}

/**
 * Adiciona uma pendência ao grupo
 * @param {string} groupId
 * @param {string} transactionId
 * @param {string} userLid
 * @param {object} data - dados do comprovativo
 * @param {string} messageId - ID da mensagem no WhatsApp
 */
export function addPendencia(groupId, transactionId, userLid, data, messageId) {
  const pendencias = readPendencias();

  if (!pendencias[groupId]) {
    pendencias[groupId] = {};
  }

  pendencias[groupId][transactionId] = {
    transactionId,
    userLid,
    messageId,
    valor: data.valor,
    conta: data.conta,
    tipo: data.tipo,
    data: data.data,
    hora: data.hora,
    registradoEm: new Date().toISOString(),
  };

  writePendencias(pendencias);
}

/**
 * Remove uma pendência do grupo
 * @param {string} groupId
 * @param {string} transactionId
 */
export function removePendencia(groupId, transactionId) {
  const pendencias = readPendencias();

  if (!pendencias[groupId] || !pendencias[groupId][transactionId]) {
    return false;
  }

  delete pendencias[groupId][transactionId];

  writePendencias(pendencias);

  return true;
}

/**
 * Lista todas as pendências do grupo
 * @param {string} groupId
 * @returns {Array}
 */
export function listPendencias(groupId) {
  const pendencias = readPendencias();

  if (!pendencias[groupId]) return [];

  return Object.values(pendencias[groupId]);
}

/**
 * Remove pendências com mais de 24 horas
 * @param {string} groupId
 * @returns {number} quantidade removida
 */
export function limparPendenciasAntigas(groupId) {
  const pendencias = readPendencias();

  if (!pendencias[groupId]) return 0;

  const now = new Date();
  const limite = 24 * 60 * 60 * 1000; // 24h em ms
  let removidas = 0;

  for (const [id, pendencia] of Object.entries(pendencias[groupId])) {
    const registrado = new Date(pendencia.registradoEm);
    if (now - registrado >= limite) {
      delete pendencias[groupId][id];
      removidas++;
    }
  }

  writePendencias(pendencias);

  return removidas;
}
