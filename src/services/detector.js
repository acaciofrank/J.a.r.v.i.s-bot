/**
 * Detector de comprovativos de pagamento
 * Suporta M-Pesa (PT/EN) e E-Mola (PT/EN)
 *
 * @author Jovem
 */
import { getAccounts } from "../utils/accounts.js";
import { findProductByPrice } from "../utils/products.js";
import {
  isPurchasesActive,
  findProcessedId,
  markIdAsProcessed,
  savePending,
  setPendingWaitingNumber,
  getPendingByMember,
  saveLastNumber,
  getLastNumber,
  clearLastNumber,
} from "../utils/purchases.js";

const BOT_EMOJI = "👻";

// ─── EXTRATOR DE COMPROVATIVOS ────────────────────────────────────────────────

function extractVouchers(text) {
  const vouchers = [];

  // M-Pesa PT
  const mpesaPtRegex = /Confirmado\s+([A-Z0-9]+)\.\s+Transferiste\s+([\d.,]+)MT.*?para\s+(\d{9,}).*?aos\s+([\d/]+)/gi;
  // M-Pesa EN
  const mpesaEnRegex = /([A-Z0-9]+)\s+Confirmed\.\s+([\d.,]+)MT\s+sent.*?to\s+(\d{9,}).*?on\s+([\d/]+)/gi;
  // E-Mola PT
  const emolaPtRegex = /ID\s+da\s+transac[aã]o\s+([A-Z0-9.]+)\.\s+Transferiste\s+([\d.,]+)MT\s+para\s+conta\s+(\d{9,})/gi;
  // E-Mola EN
  const emolaEnRegex = /Transaction\s+ID\s+([A-Z0-9.]+)\.\s+You\s+transfered\s+([\d.,]+)MT\s+to\s+(\d{9,})/gi;

  let match;

  while ((match = mpesaPtRegex.exec(text)) !== null) {
    vouchers.push({ id: match[1], amount: parseFloat(match[2].replace(",", ".")), account: match[3], date: match[4], type: "mpesa" });
  }
  while ((match = mpesaEnRegex.exec(text)) !== null) {
    vouchers.push({ id: match[1], amount: parseFloat(match[2].replace(",", ".")), account: match[3], date: match[4], type: "mpesa" });
  }
  while ((match = emolaPtRegex.exec(text)) !== null) {
    vouchers.push({ id: match[1], amount: parseFloat(match[2].replace(",", ".")), account: match[3], date: null, type: "emola" });
  }
  while ((match = emolaEnRegex.exec(text)) !== null) {
    vouchers.push({ id: match[1], amount: parseFloat(match[2].replace(",", ".")), account: match[3], date: null, type: "emola" });
  }

  return vouchers;
}

// ─── EXTRATOR DE NÚMERO EXTRA ─────────────────────────────────────────────────

/**
 * Extrai número de telefone da mensagem que não seja das contas registadas
 */
function extractExtraNumber(text, groupAccounts) {
  const allRegistered = [
    ...(groupAccounts?.emola || []),
    ...(groupAccounts?.mpesa || []),
    ...(groupAccounts?.bim || []),
  ].map((a) => a.number);

  const matches = text.match(/\b8[4-7]\d{7}\b/g);
  if (!matches) return null;

  for (const num of matches) {
    if (!allRegistered.includes(num)) return num;
  }
  return null;
}

// ─── VALIDADOR DE CONTAS ──────────────────────────────────────────────────────

function validateAccounts(vouchers, groupAccounts) {
  if (!groupAccounts) return { valid: false, account: null };
  for (const voucher of vouchers) {
    const list = groupAccounts[voucher.type] || [];
    const found = list.find((a) => a.number === voucher.account);
    if (!found) return { valid: false, account: voucher.account };
  }
  return { valid: true };
}

// ─── OUTPUT DO DETECTOR ───────────────────────────────────────────────────────

async function sendDetectorOutput(socket, remoteJid, vouchers, total, product, isPartial, extraNumber) {
  const ids = vouchers.map((v, i) => `🔎 ID${isPartial ? " " + (i + 1) : ""}: *${v.id}*`).join("\n");
  const accounts = vouchers.map((v, i) => `💳 Conta${isPartial ? " " + (i + 1) : ""}: *${v.account}*`).join("\n");
  const amounts = vouchers.map((v, i) => `💰 Valor${isPartial ? " " + (i + 1) : ""}: *${v.amount.toFixed(2)} MT*`).join("\n");
  const date = vouchers.find((v) => v.date)?.date || null;

  const tipo = product ? product.category : "N/D";
  const dados = product ? product.description : "N/D";

  let text = `${BOT_EMOJI} 🔔 *${isPartial ? "Pagamento Parcial recebido!" : "Comprovativo recebido!"}*\n\n`;
  text += `${ids}\n`;
  text += `${accounts}\n`;
  if (date) text += `📅 Data: *${date}*\n`;
  if (isPartial) text += `💰 Total: *${total.toFixed(2)} MT*\n`;
  else text += `${amounts}\n`;
  text += `📦 Tipo: *${tipo}*\n`;
  text += `📊 Dados: *${dados}*\n`;
  if (extraNumber) text += `📱 Número: *${extraNumber}*\n`;
  text += `\n⏳ O seu pedido foi recebido com sucesso!\n`;
  text += `Aguarde enquanto o administrador confirma a sua transação.\n`;
  text += `Será notificado assim que estiver concluído. 🙏`;

  await socket.sendMessage(remoteJid, { text });
}

// ─── PROCESSADOR PRINCIPAL ────────────────────────────────────────────────────

export async function processarComprovativo({ socket, webMessage, remoteJid, userLid, fullMessage }) {
  if (!fullMessage) return false;

  // Verificar se compras está ativo
  if (!isPurchasesActive(remoteJid)) return false;

  const groupAccounts = getAccounts(remoteJid);

  // ─── VERIFICAR SE É NÚMERO AVULSO ────────────────────────────────
  // Se a mensagem é só um número (cliente enviando número separado)
  const isJustNumber = /^\s*8[4-7]\d{7}\s*$/.test(fullMessage.trim());
  if (isJustNumber) {
    const number = fullMessage.trim();
    // Guardar em memória
    saveLastNumber(remoteJid, userLid, number);

    // Verificar se há comprovativo pendente aguardando número deste membro
    const pending = getPendingByMember(remoteJid, userLid);
    if (pending) {
      // Atualizar output com o número
      await sendDetectorOutput(
        socket,
        remoteJid,
        pending.vouchers,
        pending.total,
        pending.product,
        pending.isPartial,
        number
      );
    }
    return false; // não bloqueia outras lógicas
  }

  // ─── EXTRAIR COMPROVATIVOS ────────────────────────────────────────
  const vouchers = extractVouchers(fullMessage);
  if (!vouchers.length) return false;

  const messageId = webMessage.key.id;

  // ─── VERIFICAR DUPLICADOS ─────────────────────────────────────────
  for (const voucher of vouchers) {
    const duplicate = findProcessedId(remoteJid, voucher.id);
    if (duplicate) {
      const now = new Date();
      await socket.sendMessage(remoteJid, {
        text:
          `${BOT_EMOJI} ⚠️ *Comprovativo duplicado!*\n\n` +
          `🔎 ID: *${voucher.id}*\n` +
          `❌ Esta transação já foi processada!\n\n` +
          `👤 Registado por: @${duplicate.memberLid.split("@")[0]}\n` +
          `🕐 Hora: *${duplicate.time}*\n\n` +
          `📞 Caso haja algum engano, entre em contacto com o administrador.`,
        mentions: [duplicate.memberLid],
      });
      return true;
    }
  }

  // ─── VALIDAR CONTAS ───────────────────────────────────────────────
  const validation = validateAccounts(vouchers, groupAccounts);
  if (!validation.valid) {
    await socket.sendMessage(remoteJid, {
      text:
        `${BOT_EMOJI} ❌ *Comprovativo inválido!*\n\n` +
        `⚠️ A conta *${validation.account || "desconhecida"}* não corresponde a nenhuma conta registada!\n\n` +
        `📞 Verifique o número de destino e tente novamente.`,
    });
    return true;
  }

  // ─── CALCULAR TOTAL ───────────────────────────────────────────────
  const total = parseFloat(vouchers.reduce((s, v) => s + v.amount, 0).toFixed(2));
  const isPartial = vouchers.length > 1;

  // ─── BUSCAR PRODUTO ───────────────────────────────────────────────
  const product = findProductByPrice(remoteJid, total);

  // ─── MARCAR IDs ───────────────────────────────────────────────────
  for (const voucher of vouchers) {
    markIdAsProcessed(remoteJid, voucher.id, userLid);
  }

  // ─── EXTRAIR NÚMERO EXTRA DA MENSAGEM ────────────────────────────
  const extraNumber = extractExtraNumber(fullMessage, groupAccounts) || getLastNumber(remoteJid, userLid);

  // ─── GUARDAR PENDENTE ─────────────────────────────────────────────
  savePending(remoteJid, messageId, {
    vouchers,
    total,
    product,
    userLid,
    isPartial,
    extraNumber: extraNumber || null,
    waitingNumber: !extraNumber,
  });

  if (!extraNumber) {
    setPendingWaitingNumber(remoteJid, messageId);
  }

  // ─── ENVIAR OUTPUT ────────────────────────────────────────────────
  // Só envia output se já tem número
  if (extraNumber) {
    await sendDetectorOutput(socket, remoteJid, vouchers, total, product, isPartial, extraNumber);
  }

  return true;
}  