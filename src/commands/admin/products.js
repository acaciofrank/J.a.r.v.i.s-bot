import { PREFIX } from "../../config.js";
import {
  parseProductTable,
  saveProducts,
  removeProducts,
  getRawTable,
} from "../../utils/products.js";

export default {
  name: "products",
  description: "Gestão da tabela de produtos do grupo",
  commands: ["addproduct", "remproduct", "products"],
  usage: `${PREFIX}addproduct <tabela>`,
  handle: async ({
    commandName,
    fullArgs,
    sendReply,
    sendErrorReply,
    sendWarningReply,
    sendSuccessReply,
    isGroup,
    remoteJid,
    getGroupName,
  }) => {
    if (!isGroup) {
      await sendErrorReply("Este comando só pode ser usado em grupos!");
      return;
    }

    if (commandName === "products") {
      const raw = getRawTable(remoteJid);
      if (!raw) {
        await sendWarningReply("Este grupo ainda não possui produtos registados!");
        return;
      }
      await sendReply(raw);
      return;
    }

    if (commandName === "remproduct") {
      const removed = removeProducts(remoteJid);
      if (!removed) {
        await sendWarningReply("Este grupo não possui nenhuma tabela registada!");
        return;
      }
      await sendSuccessReply("╭━━⪩ *TABELA REMOVIDA* ⪨━━\n▢\n▢ 🗑️ Todos os produtos foram removidos!\n▢\n╰━━─「✅」─━━");
      return;
    }

    if (commandName === "addproduct") {
      if (!fullArgs || !fullArgs.trim()) {
        await sendWarningReply(`Envie a tabela junto com o comando!\nExemplo: ${PREFIX}addproduct\n📶 400 MB ➡️ 10 MT`);
        return;
      }
      const products = await parseProductTable(fullArgs);
      if (!products || products.length === 0) {
        await sendErrorReply("Não foi possível identificar produtos na tabela!");
        return;
      }
      const groupName = await getGroupName();
      saveProducts(remoteJid, groupName, products, fullArgs);
      await sendSuccessReply(`╭━━⪩ *TABELA REGISTADA* ⪨━━\n▢\n▢ ✅ *${products.length} produtos* registados!\n▢\n╰━━─「🛒」─━━`);
      return;
    }
  },
};
