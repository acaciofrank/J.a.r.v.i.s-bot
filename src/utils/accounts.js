/**
 * Sistema de gestão de contas por grupo
 * Gerencia contas E-Mola, M-Pesa e Millennium BIM
 *
 * @author Jovem
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databasePath = path.resolve(__dirname, "..", "..", "database");
const ACCOUNTS_FILE = path.resolve(databasePath, "accounts.json");

function readAccounts() {
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify({}), "utf8");
  }
  return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf8"));
}

function writeAccounts(data) {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2), "utf8");
}

function ensureGroup(accounts, groupId, groupName) {
  if (!accounts[groupId]) {
    accounts[groupId] = {
      groupName,
      groupId,
      emola: [],
      mpesa: [],
      bim: [],
    };
  } else {
    accounts[groupId].groupName = groupName;
  }
}

/**
 * Adiciona uma conta ao grupo
 * @param {string} groupId
 * @param {string} groupName
 * @param {"emola"|"mpesa"|"bim"} type
 * @param {string} number
 * @param {string} name
 */
export function addAccount(groupId, groupName, type, number, name) {
  const accounts = readAccounts();
  ensureGroup(accounts, groupId, groupName);

  const list = accounts[groupId][type];
  const nextIndex = list.length > 0 ? list[list.length - 1].index + 1 : 1;

  list.push({ index: nextIndex, number, name });
  writeAccounts(accounts);

  return nextIndex;
}

/**
 * Remove uma conta pelo índice
 * @param {string} groupId
 * @param {"emola"|"mpesa"|"bim"} type
 * @param {number} index
 * @returns {boolean}
 */
export function removeAccount(groupId, type, index) {
  const accounts = readAccounts();

  if (!accounts[groupId]) return false;

  const list = accounts[groupId][type];
  const pos = list.findIndex((a) => a.index === index);

  if (pos === -1) return false;

  list.splice(pos, 1);
  writeAccounts(accounts);

  return true;
}

/**
 * Retorna todas as contas do grupo
 * @param {string} groupId
 * @returns {{ emola: Array, mpesa: Array, bim: Array } | null}
 */
export function getAccounts(groupId) {
  const accounts = readAccounts();
  if (!accounts[groupId]) return null;
  return accounts[groupId];
}
