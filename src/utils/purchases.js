/**
 * Sistema de compras — estado, pendentes, histórico e estatísticas
 *
 * @author Jovem
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databasePath = path.resolve(__dirname, "..", "..", "database");
const PURCHASES_FILE = path.resolve(databasePath, "purchases.json");

const lastNumberSent = {};

function readData() {
  if (!fs.existsSync(PURCHASES_FILE)) {
    fs.writeFileSync(PURCHASES_FILE, JSON.stringify({}), "utf8");
  }
  return JSON.parse(fs.readFileSync(PURCHASES_FILE, "utf8"));
}

function writeData(data) {
  fs.writeFileSync(PURCHASES_FILE, JSON.stringify(data, null, 2), "utf8");
}

function ensureGroup(data, groupId) {
  if (!data[groupId]) {
    data[groupId] = {
      active: false,
      groupName: "",
      processedIds: [],
      pending: {},
      members: {},
      salesHistory: [],
    };
  }
  if (!data[groupId].salesHistory) data[groupId].salesHistory = [];
}

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

// ─── ATIVAÇÃO ─────────────────────────────────────────────────────────────────

export function setPurchasesActive(groupId, groupName, active) {
  const data = readData();
  ensureGroup(data, groupId);
  data[groupId].active = active;
  data[groupId].groupName = groupName;
  writeData(data);
}

export function isPurchasesActive(groupId) {
  const data = readData();
  return data[groupId]?.active === true;
}

export function getActiveGroups() {
  const data = readData();
  return Object.values(data).filter((g) => g.active === true);
}

// ─── NÚMERO TEMPORÁRIO ────────────────────────────────────────────────────────

export function saveLastNumber(groupId, memberLid, number) {
  if (!lastNumberSent[groupId]) lastNumberSent[groupId] = {};
  lastNumberSent[groupId][memberLid] = number;
}

export function getLastNumber(groupId, memberLid) {
  return lastNumberSent[groupId]?.[memberLid] || null;
}

export function clearLastNumber(groupId, memberLid) {
  if (lastNumberSent[groupId]) delete lastNumberSent[groupId][memberLid];
}

// ─── IDs PROCESSADOS ─────────────────────────────────────────────────────────

export function findProcessedId(groupId, transactionId) {
  const data = readData();
  ensureGroup(data, groupId);
  return data[groupId].processedIds.find((t) => t.id === transactionId) || null;
}

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

export function savePending(groupId, messageId, payload) {
  const data = readData();
  ensureGroup(data, groupId);
  data[groupId].pending[messageId] = { ...payload, savedAt: new Date().toISOString() };
  writeData(data);
}

export function getPending(groupId, messageId) {
  const data = readData();
  ensureGroup(data, groupId);
  return data[groupId].pending[messageId] || null;
}

export function removePending(groupId, messageId) {
  const data = readData();
  ensureGroup(data, groupId);
  delete data[groupId].pending[messageId];
  writeData(data);
}

export function getPendingByMember(groupId, memberLid) {
  const data = readData();
  ensureGroup(data, groupId);
  const entries = Object.entries(data[groupId].pending);
  const found = entries.find(([, v]) => v.userLid === memberLid && v.waitingNumber === true);
  if (!found) return null;
  return { messageId: found[0], ...found[1] };
}

export function setPendingWaitingNumber(groupId, messageId) {
  const data = readData();
  ensureGroup(data, groupId);
  if (data[groupId].pending[messageId]) {
    data[groupId].pending[messageId].waitingNumber = true;
    writeData(data);
  }
}

// ─── ESTATÍSTICAS ─────────────────────────────────────────────────────────────

export function parseMb(description) {
  if (!description) return 0;
  const raw = description.match(/[\d.,]+/)?.[0] || "0";
  const clean = raw.replace(/\.(?=\d{3}(\.|$))/g, "").replace(",", ".");
  return parseFloat(clean) || 0;
}

export function registerPurchase(groupId, memberLid, memberName, mb, amount, transactionIds, product) {
  const data = readData();
  ensureGroup(data, groupId);

  const todayKey = getTodayKey();
  const now = new Date();
  const hour = now.getHours();

  // ─── HISTÓRICO GERAL DE VENDAS ────────────────────────────────────
  data[groupId].salesHistory.push({
    date: now.toISOString(),
    dateKey: todayKey,
    weekKey: getWeekKey(now),
    monthKey: getMonthKey(now),
    hour,
    memberLid,
    memberName,
    mb,
    amount,
    transactionIds,
    category: product?.category || "N/D",
    description: product?.description || "N/D",
    isDiamond: product?.category === "Tudo Top",
  });

  // ─── ESTATÍSTICAS DO MEMBRO ───────────────────────────────────────
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

  if (member.todayKey !== todayKey) {
    member.todayKey = todayKey;
    member.todayPurchases = 0;
    member.todayMb = 0;
  }

  member.memberName = memberName;
  member.totalPurchases += 1;
  member.totalMb = parseFloat((member.totalMb + mb).toFixed(2));
  member.totalAmount = parseFloat((member.totalAmount + amount).toFixed(2));
  member.todayPurchases += 1;
  member.todayMb = parseFloat((member.todayMb + mb).toFixed(2));

  member.history.push({
    date: now.toISOString(),
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

function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getDayRanking(groupId) {
  const data = readData();
  ensureGroup(data, groupId);
  const todayKey = getTodayKey();
  return Object.values(data[groupId].members)
    .filter((m) => m.todayKey === todayKey && m.todayMb > 0)
    .sort((a, b) => b.todayMb - a.todayMb);
}

export function getGeneralRanking(groupId) {
  const data = readData();
  ensureGroup(data, groupId);
  return Object.values(data[groupId].members)
    .filter((m) => m.totalMb > 0)
    .sort((a, b) => b.totalMb - a.totalMb);
}

export function getSalesHistory(groupId) {
  const data = readData();
  ensureGroup(data, groupId);
  return data[groupId].salesHistory || [];
}

export function getAllMembers(groupId) {
  const data = readData();
  ensureGroup(data, groupId);
  return Object.values(data[groupId].members);
}

export function getReport(groupId) {
  const data = readData();
  ensureGroup(data, groupId);
  const members = Object.values(data[groupId].members).sort((a, b) => b.totalMb - a.totalMb);
  const totalMb = parseFloat(members.reduce((s, m) => s + m.totalMb, 0).toFixed(2));
  const totalPurchases = members.reduce((s, m) => s + m.totalPurchases, 0);
  const totalAmount = parseFloat(members.reduce((s, m) => s + m.totalAmount, 0).toFixed(2));
  return { members, totalMb, totalPurchases, totalAmount };
}
