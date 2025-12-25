/**
 * Parser neutro de texto del tutor.
 * NO reescribe.
 * NO resume.
 * SOLO detecta estructura.
 */

function parseTextToBlocks(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const blocks = [];
  let currentList = null;

  lines.forEach(line => {
    // Títulos (Markdown o mayúsculas claras)
    if (
      line.startsWith("##") ||
      line.match(/^[A-ZÁÉÍÓÚÑ\s]{6,}$/)
    ) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      blocks.push({
        type: "title",
        content: line.replace(/^#+\s*/, "")
      });
      return;
    }

    // Listas
    if (line.startsWith("-") || line.startsWith("•")) {
      if (!currentList) {
        currentList = { type: "list", items: [] };
      }
      currentList.items.push(line.replace(/^[-•]\s*/, ""));
      return;
    }

    // Párrafos normales
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }

    blocks.push({
      type: "paragraph",
      content: line
    });
  });

  if (currentList) {
    blocks.push(currentList);
  }

  return blocks;
}

module.exports = parseTextToBlocks;
