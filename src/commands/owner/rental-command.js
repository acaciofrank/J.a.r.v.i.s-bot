/**
 * Comando para ativar o plano de aluguel de um grupo
 * Uso: /rental ID_DO_GRUPO DIAS
 *
 * @author Jovem
 */
import { PREFIX } from "../../config.js";
import { activateRental } from "../../utils/rental.js";

export default {
  name: "rental",
  description: "Ativa o plano de aluguel de um grupo por X dias",
  commands: ["rental"],
  usage: `${PREFIX}rental ID_DO_GRUPO DIAS`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({ fullArgs, sendReply, socket, remoteJid }) => {
    // fullArgs = "120363424670968147@g.us 45"
    // Separamos pelo último espaço para pegar dias, e o resto é o ID
    const parts = fullArgs.trim().split(" ");

    if (parts.length < 2) {
      await sendReply(
        `❌ Uso correto: ${PREFIX}rental ID_DO_GRUPO DIAS\n\nExemplo: ${PREFIX}rental 120363424670968147@g.us 30`
      );
      return;
    }

    const days = parseInt(parts[parts.length - 1]);
    const groupId = parts.slice(0, parts.length - 1).join(" ").trim();

    if (!groupId || isNaN(days) || days <= 0) {
      await sendReply(
        `❌ Uso correto: ${PREFIX}rental ID_DO_GRUPO DIAS\n\nExemplo: ${PREFIX}rental 120363424670968147@g.us 30`
      );
      return;
    }

    // Tenta buscar o nome do grupo
    let groupName = "Grupo sem nome";

    try {
      const groupMeta = await socket.groupMetadata(groupId);
      groupName = groupMeta.subject || "Grupo sem nome";
    } catch {
      groupName = "Grupo sem nome";
    }

    activateRental(groupId, groupName, days);

    const expiration = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000
    ).toLocaleDateString("pt-br");

    await sendReply(
      `╭━━⪩ RENTAL ATIVADO ⪨━━\n▢\n▢ ✅ Plano ativado com sucesso!\n▢\n▢ 📋 Grupo: ${groupName}\n▢ 🆔 ID: ${groupId}\n▢ 📅 Vencimento: ${expiration}\n▢ ⏳ Dias: ${days}\n▢\n╰━━─「🔑」─━━`
    );
  },
};
