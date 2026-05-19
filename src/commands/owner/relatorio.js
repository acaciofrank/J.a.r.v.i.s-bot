/**
 * Comandos de relatório de gestão
 *
 * @author Jovem
 */
import { PREFIX } from "../../config.js";
import { buildReport, formatReport, formatGeneralRanking, formatPeakHours, formatNoSale } from "../../utils/report.js";

export default {
  name: "relatorio",
  description: "Relatórios de gestão de vendas",
  commands: ["relatorio", "ranking", "pico", "semcompra"],
  usage: `${PREFIX}relatorio`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    commandName,
    fullArgs,
    sendReply,
    sendWarningReply,
    isGroup,
    remoteJid,
  }) => {
    if (!isGroup) {
      await sendWarningReply("Este comando só pode ser usado em grupos!");
      return;
    }

    // ─── RANKING GERAL ────────────────────────────────────────────────
    if (commandName === "ranking") {
      const result = formatGeneralRanking(remoteJid);
      if (!result) {
        await sendWarningReply("Ainda não há compras registadas neste grupo!");
        return;
      }
      await sendReply(result.text, result.mentions);
      return;
    }

    // ─── HORÁRIO DE PICO ──────────────────────────────────────────────
    if (commandName === "pico") {
      const text = formatPeakHours(remoteJid);
      if (!text) {
        await sendWarningReply("Ainda não há dados suficientes!");
        return;
      }
      await sendReply(text);
      return;
    }

    // ─── SEM COMPRA ───────────────────────────────────────────────────
    if (commandName === "semcompra") {
      const arg = fullArgs?.trim().toLowerCase();
      let period = "day";
      if (arg === "semana") period = "week";
      else if (arg === "sempre") period = "always";

      const result = formatNoSale(remoteJid, period);
      if (!result) {
        const labels = { day: "hoje", week: "esta semana", always: "sem nunca comprar" };
        await sendWarningReply(`Não há membros ${labels[period]}!`);
        return;
      }
      await sendReply(result.text, result.mentions);
      return;
    }

    // ─── RELATÓRIO ────────────────────────────────────────────────────
    // /relatorio → dia
    // /relatorio semana → semana
    // /relatorio mes → mês
    const arg = fullArgs?.trim().toLowerCase();
    let period = "day";
    if (arg === "semana") period = "week";
    else if (arg === "mes" || arg === "mês") period = "month";

    const report = buildReport(remoteJid, period);
    if (!report) {
      await sendWarningReply("Ainda não há vendas registadas neste período!");
      return;
    }

    const text =
      `╭━━⪩ *RELATÓRIO* ⪨━━\n▢\n` +
      formatReport(report, period) +
      `\n╰━━─「📊」─━━`;

    await sendReply(text, report.ranking.map((m) => m.memberLid));
  },
};
