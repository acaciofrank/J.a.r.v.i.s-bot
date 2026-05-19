/**
 * Ativa ou desativa o detector de compras no grupo
 *
 * @author Jovem
 */
import { PREFIX } from "../../config.js";
import { setPurchasesActive, isPurchasesActive } from "../../utils/purchases.js";

export default {
  name: "compras",
  description: "Ativa ou desativa o detector de compras do grupo",
  commands: ["compras"],
  usage: `${PREFIX}compras on/off`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    fullArgs,
    sendSuccessReply,
    sendWarningReply,
    sendErrorReply,
    isGroup,
    remoteJid,
    getGroupName,
  }) => {
    if (!isGroup) {
      await sendErrorReply("Este comando só pode ser usado em grupos!");
      return;
    }

    const arg = fullArgs?.trim().toLowerCase();

    if (!arg || (arg !== "on" && arg !== "off")) {
      const current = isPurchasesActive(remoteJid);
      await sendWarningReply(
        `Use ${PREFIX}compras on para ativar ou ${PREFIX}compras off para desativar.\n\nStatus atual: *${current ? "✅ Ativo" : "❌ Inativo"}*`
      );
      return;
    }

    const active = arg === "on";
    const groupName = await getGroupName();
    setPurchasesActive(remoteJid, groupName, active);

    await sendSuccessReply(
      `╭━━⪩ *DETECTOR DE COMPRAS* ⪨━━\n▢\n▢ ${active ? "✅ Ativado" : "❌ Desativado"} com sucesso!\n▢\n╰━━─「🛒」─━━`
    );
  },
};
