/**
 * CEM — Capa Editorial Mínima
 * MagicBank Academy
 *
 * PRINCIPIO CANÓNICO:
 * - No modifica contenido
 * - No agrega palabras
 * - No elimina palabras
 * - No interpreta semántica
 * - No decide pedagogía
 *
 * Solo:
 * - Segmenta
 * - Jerarquiza
 * - Da respiración visual
 */

function renderCEM(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return [];
  }

  // Normaliza saltos de línea
  const lines = rawText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const blocks = [];
  let currentBlock = [];

  const flushBlock = () => {
    if (currentBlock.length > 0) {
      blocks.push({
        type: detectBlockType(currentBlock),
        content: currentBlock.join("\n")
      });
      currentBlock = [];
    }
  };

  for (const line of lines) {
    // Detecta inicio de nueva sección visual
    if (isSectionBoundary(line)) {
      flushBlock();
      blocks.push({
        type: detectSingleLineType(line),
        content: line
      });
      continue;
    }

    currentBlock.push(line);

    // Evita bloques demasiado largos (respiración)
    if (currentBlock.length >= 6) {
      flushBlock();
    }
  }

  flushBlock();
  return blocks;
}

/* =========================
   DETECTORES PUROS
========================= */

function isSectionBoundary(line) {
  return (
    isTitle(line) ||
    isNumbered(line) ||
    isBullet(line)
  );
}

function isTitle(line) {
  return (
    line === line.toUpperCase() &&
    line.length > 3 &&
    !isNumbered(line)
  );
}

function isNumbered(line) {
  return /^\d+[\.\)]\s+/.test(line);
}

function isBullet(line) {
  return /^[-•*]\s+/.test(line);
}

function detectSingleLineType(line) {
  if (isTitle(line)) return "title";
  if (isNumbered(line)) return "step";
  if (isBullet(line)) return "bullet";
  return "paragraph";
}

function detectBlockType(blockLines) {
  if (blockLines.length === 1) {
    return detectSingleLineType(blockLines[0]);
  }

  if (blockLines.every(isBullet)) return "bullet_list";
  if (blockLines.every(isNumbered)) return "step_list";

  return "paragraph";
}

module.exports = {
  renderCEM
};
