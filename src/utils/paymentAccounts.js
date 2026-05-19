/**
 * Sistema de contas de pagamento por grupo
 * Gerencia as contas M-Pesa, e-Mola e BIM de cada grupo
 *
 * @author Jovem
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databasePath = path.resolve(__dirname, "..", "..", "database");
const ACCOUNTS_FILE = "payment-accounts";

function getAccountsFilePath() {
  return path.resolve(databasePath, `${ACCOUNTS_FILE}.json`);
}

function readAccounts() {
  const fullPath = getAccountsFilePath();

  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, JSON.stringify({}));
  }

  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function writeAccounts(data) {
  const fullPath = getAccountsFilePath();
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf8");
}

function ensureGroupAccounts(accounts, groupId) {
  if (!accounts[groupId]) {
    accounts[groupId] = {
      mpesa: [],
      emola: [],
      bim: [],
    };
  }
}

/**
 * Adiciona uma conta ao grupo
 * @param {string} groupId
 * @param {string} type - "mpesa" | "emola" | "bim"
 * @param {string} number
 * @param {string} name
 */
export function addAccount(groupId, type, number, name) {
  const accounts = readAccounts();

  ensureGroupAccounts(accounts, groupId);

  accounts[groupId][type].push({ number, name });

  writeAccounts(accounts);
}

/**
 * Remove uma conta do grupo pelo índice (1-based)
 * @param {string} groupId
 * @param {string} type - "mpesa" | "emola" | "bim"
 * @param {number} index - posição na lista (começa em 1)
 * @returns {boolean}
 */
export function removeAccount(groupId, type, index) {
  const accounts = readAccounts();

  ensureGroupAccounts(accounts, groupId);

  const list = accounts[groupId][type];

  if (index < 1 || index > list.length) {
    return false;
  }

  list.splice(index - 1, 1);

  writeAccounts(accounts);

  return true;
}

/**
 * Retorna todas as contas do grupo
 * @param {string} groupId
 * @returns {{ mpesa: Array, emola: Array, bim: Array }}
 */
export function getGroupAccounts(groupId) {
  const accounts = readAccounts();

  ensureGroupAccounts(accounts, groupId);

  return accounts[groupId];
}

/**
 * Verifica se um número pertence às contas válidas do grupo
 * @param {string} groupId
 * @param {string} number
 * @returns {{ valid: boolean, type: string|null, name: string|null }}
 */
export function isValidAccount(groupId, number) {
  const accounts = readAccounts();

  if (!accounts[groupId]) {
    return { valid: false, type: null, name: null };
  }

  const types = ["mpesa", "emola", "bim"];

  for (const type of types) {
    const found = accounts[groupId][type].find(
      (acc) => acc.number === number.trim()
    );

    if (found) {
      return { valid: true, type, name: found.name };
    }
  }

  return { valid: false, type: null, name: null };
}
