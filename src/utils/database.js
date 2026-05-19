/**
 * Funções úteis para trabalhar
 * com dados.
 *
 * @author Dev Gui
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PREFIX, SPIDER_API_TOKEN } from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databasePath = path.resolve(__dirname, "..", "..", "database");

const ANTI_LINK_GROUPS_FILE = "anti-link-groups";
const AUTO_RESPONDER_FILE = "auto-responder";
const AUTO_RESPONDER_GROUPS_FILE = "auto-responder-groups";
const AUTO_STICKER_GROUPS_FILE = "auto-sticker-groups";
const CONFIG_FILE = "config";
const EXIT_GROUPS_FILE = "exit-groups";
const GROUP_RESTRICTIONS_FILE = "group-restrictions";
const INACTIVE_GROUPS_FILE = "inactive-groups";
const MUTE_FILE = "muted";
const ONLY_ADMINS_FILE = "only-admins";
const PREFIX_GROUPS_FILE = "prefix-groups";
const RESTRICTED_MESSAGES_FILE = "restricted-messages";
const WELCOME_GROUPS_FILE = "welcome-groups";

function createIfNotExists(fullPath, formatIfNotExists = []) {
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, JSON.stringify(formatIfNotExists));
  }
}

function readJSON(jsonFile, formatIfNotExists = []) {
  const fullPath = path.resolve(databasePath, `${jsonFile}.json`);
  createIfNotExists(fullPath, formatIfNotExists);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function writeJSON(jsonFile, data, formatIfNotExists = []) {
  const fullPath = path.resolve(databasePath, `${jsonFile}.json`);
  createIfNotExists(fullPath, formatIfNotExists);
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf8");
}

export function activateExitGroup(groupId) {
  const exitGroups = readJSON(EXIT_GROUPS_FILE);
  if (!exitGroups.includes(groupId)) exitGroups.push(groupId);
  writeJSON(EXIT_GROUPS_FILE, exitGroups);
}

export function deactivateExitGroup(groupId) {
  const exitGroups = readJSON(EXIT_GROUPS_FILE);
  const index = exitGroups.indexOf(groupId);
  if (index === -1) return;
  exitGroups.splice(index, 1);
  writeJSON(EXIT_GROUPS_FILE, exitGroups);
}

export function isActiveExitGroup(groupId) {
  return readJSON(EXIT_GROUPS_FILE).includes(groupId);
}

export function activateWelcomeGroup(groupId) {
  const welcomeGroups = readJSON(WELCOME_GROUPS_FILE);
  if (!welcomeGroups.includes(groupId)) welcomeGroups.push(groupId);
  writeJSON(WELCOME_GROUPS_FILE, welcomeGroups);
}

export function deactivateWelcomeGroup(groupId) {
  const welcomeGroups = readJSON(WELCOME_GROUPS_FILE);
  const index = welcomeGroups.indexOf(groupId);
  if (index === -1) return;
  welcomeGroups.splice(index, 1);
  writeJSON(WELCOME_GROUPS_FILE, welcomeGroups);
}

export function isActiveWelcomeGroup(groupId) {
  return readJSON(WELCOME_GROUPS_FILE).includes(groupId);
}

export function activateGroup(groupId) {
  const inactiveGroups = readJSON(INACTIVE_GROUPS_FILE);
  const index = inactiveGroups.indexOf(groupId);
  if (index === -1) return;
  inactiveGroups.splice(index, 1);
  writeJSON(INACTIVE_GROUPS_FILE, inactiveGroups);
}

export function deactivateGroup(groupId) {
  const inactiveGroups = readJSON(INACTIVE_GROUPS_FILE);
  if (!inactiveGroups.includes(groupId)) inactiveGroups.push(groupId);
  writeJSON(INACTIVE_GROUPS_FILE, inactiveGroups);
}

export function isActiveGroup(groupId) {
  return !readJSON(INACTIVE_GROUPS_FILE).includes(groupId);
}

export function activateAutoResponderGroup(groupId) {
  const autoResponderGroups = readJSON(AUTO_RESPONDER_GROUPS_FILE);
  if (!autoResponderGroups.includes(groupId)) autoResponderGroups.push(groupId);
  writeJSON(AUTO_RESPONDER_GROUPS_FILE, autoResponderGroups);
}

export function deactivateAutoResponderGroup(groupId) {
  const autoResponderGroups = readJSON(AUTO_RESPONDER_GROUPS_FILE);
  const index = autoResponderGroups.indexOf(groupId);
  if (index === -1) return;
  autoResponderGroups.splice(index, 1);
  writeJSON(AUTO_RESPONDER_GROUPS_FILE, autoResponderGroups);
}

export function isActiveAutoResponderGroup(groupId) {
  return readJSON(AUTO_RESPONDER_GROUPS_FILE).includes(groupId);
}

export function activateAntiLinkGroup(groupId) {
  const antiLinkGroups = readJSON(ANTI_LINK_GROUPS_FILE);
  if (!antiLinkGroups.includes(groupId)) antiLinkGroups.push(groupId);
  writeJSON(ANTI_LINK_GROUPS_FILE, antiLinkGroups);
}

export function deactivateAntiLinkGroup(groupId) {
  const antiLinkGroups = readJSON(ANTI_LINK_GROUPS_FILE);
  const index = antiLinkGroups.indexOf(groupId);
  if (index === -1) return;
  antiLinkGroups.splice(index, 1);
  writeJSON(ANTI_LINK_GROUPS_FILE, antiLinkGroups);
}

export function isActiveAntiLinkGroup(groupId) {
  return readJSON(ANTI_LINK_GROUPS_FILE).includes(groupId);
}

export function activateAutoStickerGroup(groupId) {
  const autoStickerGroups = readJSON(AUTO_STICKER_GROUPS_FILE);
  if (!autoStickerGroups.includes(groupId)) autoStickerGroups.push(groupId);
  writeJSON(AUTO_STICKER_GROUPS_FILE, autoStickerGroups);
}

export function deactivateAutoStickerGroup(groupId) {
  const autoStickerGroups = readJSON(AUTO_STICKER_GROUPS_FILE);
  const index = autoStickerGroups.indexOf(groupId);
  if (index === -1) return;
  autoStickerGroups.splice(index, 1);
  writeJSON(AUTO_STICKER_GROUPS_FILE, autoStickerGroups);
}

export function isActiveAutoStickerGroup(groupId) {
  return readJSON(AUTO_STICKER_GROUPS_FILE).includes(groupId);
}

export function muteMember(groupId, memberId) {
  const mutedMembers = readJSON(MUTE_FILE, {});
  if (!mutedMembers[groupId]) mutedMembers[groupId] = [];
  if (!mutedMembers[groupId].includes(memberId)) mutedMembers[groupId].push(memberId);
  writeJSON(MUTE_FILE, mutedMembers);
}

export function unmuteMember(groupId, memberId) {
  const mutedMembers = readJSON(MUTE_FILE, {});
  if (!mutedMembers[groupId]) return;
  const index = mutedMembers[groupId].indexOf(memberId);
  if (index !== -1) mutedMembers[groupId].splice(index, 1);
  writeJSON(MUTE_FILE, mutedMembers);
}

export function checkIfMemberIsMuted(groupId, memberId) {
  const mutedMembers = readJSON(MUTE_FILE, {});
  if (!mutedMembers[groupId]) return false;
  return mutedMembers[groupId].includes(memberId);
}

export function activateOnlyAdmins(groupId) {
  const onlyAdminsGroups = readJSON(ONLY_ADMINS_FILE, []);
  if (!onlyAdminsGroups.includes(groupId)) onlyAdminsGroups.push(groupId);
  writeJSON(ONLY_ADMINS_FILE, onlyAdminsGroups);
}

export function deactivateOnlyAdmins(groupId) {
  const onlyAdminsGroups = readJSON(ONLY_ADMINS_FILE, []);
  const index = onlyAdminsGroups.indexOf(groupId);
  if (index === -1) return;
  onlyAdminsGroups.splice(index, 1);
  writeJSON(ONLY_ADMINS_FILE, onlyAdminsGroups);
}

export function isActiveOnlyAdmins(groupId) {
  return readJSON(ONLY_ADMINS_FILE, []).includes(groupId);
}

export function readGroupRestrictions() {
  return readJSON(GROUP_RESTRICTIONS_FILE, {});
}

export function saveGroupRestrictions(restrictions) {
  writeJSON(GROUP_RESTRICTIONS_FILE, restrictions, {});
}

export function isActiveGroupRestriction(groupId, restriction) {
  const restrictions = readGroupRestrictions();
  if (!restrictions[groupId]) return false;
  return restrictions[groupId][restriction] === true;
}

export function updateIsActiveGroupRestriction(groupId, restriction, isActive) {
  const restrictions = readGroupRestrictions();
  if (!restrictions[groupId]) restrictions[groupId] = {};
  restrictions[groupId][restriction] = isActive;
  saveGroupRestrictions(restrictions);
}

export function readRestrictedMessageTypes() {
  return readJSON(RESTRICTED_MESSAGES_FILE, {
    sticker: "stickerMessage",
    video: "videoMessage",
    image: "imageMessage",
    audio: "audioMessage",
    product: "productMessage",
    document: "documentMessage",
    event: "eventMessage",
  });
}

export function setPrefix(groupJid, prefix) {
  const prefixGroups = readJSON(PREFIX_GROUPS_FILE, {});
  prefixGroups[groupJid] = prefix;
  writeJSON(PREFIX_GROUPS_FILE, prefixGroups, {});
}

export function getPrefix(groupJid) {
  const prefixGroups = readJSON(PREFIX_GROUPS_FILE, {});
  return prefixGroups[groupJid] || PREFIX;
}

// ─── AUTO-RESPONDER POR GRUPO ─────────────────────────────────────────────────

export function getAutoResponderResponse(groupId, match) {
  const responses = readJSON(AUTO_RESPONDER_FILE, {});
  const groupResponses = responses[groupId] || [];
  const matchUpperCase = match.toLocaleUpperCase();
  const data = groupResponses.find(
    (r) => r.match.toLocaleUpperCase() === matchUpperCase
  );
  if (!data) return null;
  return data.answer;
}

export function addAutoResponderItem(groupId, match, answer) {
  const responses = readJSON(AUTO_RESPONDER_FILE, {});
  if (!responses[groupId]) responses[groupId] = [];
  const matchUpperCase = match.toLocaleUpperCase();
  const exists = responses[groupId].find(
    (r) => r.match.toLocaleUpperCase() === matchUpperCase
  );
  if (exists) return false;
  responses[groupId].push({ match: match.trim(), answer: answer.trim() });
  writeJSON(AUTO_RESPONDER_FILE, responses, {});
  return true;
}

export function listAutoResponderItems(groupId) {
  const responses = readJSON(AUTO_RESPONDER_FILE, {});
  const groupResponses = responses[groupId] || [];
  return groupResponses.map((item, index) => ({
    key: index + 1,
    match: item.match,
    answer: item.answer,
  }));
}

export function removeAutoResponderItemByKey(groupId, key) {
  const responses = readJSON(AUTO_RESPONDER_FILE, {});
  if (!responses[groupId]) return false;
  const index = key - 1;
  if (index < 0 || index >= responses[groupId].length) return false;
  responses[groupId].splice(index, 1);
  writeJSON(AUTO_RESPONDER_FILE, responses, {});
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────

export function setSpiderApiToken(token) {
  const config = readJSON(CONFIG_FILE, {});
  config.spider_api_token = token;
  writeJSON(CONFIG_FILE, config, {});
}

export function getSpiderApiToken() {
  const config = readJSON(CONFIG_FILE, {});
  return config.spider_api_token || SPIDER_API_TOKEN;
}
