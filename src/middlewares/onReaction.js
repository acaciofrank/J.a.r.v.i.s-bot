/**
 * Captura reações ✅ do admin para confirmar transações
 *
 * @author Jovem
 */
import { OWNER_LID } from "../config.js";
import { isAdmin } from "./index.js";
import {
  getPending,
  removePending,
  registerPurchase,
  getDayRanking,
  getGeneralRanking,
  getLastNumber,
  clearLastNumber,
} from "../utils/purchases.js";

const BOT_EMOJI = "👻";

export async function onReaction({ socket, reaction, remoteJid, reactorLid }) {
  if (reaction.text !== "✅") return;

  const isOwner = reactorLid === OWNER_LID;
  const adminCheck = await isAdmin({ remoteJid, userLid: reactorLid, socket });
  if (!isOwner && !adminCheck) return;

  const messageId = reaction.key.id;
  const pending = getPending(remoteJid, messageId);
  if (!pending) return;

  const { vouchers, total, product, userLid, isPartial, extraNumber } = pending;
  const memberName = userLid.split("@")[0];

  // ─── DIAMANTE ─────────────────────────────────────────────────────
  if (product?.category === "Tudo Top") {
    const number = extraNumber || getLastNumber(remoteJid, userLid);
    if (!number) return; // silêncio — aguarda número

    clearLastNumber(remoteJid, userLid);
    removePending(remoteJid, messageId);

    const text =
      `✅ *Transação concluída com sucesso!*\n\n` +
      `Obrigado, @${memberName}, seu pacote foi processado com sucesso!\n\n` +
      `*Número:* ${number}\n` +
      `*Pacote:* ${product.description}\n` +
      `*Duração:* 30 dias`;

    await socket.sendMessage(remoteJid, { text, mentions: [userLid] });
    return;
  }

  // ─── DIÁRIA / SEMANAL / MENSAL ────────────────────────────────────
  const rawMb = product?.description?.match(/[\d.,]+/)?.[0] || "0";
const mb = product ? parseFloat(rawMb.replace(/\.(?=\d{3})/g, "").replace(",", ".")) || 0 : 0;

  const stats = registerPurchase(
    remoteJid,
    userLid,
    memberName,
    mb,
    total,
    vouchers.map((v) => v.id)
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
  text += `📊 Actual: ${product ? product.description : "N/D"}\n`;
  text += `📊 Hoje: ${stats.todayMb} MB\n`;
  text += `📊 Acumulado: ${stats.totalMb} MB\n`;
  text += `🏅 Posição Dia: ${ordinal(dayPos)} (de ${dayRanking.length})\n`;
  text += `🏆 Posição Geral: ${ordinal(generalPos)}\n`;
  text += motivacional;

  await socket.sendMessage(remoteJid, { text, mentions: [userLid] });

  removePending(remoteJid, messageId);
}
