/**
 * Detector de comprovativos
 * Interpreta mensagens de comprovativo M-Pesa e e-Mola
 *
 * @author Jovem
 */

/**
 * Tenta extrair dados de um comprovativo M-Pesa (EN ou PT)
 * @param {string} text
 * @returns {object|null}
 */
function parseMPesa(text) {
  // Formato EN: "DEC9K3UN1CP Confirmed. 75.00MT sent..."
  const enMatch = text.match(
    /^([A-Z0-9]+)\s+Confirmed\.\s+([\d.]+)MT\s+sent.*?to\s+(\d+).*?on\s+(\d+\/\d+\/\d+)\s+at\s+([\d:]+\s*[AP]M)/i
  );

  if (enMatch) {
    return {
      id: enMatch[1].trim(),
      valor: enMatch[2].trim(),
      conta: enMatch[3].trim(),
      data: enMatch[4].trim(),
      hora: enMatch[5].trim(),
      tipo: "M-Pesa",
    };
  }

  // Formato PT: "Confirmado DEC0K3XY9FG. Transferiste 10.00MT..."
  const ptMatch = text.match(
    /Confirmado\s+([A-Z0-9]+)\.\s+Transferiste\s+([\d.]+)MT.*?para\s+(\d+).*?aos\s+(\d+\/\d+\/\d+)\s+as\s+([\d:]+\s*[AP]M)/i
  );

  if (ptMatch) {
    return {
      id: ptMatch[1].trim(),
      valor: ptMatch[2].trim(),
      conta: ptMatch[3].trim(),
      data: ptMatch[4].trim(),
      hora: ptMatch[5].trim(),
      tipo: "M-Pesa",
    };
  }

  return null;
}

/**
 * Tenta extrair dados de um comprovativo e-Mola (EN ou PT)
 * @param {string} text
 * @returns {object|null}
 */
function parseEMola(text) {
  // Formato PT: "ID da transacao PP260512.1909.G87067. Transferiste 25.00MT para conta 870835632..."
  const ptMatch = text.match(
    /ID da transacao\s+([A-Z0-9.]+)\.\s+Transferiste\s+([\d.]+)MT\s+para\s+conta\s+(\d+).*?as\s+([\d:]+)\s+de\s+(\d+\/\d+\/\d+)/i
  );

  if (ptMatch) {
    return {
      id: ptMatch[1].trim(),
      valor: ptMatch[2].trim(),
      conta: ptMatch[3].trim(),
      data: ptMatch[5].trim(),
      hora: ptMatch[4].trim(),
      tipo: "e-Mola",
    };
  }

  // Formato EN: "Transaction ID PP260512.2000.H95187. You transferred 20.00MT to account 870835632..."
  const enMatch = text.match(
    /Transaction ID\s+([A-Z0-9.]+)\.\s+You\s+transfer(?:red|ed)\s+([\d.]+)MT\s+to\s+(?:account\s+)?(\d+).*?at\s+([\d:]+)\s+on\s+(\d+\/\d+\/\d+)/i
  );

  if (enMatch) {
    return {
      id: enMatch[1].trim(),
      valor: enMatch[2].trim(),
      conta: enMatch[3].trim(),
      data: enMatch[5].trim(),
      hora: enMatch[4].trim(),
      tipo: "e-Mola",
    };
  }

  return null;
}

/**
 * Detecta e extrai dados de um comprovativo
 * @param {string} text
 * @returns {{ data: object, raw: string }|null}
 */
export function detectComprovativo(text) {
  if (!text || text.trim().length < 20) {
    return null;
  }

  const mpesa = parseMPesa(text);
  if (mpesa) return { data: mpesa, raw: text };

  const emola = parseEMola(text);
  if (emola) return { data: emola, raw: text };

  return null;
}

/**
 * Verifica se o texto contém dois comprovativos (pagamento parcial)
 * @param {string} text
 * @returns {{ data1: object, data2: object }|null}
 */
export function detectPagamentoParcial(text) {
  if (!text) return null;

  // Divide o texto em blocos e tenta detectar 2 comprovativos
  const lines = text.split("\n").filter(Boolean);
  const blocks = [];
  let current = [];

  for (const line of lines) {
    if (
      line.match(/^[A-Z0-9]+\s+Confirmed/i) ||
      line.match(/^Confirmado\s+[A-Z0-9]/i) ||
      line.match(/ID da transacao/i) ||
      line.match(/Transaction ID/i)
    ) {
      if (current.length > 0) {
        blocks.push(current.join("\n"));
      }
      current = [line];
    } else {
      current.push(line);
    }
  }

  if (current.length > 0) {
    blocks.push(current.join("\n"));
  }

  if (blocks.length < 2) return null;

  const data1 = parseMPesa(blocks[0]) || parseEMola(blocks[0]);
  const data2 = parseMPesa(blocks[1]) || parseEMola(blocks[1]);

  if (!data1 || !data2) return null;

  return { data1, data2 };
}
