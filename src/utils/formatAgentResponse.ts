export type ResponseBlock =
  | { type: "paragraph" | "heading"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "chart"; data: { name: string; value: number }[] }
  | { type: "table"; headers: string[]; alignments: ("left" | "center" | "right")[]; rows: string[][] }
  | { type: "record"; title: string; fields: { label: string; value: string }[] };

const fieldPattern = /^([a-z][a-z0-9_]*):\s*(.*)$/;
const bulletPattern = /^(?:[-*•]\s+|\d+[.)]\s+)(.*)$/;
// Values, rather than the approximate text bars, determine the chart scale.
const textBarPattern = /^([^|\n]+?)\s*\|\s*[█▓▒░▌▐▏▎▍▊▋▉■▪━═─#=]*\s*\((\d+)\)\s*(?:`\s*)*$/;
const textFencePattern = /^(?:`\s*){3,}(?:text|plaintext)?\s*$/i;
function tableCells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "")
    .split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
}
const labels: Record<string, string> = {
  uf: "UF",
  codigo_ibge: "Código IBGE",
  id_original: "Identificador original",
  municipio: "Município",
  endereco: "Endereço",
  precisao_geo: "Precisão geográfica",
  potencia_ti_mw_unidade: "Potência de TI da unidade (MW)",
  potencia_campus_mw: "Potência do campus (MW)",
  area_m2_unidade: "Área da unidade (m²)",
  voltada_ia: "Voltada à IA",
  pue_declarado: "PUE declarado",
  wue_declarado: "WUE declarado",
  certificacoes: "Certificações",
  fonte_url: "Fonte",
  data_levantamento: "Data do levantamento",
  inicio_operacao: "Início da operação",
};

export function formatAgentResponse(response: string): ResponseBlock[] {
  const lines = response.replace(/\r\n?/g, "\n").trim().split("\n");
  const blocks: ResponseBlock[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line || line === ".") continue;
    if (textFencePattern.test(line) &&
      (textBarPattern.test(lines[index + 1]?.trim() ?? "") || textBarPattern.test(lines[index - 1]?.trim() ?? ""))) continue;
    if (textBarPattern.test(line)) {
      const data: { name: string; value: number }[] = [];
      let next = index;
      while (next < lines.length) {
        const match = lines[next].trim().match(textBarPattern);
        if (!match || !Number.isSafeInteger(Number(match[2]))) break;
        data.push({ name: match[1].trim(), value: Number(match[2]) });
        next++;
      }
      if (data.length >= 2) {
        blocks.push({ type: "chart", data });
        index = next - 1;
        continue;
      }
    }
    const headers = tableCells(line);
    const separators = tableCells(lines[index + 1] ?? "");
    if (headers.length > 1 && headers.length === separators.length && separators.every((cell) => /^:?-{3,}:?$/.test(cell))) {
      const alignments = separators.map((cell): "left" | "center" | "right" =>
        cell.endsWith(":") ? (cell.startsWith(":") ? "center" : "right") : "left");
      const rows: string[][] = [];
      index++;
      while (index + 1 < lines.length && lines[index + 1].trim().includes("|")) {
        const cells = tableCells(lines[index + 1]);
        if (cells.length !== headers.length) break;
        rows.push(cells);
        index++;
      }
      blocks.push({ type: "table", headers, alignments, rows });
      continue;
    }
    const bullet = line.match(bulletPattern);
    if (bullet && fieldPattern.test(lines[index + 1]?.trim() ?? "")) {
      const fields: { label: string; value: string }[] = [];
      while (index + 1 < lines.length) {
        const field = lines[index + 1].trim().match(fieldPattern);
        if (!field) break;
        index++;
        const name = field[1];
        const label = labels[name] ?? name.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
        fields.push({ label, value: field[2] || "Não informado" });
      }
      blocks.push({ type: "record", title: bullet[1], fields });
    } else if (bullet) {
      const ordered = /^\d/.test(line);
      const previous = blocks[blocks.length - 1];
      if (previous?.type === "list" && previous.ordered === ordered && lines[index - 1]?.trim())
        previous.items.push(bullet[1]);
      else blocks.push({ type: "list", ordered, items: [bullet[1]] });
    } else if (/^#{1,6}\s+/.test(line)) {
      blocks.push({ type: "heading", text: line.replace(/^#{1,6}\s+/, "") });
    } else {
      const previous = blocks[blocks.length - 1];
      const text = line.replace(/^\.\s+/, "");
      if (previous?.type === "paragraph" && lines[index - 1]?.trim() && !lines[index - 1].trim().match(fieldPattern))
        previous.text += `\n${text}`;
      else blocks.push({ type: "paragraph", text });
    }
  }
  return blocks;
}
