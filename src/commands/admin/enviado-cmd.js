/**
 * Conclusão manual de compras
 * Suporta MB e Tudo Top (Diamante)
 *
 * @author Jovem
 */
import { PREFIX } from "../../config.js";
import {
  getPending,
  removePending,
  registerPurchase,
  getDayRanking,
  getGeneralRanking,
  getLastNumber,
  clearLastNumber,
  parseMb,
} from "../../utils/purchases.js";
import { findProductByPrice } from "../../utils/products.js";

export default {
  name: "enviado",
  description: "Conclui manualmente uma compra de MB ou Diamante",
  commands: ["enviado"],
  usage: `${PREFIX}enviado 1024mb | ${PREFIX}enviado TudoTop220 | ${PREFIX}enviado TudoTop220 84XXXXXXX`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    fullArgs,
    sendWarningReply,
    sendErrorReply,
    isGroup,
    remoteJid,
    socket,
    webMessage,
  }) => {
    if (!isGroup) {
      await sendErrorReply("Este comando só pode ser usado em grupos!");
      return;
    }

    // ─── VERIFICAR SE ESTÁ A RESPONDER A UMA MENSAGEM ─────────────────
    const quotedId = webMessage.message?.extendedTextMessage?.contextInfo?.stanzaId;
    if (!quotedId) {
      await sendWarningReply(`Responda ao comprovativo do cliente!\nExemplo: ${PREFIX}enviado 1024mb`);
      return;
    }

    const args = fullArgs?.trim().split(/\s+/) || [];
    const firstArg = args[0] || "";

    // ─── DETECTAR FORMATO ─────────────────────────────────────────────

    const isMb = /^\d[\d.,]*mb$/i.test(firstArg);
    const isTudoTop = /^tudotop\d+$/i.test(firstArg);

    if (!isMb && !isTudoTop) {
      await sendWarningReply(
        `Formato inválido! Use:\n` +
        `▢ ${PREFIX}enviado 1024mb\n` +
        `▢ ${PREFIX}enviado TudoTop220\n` +
        `▢ ${PREFIX}enviado TudoTop220 84XXXXXXX`
      );
      return;
    }

    // ─── BUSCAR PENDENTE ──────────────────────────────────────────────
    const pending = getPending(remoteJid, quotedId);
    if (!pending) {
      await sendWarningReply("Nenhum comprovativo pendente encontrado para esta mensagem!");
      return;
    }

    const { vouchers, total, userLid } = pending;
    const memberName = userLid.split("@")[0];

    // ─── FORMATO MB ───────────────────────────────────────────────────
    if (isMb) {
      const rawMb = firstArg.replace(/mb$/i, "");
      const mb = parseMb(rawMb);

      if (!mb || mb <= 0) {
        await sendWarningReply("Valor de MB inválido!");
        return;
      }

      // Tentar encontrar produto na tabela pelo MB
      const product = {
        category: "Manual",
        description: `${rawMb} MB`,
      };

      const stats = registerPurchase(
        remoteJid,
        userLid,
        memberName,
        mb,
        total,
        vouchers.map((v) => v.id),
        product
      );

      const dayRanking = getDayRanking(remoteJid);
      const generalRanking = getGeneralRanking(remoteJid);
      const dayPos = dayRanking.findIndex((m) => m.memberLid === userLid) + 1;
      const generalPos = generalRanking.findIndex((m) => m.memberLid === userLid) + 1;
      const ordinal = (n) => `${n}º lugar`;
      const purchaseOrdinal = (n) => `${n}ª`;

      let motivacional = "";
      if (generalPos === 1) {
        motivacional = `\n🥇 Você está em 1º lugar! Você é o líder com um total de *${stats.totalMb} MB* acumulado!\nMantenha sua posição que em breve receberá seu bónus! 🏆`;
      } else if (generalPos === 2) {
        motivacional = `\n🥈 Você está em 2º lugar! Continue assim para chegar ao topo! 💪`;
      } else if (generalPos === 3) {
        motivacional = `\n🥉 Você está em 3º lugar! Está quase lá! 🔥`;
      }

      let text = `✅ *Transação concluída com sucesso!*\n\n`;
      text += `Obrigado, @${memberName}, você está fazendo a sua *${purchaseOrdinal(stats.todayPurchases)} compra* do dia!\n\n`;
      text += `📊 Actual: ${rawMb} MB\n`;
      text += `📊 Hoje: ${stats.todayMb} MB\n`;
      text += `📊 Acumulado: ${stats.totalMb} MB\n`;
      text += `🏅 Posição Dia: ${ordinal(dayPos)} (de ${dayRanking.length})\n`;
      text += `🏆 Posição Geral: ${ordinal(generalPos)}\n`;
      text += motivacional;

      await socket.sendMessage(remoteJid, { text, mentions: [userLid] });
      removePending(remoteJid, quotedId);
      return;
    }

    // ─── FORMATO TUDO TOP ─────────────────────────────────────────────
    if (isTudoTop) {
      const price = parseFloat(firstArg.replace(/^tudotop/i, ""));
      const product = findProductByPrice(remoteJid, price);

      // Número — argumento explícito ou memória
      const explicitNumber = args[1] && /^8[4-7]\d{7}$/.test(args[1]) ? args[1] : null;
      const number = explicitNumber || getLastNumber(remoteJid, userLid);

      if (!number) {
        // Silêncio — cliente ainda não enviou o número
        return;
      }

      clearLastNumber(remoteJid, userLid);
      removePending(remoteJid, quotedId);

      const text =
        `✅ *Transação concluída com sucesso!*\n\n` +
        `Obrigado, @${memberName}, seu pacote foi processado com sucesso!\n\n` +
        `*Número:* ${number}\n` +
        `*Pacote:* ${product?.description || `Tudo Top ${price} MT`}\n` +
        `*Duração:* 30 dias`;

      await socket.sendMessage(remoteJid, { text, mentions: [userLid] });
      return;
    }
  },
};
