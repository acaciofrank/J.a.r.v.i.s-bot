/**
 * Gestão de contas de pagamento por grupo.
 * Suporta E-Mola, M-Pesa e Millennium BIM.
 *
 * @author Jovem
 */
import { PREFIX } from "../../config.js";
import {
  addAccount,
  removeAccount,
  getAccounts,
} from "../../utils/accounts.js";

export default {
  name: "accounts",
  description: "Gestão de contas E-Mola, M-Pesa e Millennium BIM do grupo",
  commands: [
    "addemola",
    "rememola",
    "addmpesa",
    "remmpesa",
    "addbim",
    "rembim",
    "contas",
  ],
  usage: `${PREFIX}addemola número - Nome`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    commandName,
    fullArgs,
    sendReply,
    sendErrorReply,
    sendWarningReply,
    sendSuccessReply,
    isGroup,
    remoteJid,
    getGroupName,
  }) => {
    if (!isGroup) {
      await sendErrorReply("Este comando só pode ser usado em grupos!");
      return;
    }

    // ─── MAPA DE TIPOS ────────────────────────────────────────────────
    const typeMap = {
      addemola: "emola",
      rememola: "emola",
      addmpesa: "mpesa",
      remmpesa: "mpesa",
      addbim: "bim",
      rembim: "bim",
    };

    const labelMap = {
      emola: "E-Mola",
      mpesa: "M-Pesa",
      bim: "Millennium BIM",
    };
    // ─────────────────────────────────────────────────────────────────

    // ─── LISTAR CONTAS (/contas) ──────────────────────────────────────
    if (commandName === "contas") {
      const data = getAccounts(remoteJid);

      if (!data) {
        await sendWarningReply("Este grupo ainda não possui contas registadas!");
        return;
      }

      const formatList = (list, label) => {
        if (!list || list.length === 0) return `▢ _Nenhuma conta ${label}_`;
        return list
          .map((a) => `▢ *${a.index}.* ${a.number} — ${a.name}`)
          .join("\n");
      };

      const text =
        `╭━━⪩ *CONTAS DO GRUPO* ⪨━━\n▢\n` +
        `▢ 🟠 *E-Mola*\n${formatList(data.emola, "E-Mola")}\n▢\n` +
        `▢ 🔴 *M-Pesa*\n${formatList(data.mpesa, "M-Pesa")}\n▢\n` +
        `▢ 🟥 *Millennium BIM*\n${formatList(data.bim, "BIM")}\n▢\n` +
        `╰━━─「💳」─━━`;

      await sendReply(text);
      return;
    }
    // ─────────────────────────────────────────────────────────────────

    const type = typeMap[commandName];
    const label = labelMap[type];
    const isAdd = commandName.startsWith("add");

    // ─── ADICIONAR CONTA ──────────────────────────────────────────────
    if (isAdd) {
      if (!fullArgs || !fullArgs.includes("-")) {
        await sendWarningReply(
          `Formato inválido! Use:\n${PREFIX}${commandName} número - Nome\n\nExemplo: ${PREFIX}${commandName} 84XXXXXXX - João`
        );
        return;
      }

      const [number, ...nameParts] = fullArgs.split("-");
      const accountNumber = number.trim();
      const accountName = nameParts.join("-").trim();

      if (!accountNumber || !accountName) {
        await sendWarningReply(
          `Formato inválido! Use:\n${PREFIX}${commandName} número - Nome`
        );
        return;
      }

      const groupName = await getGroupName();
      const index = addAccount(remoteJid, groupName, type, accountNumber, accountName);

      await sendSuccessReply(
        `╭━━⪩ *CONTA ADICIONADA* ⪨━━\n▢\n▢ 💳 *Tipo:* ${label}\n▢ 🔢 *Número:* ${accountNumber}\n▢ 👤 *Nome:* ${accountName}\n▢ 🆔 *Índice:* ${index}\n▢\n╰━━─「✅」─━━`
      );
      return;
    }
    // ─────────────────────────────────────────────────────────────────

    // ─── REMOVER CONTA ────────────────────────────────────────────────
    const index = parseInt(fullArgs?.trim());

    if (isNaN(index)) {
      await sendWarningReply(
        `Informe o índice da conta a remover!\nExemplo: ${PREFIX}${commandName} 1`
      );
      return;
    }

    const removed = removeAccount(remoteJid, type, index);

    if (!removed) {
      await sendErrorReply(
        `Nenhuma conta ${label} encontrada com o índice *${index}*!\nUse ${PREFIX}contas para ver os índices disponíveis.`
      );
      return;
    }

    await sendSuccessReply(
      `╭━━⪩ *CONTA REMOVIDA* ⪨━━\n▢\n▢ 💳 *Tipo:* ${label}\n▢ 🆔 *Índice removido:* ${index}\n▢\n╰━━─「🗑️」─━━`
    );
    // ─────────────────────────────────────────────────────────────────
  },
};
