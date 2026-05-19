/**
 * Comando para remover o plano de aluguel de um grupo
 * Uso: /remove-rental ID_DO_GRUPO
 *
 * @author Jovem
 */
import { PREFIX } from "../../config.js";
import { removeRental, isRentalRegistered } from "../../utils/rental.js";

export default {
  name: "remove-rental",
  description: "Remove o plano de aluguel de um grupo",
  commands: ["remove-rental"],
  usage: `${PREFIX}remove-rental ID_DO_GRUPO`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({ fullArgs, sendReply, socket }) => {
    const groupId = fullArgs.trim();

    if (!groupId) {
      await sendReply(
        `❌ Uso correto: ${PREFIX}remove-rental ID_DO_GRUPO\n\nExemplo: ${PREFIX}remove-rental 120363424670968147@g.us`
      );
      return;
    }

    if (!isRentalRegistered(groupId)) {
      await sendReply("❌ Este grupo não está registrado no sistema de aluguel.");
      return;
    }

    removeRental(groupId);

    // Avisa o grupo que o plano foi cancelado
    try {
      await socket.sendMessage(groupId, {
        text:
          "╭━━⪩ PLANO CANCELADO ⪨━━\n▢\n▢ ⚠️ O plano deste grupo foi cancelado!\n▢\n▢ Para reactivar, entre em contacto:\n▢ 📞 +258 83 425 4136\n▢ 👤 Jovem\n▢\n╰━━─「❌」─━━",
      });
    } catch {
      // Grupo pode estar inacessível, continua mesmo assim
    }

    await sendReply(
      `╭━━⪩ RENTAL REMOVIDO ⪨━━\n▢\n▢ ✅ Plano removido com sucesso!\n▢\n▢ 🆔 ID: ${groupId}\n▢\n╰━━─「❌」─━━`
    );
  },
};
