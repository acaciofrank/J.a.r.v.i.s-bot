/**
 * Comando para administradores verificarem
 * o status do plano ativo do grupo.
 *
 * @author Jovem
 */
import { PREFIX } from "../../config.js";
import { listRentals } from "../../utils/rental.js";

export default {
  name: "bot",
  description: "Verifica o status do plano ativo do grupo",
  commands: ["bot"],
  usage: `${PREFIX}bot`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({ sendReply, sendErrorReply, isGroup, remoteJid }) => {
    if (!isGroup) {
      await sendErrorReply("Este comando só pode ser usado em grupos!");
      return;
    }

    const rentals = listRentals();
    const rental = rentals.find((r) => r.groupId === remoteJid);

    if (!rental) {
      await sendReply(
        "╭━━⪩ PLANO DO GRUPO ⪨━━\n▢\n▢ ⚠️ Este grupo não possui nenhum plano registrado!\n▢\n╰━━─「🤖」─━━"
      );
      return;
    }

    const status = rental.isActive
      ? `✅ Ativo — ⏳ ${rental.daysLeft} dia(s) restante(s)`
      : "❌ Expirado";

    await sendReply(
      `╭━━⪩ PLANO DO GRUPO ⪨━━\n▢ 📋 *Nome:* ${rental.groupName}\n▢ 📅 *Vencimento:* ${rental.expiresAt}\n▢ 📊 *Status:* ✅ Ativo\n▢⏳ *Dias restantes:* ${rental.daysLeft}\n╰━━─「🤖」─━━`
    );
  },
};
