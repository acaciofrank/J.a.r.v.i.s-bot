/**
 * Gestão simplificada do auto-responder por grupo
 *
 * @author Jovem
 */
import { PREFIX } from "../../config.js";
import { InvalidParameterError } from "../../errors/index.js";
import {
  addAutoResponderItem,
  removeAutoResponderItemByKey,
  listAutoResponderItems,
} from "../../utils/database.js";
import { readMore } from "../../utils/index.js";

export default {
  name: "nano",
  description: "Gestão do auto-responder do grupo",
  commands: ["addnano", "remnano", "nanolist"],
  usage: `${PREFIX}addnano gatilho / resposta`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    commandName,
    fullArgs,
    args,
    sendSuccessReply,
    sendErrorReply,
    sendWarningReply,
    sendWaitReact,
    isGroup,
    remoteJid,
    prefix,
  }) => {
    if (!isGroup) {
      await sendErrorReply("Este comando só pode ser usado em grupos!");
      return;
    }

    // ─── LISTAR (/nanolist) ───────────────────────────────────────────
    if (commandName === "nanolist") {
      await sendWaitReact();
      const items = listAutoResponderItems(remoteJid);

      if (!items.length) {
        await sendSuccessReply("Não há gatilhos cadastrados neste grupo!");
        return;
      }

      let message = `*📋 Gatilhos do grupo*\n\n${readMore()}`;
      items.forEach((item) => {
        message += `*${item.key}.* ${item.match}\n`;
        message += `   ↳ "${item.answer}"\n\n`;
      });
      message += `_Total: ${items.length} gatilho(s)_`;
      await sendSuccessReply(message);
      return;
    }

    // ─── ADICIONAR (/addnano) ─────────────────────────────────────────
    if (commandName === "addnano") {
      const parts = fullArgs?.split(/\s\/\s/);

      if (!parts || parts.length !== 2) {
        throw new InvalidParameterError(
          `Formato inválido! Use:\n${prefix}addnano gatilho / resposta`
        );
      }

      const [match, answer] = parts;
      const success = addAutoResponderItem(remoteJid, match.trim(), answer.trim());

      if (!success) {
        await sendErrorReply(`O gatilho *"${match.trim()}"* já existe neste grupo!`);
        return;
      }

      await sendSuccessReply(
        `╭━━⪩ *GATILHO ADICIONADO* ⪨━━\n▢\n▢ 🎯 *Gatilho:* ${match.trim()}\n▢ 💬 *Resposta:* ${answer.trim()}\n▢\n╰━━─「✅」─━━`
      );
      return;
    }

    // ─── REMOVER (/remnano) ───────────────────────────────────────────
    if (commandName === "remnano") {
      const id = parseInt(args[0]);

      if (isNaN(id) || id <= 0) {
        throw new InvalidParameterError(
          `Informe o ID do gatilho a remover!\nUse ${prefix}nanolist para ver os IDs.`
        );
      }

      const success = removeAutoResponderItemByKey(remoteJid, id);

      if (!success) {
        await sendErrorReply(
          `Gatilho com ID *${id}* não encontrado!\nUse ${prefix}nanolist para ver os IDs.`
        );
        return;
      }

      await sendSuccessReply(
        `╭━━⪩ *GATILHO REMOVIDO* ⪨━━\n▢\n▢ 🗑️ Gatilho *${id}* removido!\n▢\n╰━━─「✅」─━━`
      );
      return;
    }
  },
};
