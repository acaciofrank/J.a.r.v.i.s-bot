/**
 * Este script é responsável
 * por carregar os eventos
 * que serão escutados pelo
 * socket do WhatsApp.
 *
 * @author Dev Gui
 */
import { TIMEOUT_IN_MILLISECONDS_BY_EVENT } from "./config.js";
import { onMessagesUpsert } from "./middlewares/onMesssagesUpsert.js";
import { onReaction } from "./middlewares/onReaction.js";
import { badMacHandler } from "./utils/badMacHandler.js";
import { errorLog } from "./utils/logger.js";
import { startScheduler } from "./services/scheduler.js";

export function load(socket) {
  const safeEventHandler = async (callback, data, eventName) => {
    try {
      await callback(data);
    } catch (error) {
      if (badMacHandler.handleError(error, eventName)) {
        return;
      }
      errorLog(`Erro ao processar evento ${eventName}: ${error.message}`);
      if (error.stack) {
        errorLog(`Stack trace: ${error.stack}`);
      }
    }
  };

  // ─── MENSAGENS ────────────────────────────────────────────────────
  socket.ev.on("messages.upsert", async (data) => {
    const startProcess = Date.now();
    setTimeout(() => {
      safeEventHandler(
        () =>
          onMessagesUpsert({
            socket,
            messages: data.messages,
            startProcess,
          }),
        data,
        "messages.upsert"
      );
    }, TIMEOUT_IN_MILLISECONDS_BY_EVENT);
  });

  // ─── REAÇÕES ──────────────────────────────────────────────────────
  socket.ev.on("messages.upsert", async (data) => {
    for (const msg of data.messages) {
      try {
        const reaction = msg.message?.reactionMessage;
        if (!reaction) continue;

        const remoteJid = msg.key.remoteJid;
        const isGroup = remoteJid?.endsWith("@g.us");
        if (!isGroup) continue;

        const reactorLid =
          msg.key.participant?.replace(/:[0-9]+$/, "") ||
          msg.participant?.replace(/:[0-9]+$/, "");

        if (!reactorLid) continue;

        await safeEventHandler(
          () => onReaction({ socket, reaction, remoteJid, reactorLid }),
          msg,
          "reaction"
        );
      } catch (error) {
        errorLog(`Erro ao processar reação: ${error.message}`);
      }
    }
  });

  // ─── AGENDADOR DE RELATÓRIOS ──────────────────────────────────────
  startScheduler(socket);

  // ─── ERROS GLOBAIS ────────────────────────────────────────────────
  process.on("uncaughtException", (error) => {
    if (badMacHandler.handleError(error, "uncaughtException")) {
      return;
    }
    errorLog(`Erro não capturado: ${error.message}`);
  });

  process.on("unhandledRejection", (reason) => {
    if (badMacHandler.handleError(reason, "unhandledRejection")) {
      return;
    }
    errorLog(`Promessa rejeitada não tratada: ${reason}`);
  });
}
