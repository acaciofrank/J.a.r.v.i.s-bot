/**
 * Gestão de histórico, pendentes e membros
 *
 * @author Jovem
 */
import { PREFIX } from "../../config.js";
import {
  getPending,
  removePending,
  getAllMembers,
} from "../../utils/purchases.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PURCHASES_FILE = path.resolve(__dirname, "..", "..", "..", "database", "purchases.json");

function readData() {
  if (!fs.existsSync(PURCHASES_FILE)) return {};
  return JSON.parse(fs.readFileSync(PURCHASES_FILE, "utf8"));
}

function writeData(data) {
  fs.writeFileSync(PURCHASES_FILE, JSON.stringify(data, null, 2), "utf8");
}

export default {
  name: "gestao",
  description: "Gestão de histórico, pendentes e membros",
  commands: ["zerarvendas", "zerarstats", "pendentes", "limpar-pendentes", "remmembro", "remghost"],
  usage: `${PREFIX}zerarvendas`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    commandName,
    fullArgs,
    sendReply,
    sendSuccessReply,
    sendWarningReply,
    sendErrorReply,
    isGroup,
    remoteJid,
    webMessage,
  }) => {
    if (!isGroup) {
      await sendErrorReply("Este comando só pode ser usado em grupos!");
      return;
    }

    // ─── ZERAR VENDAS ─────────────────────────────────────────────────
    if (commandName === "zerarvendas") {
      const data = readData();
      if (!data[remoteJid]) {
        await sendWarningReply("Nenhum dado encontrado para este grupo!");
        return;
      }
      data[remoteJid].salesHistory = [];
      writeData(data);
      await sendSuccessReply(
        "╭━━⪩ *VENDAS ZERADAS* ⪨━━\n▢\n▢ ✅ Histórico de vendas apagado!\n▢ ℹ️ Membros e acumulado mantidos.\n▢\n╰━━─「🗑️」─━━"
      );
      return;
    }

    // ─── ZERAR STATS ──────────────────────────────────────────────────
    if (commandName === "zerarstats") {
      const data = readData();
      if (!data[remoteJid]) {
        await sendWarningReply("Nenhum dado encontrado para este grupo!");
        return;
      }
      data[remoteJid].salesHistory = [];
      data[remoteJid].members = {};
      data[remoteJid].processedIds = [];
      data[remoteJid].pending = {};
      writeData(data);
      await sendSuccessReply(
        "╭━━⪩ *RESET COMPLETO* ⪨━━\n▢\n▢ ✅ Histórico, membros, estatísticas\n▢ e pendentes foram apagados!\n▢\n╰━━─「🗑️」─━━"
      );
      return;
    }

    // ─── LISTAR PENDENTES ─────────────────────────────────────────────
    if (commandName === "pendentes") {
      const data = readData();
      const pending = data[remoteJid]?.pending || {};
      const entries = Object.entries(pending);

      if (!entries.length) {
        await sendWarningReply("Não há comprovativos pendentes neste grupo!");
        return;
      }

      let text = "╭━━⪩ *PENDENTES* ⪨━━\n▢\n";
      entries.forEach(([msgId, p], i) => {
        const member = p.userLid?.split("@")[0] || "desconhecido";
        const total = p.total?.toFixed(2) || "N/D";
        const waiting = p.waitingNumber ? " ⏳ aguardando número" : "";
        text += `▢ *${i + 1}.* @${member}\n`;
        text += `▢    💰 Total: ${total} MT${waiting}\n`;
        text += `▢    🆔 \`${msgId}\`\n▢\n`;
      });
      text += `╰━━─「⏳」─━━`;

      const mentions = entries.map(([, p]) => p.userLid).filter(Boolean);
      await sendReply(text, mentions);
      return;
    }

    // ─── LIMPAR PENDENTES ─────────────────────────────────────────────
    if (commandName === "limpar-pendentes") {
      const data = readData();
      if (!data[remoteJid]) {
        await sendWarningReply("Nenhum dado encontrado para este grupo!");
        return;
      }
      const count = Object.keys(data[remoteJid].pending || {}).length;
      if (!count) {
        await sendWarningReply("Não há pendentes para limpar!");
        return;
      }
      data[remoteJid].pending = {};
      writeData(data);
      await sendSuccessReply(
        `╭━━⪩ *PENDENTES LIMPOS* ⪨━━\n▢\n▢ ✅ *${count}* pendente(s) removido(s)!\n▢\n╰━━─「🗑️」─━━`
      );
      return;
    }

    // ─── REMOVER MEMBRO ───────────────────────────────────────────────
    if (commandName === "remmembro") {
      const mentions = webMessage.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

      if (!mentions.length) {
        await sendWarningReply(`Mencione os membros a remover!\nExemplo: ${PREFIX}remmembro @membro1 @membro2`);
        return;
      }

      const data = readData();
      if (!data[remoteJid]?.members) {
        await sendWarningReply("Nenhum membro registado neste grupo!");
        return;
      }

      let removed = 0;
      let notFound = 0;

      for (const jid of mentions) {
        // Tentar por JID completo ou por LID
        const lid = Object.keys(data[remoteJid].members).find(
          (k) => k === jid || k.split("@")[0] === jid.split("@")[0]
        );
        if (lid) {
          delete data[remoteJid].members[lid];
          removed++;
        } else {
          notFound++;
        }
      }

      writeData(data);

      let text = `╭━━⪩ *MEMBROS REMOVIDOS* ⪨━━\n▢\n▢ ✅ Removidos: *${removed}*\n`;
      if (notFound) text += `▢ ⚠️ Não encontrados: *${notFound}*\n`;
      text += `▢\n╰━━─「👤」─━━`;

      await sendSuccessReply(text);
      return;
    }

    // ─── REMOVER GHOSTS ───────────────────────────────────────────────
    if (commandName === "remghost") {
      const data = readData();
      if (!data[remoteJid]?.members) {
        await sendWarningReply("Nenhum membro registado neste grupo!");
        return;
      }

      const members = data[remoteJid].members;
      const ghosts = Object.keys(members).filter((lid) => members[lid].totalPurchases === 0);

      if (!ghosts.length) {
        await sendWarningReply("Não há membros sem compras registadas!");
        return;
      }

      for (const lid of ghosts) {
        delete members[lid];
      }

      writeData(data);

      await sendSuccessReply(
        `╭━━⪩ *GHOSTS REMOVIDOS* ⪨━━\n▢\n▢ ✅ *${ghosts.length}* membro(s) sem compras removido(s)!\n▢\n╰━━─「👻」─━━`
      );
      return;
    }
  },
};
