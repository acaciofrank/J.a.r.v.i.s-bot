/**
 * Sistema de gestão de produtos por grupo
 * Gerencia a tabela de produtos para o detector de compras
 *
 * @author Jovem
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GROQ_API_KEY } from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databasePath = path.resolve(__dirname, "..", "..", "database");
const PRODUCTS_FILE = path.resolve(databasePath, "products.json");

function readProducts() {
  if (!fs.existsSync(PRODUCTS_FILE)) {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify({}), "utf8");
  }
  return JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf8"));
}

function writeProducts(data) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Usa o Groq para interpretar a tabela e extrair produtos
 * @param {string} tableText
 * @returns {Promise<Array>}
 */
export async function parseProductTable(tableText) {
  const prompt = `Analisa esta tabela de produtos e extrai todos os produtos em formato JSON.
Para cada produto, extrai:
- category: a categoria do produto (ex: "Diária", "Semanal", "Mensal", "Tudo Top", "Stock", "Saldo", ou qualquer outra categoria que encontres)
- description: a descrição do produto (ex: "400 MB", "1.7 GB", "Chamadas + SMS + 11GB", "100", etc)
- price: o preço numérico em MT (apenas o número, sem texto)

Responde APENAS com um array JSON válido, sem texto adicional, sem markdown, sem backticks.
Exemplo de resposta: [{"category":"Diária","description":"400 MB","price":10},{"category":"Semanal","description":"1.7 GB","price":47}]

Tabela:
${tableText}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();

  if (!text) throw new Error("Resposta vazia do Groq");

  // Limpar possíveis backticks residuais
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);

  // Adicionar índice a cada produto
  return parsed.map((p, i) => ({
    index: i + 1,
    category: p.category || "Geral",
    description: String(p.description || ""),
    price: parseFloat(p.price) || 0,
  }));
}

export function saveProducts(groupId, groupName, products, rawTable) {
  const data = readProducts();
  data[groupId] = { groupId, groupName, products, rawTable };
  writeProducts(data);
}

export function removeProducts(groupId) {
  const data = readProducts();
  if (!data[groupId]) return false;
  delete data[groupId];
  writeProducts(data);
  return true;
}

export function getProducts(groupId) {
  const data = readProducts();
  if (!data[groupId]) return null;
  return data[groupId].products;
}

export function getRawTable(groupId) {
  const data = readProducts();
  if (!data[groupId]) return null;
  return data[groupId].rawTable || null;
}

export function findProductByPrice(groupId, price) {
  const products = getProducts(groupId);
  if (!products) return null;
  return products.find((p) => p.price === price) || null;
}
