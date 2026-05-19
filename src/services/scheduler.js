/**
 * Agendador de relatórios diários
 * Envia relatório às 23h59 no privado do dono
 *
 * @author Jovem
 */
import { OWNER_LID } from "../config.js";
import { getActiveGroups } from "../utils/purchases.js";
import { buildReport, formatReport } from "../utils/report.js";

let schedulerStarted = false;

/**
 * Inicia o agendador
 * @param {WASocket} socket
 */
export function startScheduler(socket) {
  if (schedulerStarted) return;
  schedulerStarted = true;

  checkAndSchedule(socket);
}

function checkAndSchedule(socket) {
  const now = new Date();
  const target = new Date();
  target.setHours(23, 59, 0, 0);

  // Se já passou das 23h59 hoje, agendar para amanhã
  if (now >= target) {
    target.setDate(target.getDate() + 1);
  }

  const delay = target.getTime() - now.getTime();

  setTimeout(async () => {
    await sendDailyReports(socket);
    // Reagendar para o próximo dia
    checkAndSchedule(socket);
  }, delay);
}

async function sendDailyReports(socket) {
  const activeGroups = getActiveGroups();

  if (!activeGroups.length) return;

  const ownerJid = OWNER_LID.replace("@lid", "@s.whatsapp.net");

  for (const group of activeGroups) {
    try {
      const report = buildReport(group.groupId, "day");
      if (!report) continue;

      const text =
        `╭━━⪩ *RELATÓRIO AUTOMÁTICO* ⪨━━\n` +
        `▢ 🏪 Grupo: *${group.groupName}*\n▢\n` +
        formatReport(report, "day") +
        `\n╰━━─「📊」─━━`;

      await socket.sendMessage(ownerJid, { text });

      // Pequena pausa entre grupos
      await new Promise((r) => setTimeout(r, 1000));
    } catch (error) {
      console.error(`Erro ao enviar relatório do grupo ${group.groupId}:`, error.message);
    }
  }
}
