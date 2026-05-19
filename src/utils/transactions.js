/**
 * Sistema de transações, estatísticas e histórico por grupo
 * Persistência total — nada é apagado
 *
 * @author Jovem
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databasePath = path.resolve(__dirname, "..", "..", "database");
const TRANSACTIONS_FILE = path.resolve(databasePath, "transactions.json");

function readData() {
  if (!fs.existsSync(TRANSACTIONS_FILE)) {
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify({}), "utf8");
  }
  return JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, "utf8"));
}

function writeData(data) {
  fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(data, null, 2), "utf8");
}

function ensureGroup(data, groupId) {
  if (!data[groupId]) {
    data[groupId] = {
      processedIds: [],
      pending: {},
      members: {},
    };
  }
}

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

// ─── IDs PROCESSADOS (anti-duplicado) ────────────────────────────────────────

/**
 * Verifica se um ID já foi processado
 * @param {string} groupId
 * @param {string} transactionId
 * @returns {object|null} dados do registo ou null
 */
export function findProcessedId(groupId, transactionId) {
  const data = readData();
  ensureGroup(data, groupId);
  return (
    data[groupId].processedIds.find((t) => t.id === transactionId) || null
  );
}

/**
 * Marca um ID como processado
 * @param {string} groupId
 * @param {string} transactionId
 * @param {string} memberLid
 */
export function markIdAsProcessed(groupId, transactionId, memberLid) {
  const data = readData();
  ensureGroup(data, groupId);

  const now = new Date();
  data[groupId].processedIds.push({
    id: transactionId,
    memberLid,
    processedAt: now.toISOString(),
    time: now.toLocaleTimeString("pt-BR"),
  });

  writeData(data);
}

// ─── PENDENTES ────────────────────────────────────────────────────────────────

/**
 * Guarda um comprovativo pendente aguardando reação ✅
 * @param {string} groupId
 * @param {string} messageId
 * @param {object} payload
 */
export function savePending(groupId, messageId, payload) {
  const data = readData();
  ensureGroup(data, groupId);
  data[groupId].pending[messageId] = {
    ...payload,
    savedAt: new Date().toISOString(),
  };
  writeData(data);
}

/**
 * Busca um comprovativo pendente pelo ID da mensagem
 * @param {string} groupId
 * @param {string} messageId
 * @returns {object|null}
 */
export function getPending(groupId, messageId) {
  const data = readData();
  ensureGroup(data, groupId);
  return data[groupId].pending[messageId] || null;
}

/**
 * Remove um comprovativo pendente
 * @param {string} groupId
 * @param {string} messageId
 */
export function removePending(groupId, messageId) {
  const data = readData();
  ensureGroup(data, groupId);
  delete data[groupId].pending[messageId];
  writeData(data);
}

// ─── ESTATÍSTICAS ─────────────────────────────────────────────────────────────

/**
 * Regista uma compra concluída e atualiza estatísticas do membro
 * @param {string} groupId
 * @param {string} memberLid
 * @param {string} memberName
 * @param {number} mb — quantidade em MB
 * @param {number} amount — valor em MT
 * @param {string[]} transactionIds
 */
export function registerPurchase(groupId, memberLid, memberName, mb, amount, transactionIds) {
  const data = readData();
  ensureGroup(data, groupId);

  const todayKey = getTodayKey();

  if (!data[groupId].members[memberLid]) {
    data[groupId].members[memberLid] = {
      memberLid,
      memberName,
      totalPurchases: 0,
      totalMb: 0,
      totalAmount: 0,
      todayKey: "",
      todayPurchases: 0,
      todayMb: 0,
      history: [],
    };
  }

  const member = data[groupId].members[memberLid];

  // Reset do dia se mudou
  if (member.todayKey !== todayKey) {
    member.todayKey = todayKey;
    member.todayPurchases = 0;
    member.todayMb = 0;
  }

  member.memberName = memberName;
  member.totalPurchases += 1;
  member.totalMb += mb;
  member.totalAmount += amount;
  member.todayPurchases += 1;
  member.todayMb += mb;

  member.history.push({
    date: new Date().toISOString(),
    mb,
    amount,
    transactionIds,
  });

  writeData(data);

  return {
    totalPurchases: member.totalPurchases,
    totalMb: member.totalMb,
    todayPurchases: member.todayPurchases,
    todayMb: member.todayMb,
  };
}

/**
 * Retorna o ranking do dia de um grupo
 * @param {string} groupId
 * @returns {Array}
 */
export function getDayRanking(groupId) {
  const data = readData();
  ensureGroup(data, groupId);

  const todayKey = getTodayKey();

  return Object.values(data[groupId].members)
    .filter((m) => m.todayKey === todayKey && m.todayMb > 0)
    .sort((a, b) => b.todayMb - a.todayMb);
}

/**
 * Retorna o ranking geral de um grupo
 * @param {string} groupId
 * @returns {Array}
 */
export function getGeneralRanking(groupId) {
  const data = readData();
  ensureGroup(data, groupId);

  return Object.values(data[groupId].members)
    .filter((m) => m.totalMb > 0)
    .sort((a, b) => b.totalMb - a.totalMb);
}

/**
 * Retorna estatísticas completas para o relatório
 * @param {string} groupId
 * @returns {object}
 */
export function getReport(groupId) {
  const data = readData();
  ensureGroup(data, groupId);

  const members = Object.values(data[groupId].members).sort(
    (a, b) => b.totalMb - a.totalMb
  );

  const totalMb = members.reduce((sum, m) => sum + m.totalMb, 0);
  const totalPurchases = members.reduce((sum, m) => sum + m.totalPurchases, 0);
  const totalAmount = members.reduce((sum, m) => sum + m.totalAmount, 0);

  return { members, totalMb, totalPurchases, totalAmount };
}
