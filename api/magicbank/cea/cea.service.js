/**
 * CEA – Capa de Expresión del Avatar
 * Instrumento neutro.
 * NO decide contenido.
 * NO altera el texto del tutor.
 * SOLO traduce texto → señales de aula.
 */

const parseTextToBlocks = require("./cea.parser");

/**
 * @param {Object} input
 * @param {string} input.text        Texto completo generado por el tutor
 * @param {string} input.tutor_id    Identificador del tutor (informativo)
 */
function runCEA({ text, tutor_id }) {
  if (!text || typeof text !== "string") {
    return {
      blocks: [],
      speak: false,
      pauses: [],
      emphasis: []
    };
  }

  // 1. Parseo estructural (sin cambiar palabras)
  const blocks = parseTextToBlocks(text);

  // 2. Detección simple de voz
  // Regla: si hay texto nuevo → se habla
  const speak = text.trim().length > 0;

  // 3. Pausas sugeridas (basadas en estructura)
  const pauses = [];
  blocks.forEach((b, i) => {
    if (b.type === "title") pauses.push({ after: i, ms: 600 });
    if (b.type === "list") pauses.push({ after: i, ms: 400 });
  });

  // 4. Énfasis visual (halo)
  const emphasis = [];
  blocks.forEach((b, i) => {
    if (
      b.content.match(/(IMPORTANTE|CLAVE|ATENCIÓN|SEGURIDAD|EXAMEN|APROBADO)/i)
    ) {
      emphasis.push({
        block: i,
        style: "halo-gold"
      });
    }
  });

  return {
    blocks,
    speak,
    pauses,
    emphasis,
    tutor_id
  };
}

module.exports = {
  runCEA
};
