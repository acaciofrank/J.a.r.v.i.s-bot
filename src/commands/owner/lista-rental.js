/**
 * Comando para listar todos os grupos com plano de aluguel
 * Uso: /lista-rental
 *
 * @author Jovem
 */
import { PREFIX } from "../../config.js";
import { listRentals } from "../../utils/rental.js";

export default {
  name: "lista-rental",
  description: "Lista todos os grupos com plano de aluguel",
  commands: ["lista-rental"],
  usage: `${PREFIX}lista-rental`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({ sendReply }) => {
    const rentals = listRentals();

    if (!rentals.length) {
      await sendReply("📋 Nenhum grupo com plano registrado.");
      return;
    }

    const ativos = rentals.filter((r) => r.isActive);
    const vencidos = rentals.filter((r) => !r.isActive);

    let message = `╭━━⪩ LISTA DE RENTALS ⪨━━\n▢\n`;

    if (ativos.length) {
      message += `▢ ✅ ATIVOS (${ativos.length})\n▢\n`;
      for (const rental of ativos) {
        message += `▢ 📋 ${rental.groupName}\n`;
        message += `▢ 🆔 ${rental.groupId}\n`;
        message += `▢ 📅 Vence: ${rental.expiresAt}\n`;
        message += `▢ ⏳ Dias restantes: ${rental.daysLeft}\n`;
        message += `▢\n`;
      }
    }

    if (vencidos.length) {
      message += `▢ ❌ VENCIDOS (${vencidos.length})\n▢\n`;
      for (const rental of vencidos) {
        message += `▢ 📋 ${rental.groupName}\n`;
        message += `▢ 🆔 ${rental.groupId}\n`;
        message += `▢ 📅 Venceu: ${rental.expiresAt}\n`;
        message += `▢\n`;
      }
    }

    message += `╰━━─「📋」─━━`;

    await sendReply(message);
  },
};
