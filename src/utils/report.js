/**
 * Funções de relatório de vendas
 *
 * @author Jovem
 */
import { getSalesHistory, getAllMembers, getGeneralRanking } from "./purchases.js";

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const categoryEmoji = {
  "Diária": "📥",
  "Semanal": "📆",
  "Mensal": "📅",
  "Tudo Top": "💎",
  "Stock": "📦",
  "Saldo": "💳",
  "Geral": "📋",
};

function filterByPeriod(history, period) {
  const now = new Date();
  const todayKey = getTodayKey();
  const weekKey = getWeekKey(now);
  const monthKey = getMonthKey(now);

  return history.filter((s) => {
    if (period === "day") return s.dateKey === todayKey;
    if (period === "week") return s.weekKey === weekKey;
    if (period === "month") return s.monthKey === monthKey;
    return true;
  });
}

function groupByProduct(sales) {
  const grouped = {};
  for (const sale of sales) {
    const key = `${sale.category}||${sale.description}`;
    if (!grouped[key]) {
      grouped[key] = {
        category: sale.category,
        description: sale.description,
        isDiamond: sale.isDiamond,
        count: 0,
        totalMb: 0,
        totalAmount: 0,
      };
    }
    grouped[key].count += 1;
    grouped[key].totalMb = parseFloat((grouped[key].totalMb + (sale.isDiamond ? 0 : sale.mb)).toFixed(2));
    grouped[key].totalAmount = parseFloat((grouped[key].totalAmount + sale.amount).toFixed(2));
  }
  return Object.values(grouped).sort((a, b) => b.count - a.count);
}

function getPeakHours(sales) {
  const hours = {};
  for (const sale of sales) {
    const h = sale.hour;
    if (!hours[h]) hours[h] = 0;
    hours[h] += 1;
  }
  return Object.entries(hours)
    .map(([h, count]) => ({ hour: parseInt(h), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export function buildReport(groupId, period = "day") {
  const history = getSalesHistory(groupId);
  const filtered = filterByPeriod(history, period);

  if (!filtered.length) return null;

  const totalAmount = parseFloat(filtered.reduce((s, h) => s + h.amount, 0).toFixed(2));
  const totalSales = filtered.length;
  const totalMb = parseFloat(filtered.filter((s) => !s.isDiamond).reduce((s, h) => s + h.mb, 0).toFixed(2));
  const products = groupByProduct(filtered);
  const peakHours = getPeakHours(filtered);

  const memberSales = {};
  for (const sale of filtered) {
    if (!memberSales[sale.memberLid]) {
      memberSales[sale.memberLid] = {
        memberLid: sale.memberLid,
        memberName: sale.memberName,
        count: 0,
        totalMb: 0,
        totalAmount: 0,
      };
    }
    memberSales[sale.memberLid].count += 1;
    memberSales[sale.memberLid].totalMb = parseFloat((memberSales[sale.memberLid].totalMb + (sale.isDiamond ? 0 : sale.mb)).toFixed(2));
    memberSales[sale.memberLid].totalAmount = parseFloat((memberSales[sale.memberLid].totalAmount + sale.amount).toFixed(2));
  }
  const ranking = Object.values(memberSales).sort((a, b) => b.totalMb - a.totalMb);

  const allMembers = getAllMembers(groupId);
  const activeLids = new Set(filtered.map((s) => s.memberLid));
  const noSale = allMembers.filter((m) => !activeLids.has(m.memberLid));

  return { totalAmount, totalSales, totalMb, products, peakHours, ranking, noSale };
}

export function formatReport(report, period = "day", date = new Date()) {
  const periodLabel = {
    day: `📅 *RELATÓRIO DO DIA - ${date.toLocaleDateString("pt-br")}*`,
    week: `📅 *RELATÓRIO DA SEMANA*`,
    month: `📅 *RELATÓRIO DO MÊS - ${date.toLocaleDateString("pt-br", { month: "long", year: "numeric" })}*`,
  };

  let text = `📊 ${periodLabel[period]}\n\n`;

  text += `💰 *RECEBIMENTO*\n`;
  text += `▢ Total arrecadado: *${report.totalAmount} MT*\n`;
  text += `▢ Total de vendas: *${report.totalSales}*\n`;
  text += `▢ Total de MB vendidos: *${report.totalMb} MB*\n\n`;

  text += `📦 *PRODUTOS POR CATEGORIA*\n`;
  const byCategory = {};
  for (const p of report.products) {
    if (!byCategory[p.category]) byCategory[p.category] = [];
    byCategory[p.category].push(p);
  }
  for (const [cat, items] of Object.entries(byCategory)) {
    const emoji = categoryEmoji[cat] || "📋";
    text += `\n${emoji} *${cat.toUpperCase()}*\n`;
    for (const p of items) {
      if (p.isDiamond) {
        text += `▢ ${p.description} — ${p.count} venda(s) — ${p.totalAmount} MT\n`;
      } else {
        text += `▢ ${p.description} — ${p.count} venda(s) — ${p.totalAmount} MT — ${p.totalMb} MB\n`;
      }
    }
  }

  text += `\n⏰ *HORÁRIO DE PICO*\n`;
  if (report.peakHours.length) {
    for (const h of report.peakHours) {
      text += `▢ ${h.hour}h — ${h.count} venda(s)\n`;
    }
  } else {
    text += `▢ Sem dados\n`;
  }

  text += `\n🏆 *RANKING DO PERÍODO*\n`;
  const medals = ["🥇", "🥈", "🥉"];
  report.ranking.forEach((m, i) => {
    const medal = medals[i] || "👤";
    text += `▢ ${medal} @${m.memberLid.split("@")[0]} — ${m.totalMb} MB — ${m.count} compra(s)\n`;
  });

  if (report.noSale.length) {
    text += `\n👥 *SEM COMPRA*\n`;
    for (const m of report.noSale) {
      text += `▢ @${m.memberLid.split("@")[0]}\n`;
    }
  }

  return text;
}

export function formatGeneralRanking(groupId) {
  const ranking = getGeneralRanking(groupId);
  if (!ranking.length) return null;

  const medals = ["🥇", "🥈", "🥉"];
  let text = `🏆 *RANKING GERAL ACUMULADO*\n▢\n`;
  ranking.forEach((m, i) => {
    const medal = medals[i] || `${i + 1}º`;
    text += `▢ ${medal} @${m.memberLid.split("@")[0]}\n`;
    text += `▢    📶 Acumulado: *${m.totalMb} MB*\n`;
    text += `▢    🛒 Compras: *${m.totalPurchases}*\n`;
    text += `▢    💰 Gasto: *${m.totalAmount} MT*\n▢\n`;
  });
  text += `╰━━─「🏆」─━━`;
  return { text, mentions: ranking.map((m) => m.memberLid) };
}

export function formatPeakHours(groupId) {
  const history = getSalesHistory(groupId);
  if (!history.length) return null;

  const peak = getPeakHours(history);
  let text = `⏰ *HORÁRIOS DE PICO*\n▢\n`;
  peak.forEach((h, i) => {
    text += `▢ ${i + 1}º — ${h.hour}h — ${h.count} venda(s)\n`;
  });
  text += `╰━━─「⏰」─━━`;
  return text;
}

/**
 * Membros sem compra por período
 * @param {string} groupId
 * @param {"day"|"week"|"always"} period
 */
export function formatNoSale(groupId, period = "day") {
  const allMembers = getAllMembers(groupId);
  if (!allMembers.length) return null;

  const history = getSalesHistory(groupId);
  const now = new Date();
  const todayKey = getTodayKey();
  const weekKey = getWeekKey(now);

  let noSale = [];

  if (period === "always") {
    // Nunca compraram — totalPurchases === 0
    noSale = allMembers.filter((m) => m.totalPurchases === 0);
  } else if (period === "week") {
    // Sem compra esta semana
    const activeLids = new Set(
      history.filter((s) => s.weekKey === weekKey).map((s) => s.memberLid)
    );
    noSale = allMembers.filter((m) => !activeLids.has(m.memberLid));
  } else {
    // Sem compra hoje
    noSale = allMembers.filter((m) => m.todayKey !== todayKey || m.todayPurchases === 0);
  }

  if (!noSale.length) return null;

  const periodLabel = {
    day: "HOJE",
    week: "ESTA SEMANA",
    always: "NUNCA COMPRARAM",
  };

  let text = `👥 *MEMBROS SEM COMPRA — ${periodLabel[period]}*\n▢\n`;
  for (const m of noSale) {
    text += `▢ @${m.memberLid.split("@")[0]}\n`;
  }
  text += `╰━━─「👥」─━━`;
  return { text, mentions: noSale.map((m) => m.memberLid) };
}
