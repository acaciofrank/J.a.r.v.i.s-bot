/**
 * Sistema de aluguel de grupos
 * Gerencia os planos ativos dos grupos
 *
 * @author Jovem
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databasePath = path.resolve(__dirname, "..", "..", "database");
const RENTAL_FILE = "rental-groups";

function getRentalFilePath() {
  return path.resolve(databasePath, `${RENTAL_FILE}.json`);
}

function readRental() {
  const fullPath = getRentalFilePath();

  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, JSON.stringify({}));
  }

  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function writeRental(data) {
  const fullPath = getRentalFilePath();
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Ativa o plano de um grupo por X dias
 * @param {string} groupId
 * @param {string} groupName
 * @param {number} days
 */
export function activateRental(groupId, groupName, days) {
  const rentals = readRental();

  const now = new Date();
  const expiration = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  rentals[groupId] = {
    groupName,
    groupId,
    activatedAt: now.toISOString(),
    expiresAt: expiration.toISOString(),
    notified: false,
  };

  writeRental(rentals);
}

/**
 * Remove o plano de um grupo
 * @param {string} groupId
 */
export function removeRental(groupId) {
  const rentals = readRental();

  if (!rentals[groupId]) {
    return;
  }

  delete rentals[groupId];

  writeRental(rentals);
}

/**
 * Verifica se o grupo já foi registrado alguma vez
 * @param {string} groupId
 * @returns {boolean}
 */
export function isRentalRegistered(groupId) {
  const rentals = readRental();
  return !!rentals[groupId];
}

/**
 * Verifica se um grupo tem plano ativo
 * @param {string} groupId
 * @returns {boolean}
 */
export function isRentalActive(groupId) {
  const rentals = readRental();

  if (!rentals[groupId]) {
    return false;
  }

  const expiration = new Date(rentals[groupId].expiresAt);
  const now = new Date();

  return now < expiration;
}

/**
 * Verifica se o plano venceu e ainda não foi notificado
 * @param {string} groupId
 * @returns {boolean}
 */
export function shouldNotifyExpiration(groupId) {
  const rentals = readRental();

  if (!rentals[groupId]) {
    return false;
  }

  const expiration = new Date(rentals[groupId].expiresAt);
  const now = new Date();

  return now >= expiration && !rentals[groupId].notified;
}

/**
 * Marca o grupo como já notificado sobre vencimento
 * @param {string} groupId
 */
export function markAsNotified(groupId) {
  const rentals = readRental();

  if (!rentals[groupId]) {
    return;
  }

  rentals[groupId].notified = true;

  writeRental(rentals);
}

/**
 * Lista todos os grupos com plano (ativos e vencidos)
 * @returns {Array}
 */
export function listRentals() {
  const rentals = readRental();
  const now = new Date();

  return Object.values(rentals).map((rental) => {
    const expiration = new Date(rental.expiresAt);
    const isActive = now < expiration;

    const diffMs = expiration - now;
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return {
      groupName: rental.groupName,
      groupId: rental.groupId,
      expiresAt: expiration.toLocaleDateString("pt-br"),
      isActive,
      daysLeft: isActive ? daysLeft : 0,
    };
  });
}
