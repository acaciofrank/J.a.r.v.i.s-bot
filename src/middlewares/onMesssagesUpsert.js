/**
 * Evento chamado quando uma mensagem
 * é enviada para o grupo do WhatsApp
 *
 * @author Dev Gui
 */
import { DEVELOPER_MODE, OWNER_LID } from "../config.js";
import { badMacHandler } from "../utils/badMacHandler.js";
import { checkIfMemberIsMuted, getPrefix } from "../utils/database.js";
import { dynamicCommand } from "../utils/dynamicCommand.js";
import {
  GROUP_PARTICIPANT_ADD,
  GROUP_PARTICIPANT_LEAVE,
  isAddOrLeave,
  isAtLeastMinutesInPast,
  extractDataFromMessage,
} from "../utils/index.js";
import { loadCommonFunctions } from "../utils/loadCommonFunctions.js";
import { errorLog, infoLog } from "../utils/logger.js";
import {
  isRentalActive,
  isRentalRegistered,
  shouldNotifyExpiration,
  markAsNotified,
} from "../utils/rental.js";
import { processarComprovativo } from "../services/detector.js";
import { customMiddleware } from "./customMiddleware.js";
import { messageHandler } from "./messageHandler.js";
import { onGroupParticipantsUpdate } from "./onGroupParticipantsUpdate.js";

export async function onMessagesUpsert({ socket, messages, startProcess }) {
  if (!messages.length) {
    return;
  }

  for (const webMessage of messages) {
    if (DEVELOPER_MODE) {
      infoLog(
        `\n\n⪨========== [ MENSAGEM RECEBIDA ] ==========⪩ \n\n${JSON.stringify(
          messages,
          null,
          2
        )}`
      );
    }

    try {
      const timestamp = webMessage.messageTimestamp;

      if (webMessage?.message) {
        messageHandler(socket, webMessage);
      }

      if (isAtLeastMinutesInPast(timestamp)) {
        continue;
      }

      if (isAddOrLeave.includes(webMessage.messageStubType)) {
        let action = "";
        if (webMessage.messageStubType === GROUP_PARTICIPANT_ADD) {
          action = "add";
        } else if (webMessage.messageStubType === GROUP_PARTICIPANT_LEAVE) {
          action = "remove";
        }

        await customMiddleware({
          socket,
          webMessage,
          type: "participant",
          action,
          data: webMessage.messageStubParameters[0],
          commonFunctions: null,
        });

        await onGroupParticipantsUpdate({
          data: webMessage.messageStubParameters[0],
          remoteJid: webMessage.key.remoteJid,
          socket,
          action,
        });

        return;
      }

      // ─── VERIFICAÇÃO DO SISTEMA DE ALUGUEL ───────────────────────────
      const remoteJid = webMessage.key?.remoteJid;
      const isGroup = remoteJid?.endsWith("@g.us");

      const { userLid, fullMessage } = extractDataFromMessage(webMessage);

      const isOwner = userLid === OWNER_LID;

      if (isGroup && !isOwner) {
        const groupPrefix = getPrefix(remoteJid);
        const hasPrefix = fullMessage?.startsWith(groupPrefix);

        if (!isRentalRegistered(remoteJid)) {
          if (hasPrefix) {
            await socket.sendMessage(remoteJid, {
              text:
                "╭━━⪩ *SEM PLANO ATIVO* ⪨━━\n▢ ⚠️ Este grupo *não possui* um *plano ativo*!\n▢ Para adquirir um plano, entre em *contacto*:\n▢ 📞 +258 83 425 4136\n▢ 👤 *Jovem*\n╰━━─「⏳」─━━",
            });
          }
          continue;
        }

        if (shouldNotifyExpiration(remoteJid)) {
          markAsNotified(remoteJid);

          if (hasPrefix) {
            await socket.sendMessage(remoteJid, {
              text:
                "╭━━⪩ *PLANO EXPIRADO* ⪨━━\n▢ ⚠️ O plano deste grupo *expirou*!\n▢ Para renovar, entre em *contacto*:\n▢ 📞 +258 83 425 4136\n▢ 👤 *Jovem*\n╰━━─「⏳」─━━",
            });
          }
          continue;
        }

        if (!isRentalActive(remoteJid)) {
          continue;
        }
      }
      // ─────────────────────────────────────────────────────────────────

      // ─── DETECTOR DE COMPROVATIVOS ────────────────────────────────────
      if (isGroup && webMessage?.message) {
        const detectado = await processarComprovativo({
          socket,
          webMessage,
          remoteJid,
          userLid,
          fullMessage,
        });

        if (detectado) continue;
      }
      // ─────────────────────────────────────────────────────────────────

      if (
        checkIfMemberIsMuted(
          webMessage?.key?.remoteJid,
          webMessage?.key?.participant?.replace(/:[0-9][0-9]|:[0-9]/g, "")
        )
      ) {
        try {
          const { id, remoteJid, participant } = webMessage.key;

          const deleteKey = {
            remoteJid,
            fromMe: false,
            id,
            participant,
          };

          await socket.sendMessage(remoteJid, { delete: deleteKey });
        } catch (error) {
          errorLog(
            `Erro ao deletar mensagem de membro silenciado, provavelmente eu não sou administrador do grupo! ${error.message}`
          );
        }

        return;
      }

      const commonFunctions = loadCommonFunctions({ socket, webMessage });

      if (!commonFunctions) {
        continue;
      }

      await customMiddleware({
        socket,
        webMessage,
        type: "message",
        commonFunctions,
      });

      await dynamicCommand(commonFunctions, startProcess);
    } catch (error) {
      if (badMacHandler.handleError(error, "message-processing")) {
        continue;
      }

      if (badMacHandler.isSessionError(error)) {
        errorLog(`Erro de sessão ao processar mensagem: ${error.message}`);
        continue;
      }

      errorLog(
        `Erro ao processar mensagem: ${error.message} | Stack: ${error.stack}`
      );

      continue;
    }
  }
}
